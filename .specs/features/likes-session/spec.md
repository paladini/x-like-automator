# X Likes Automator Specification

## Problem Statement

A person who is already logged in to X in Chrome or Brave wants to like visible posts from that same tab, at a pace they choose, and stop when they say so. v1 does that and nothing else. It does not log in, does not touch other accounts, and does not keep liking after the tab is hidden or the window loses focus.

## Goals

- [ ] The unpacked extension likes visible, not-yet-liked posts on home, profile, search, and status threads while that X tab is active.
- [ ] The session has no default numeric cap. It runs until the user stops it, or until an optional cap they turned on is reached.
- [ ] Pausing for a hidden or unfocused tab keeps the session like count. The popup shows the live state in Brazilian Portuguese.
- [ ] Like choice, dedup, interval, cap, visibility, and scroll-stall behavior are pure functions covered by `node --test`, with no live X account.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Repost, reply, follow, and direct messages | v1 is likes only |
| Login automation, cookie collection, password capture, and X API tokens | The extension uses the tab the user already opened |
| Multi-account switching | One logged-in browser session only |
| Liking while the user is on another site or in a hidden tab | The session pauses as soon as the X tab is inactive |
| A hardcoded cap of 30 likes | The default session is unlimited |
| A build step, bundler, or framework | Load unpacked must work from the source files |
| Copying code, assets, or text from the Chrome Web Store extension "X Liker" or from any other extension | The implementation is original |
| Explore, messages, settings, notifications, and other non-feed X pages | Those pages are not like targets |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here. Nothing is left silently unclear. The product decisions in the request are recorded as confirmed. Gray areas the request left open are recorded as assumptions and are not questions for the user.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Session scope | One content-script session per X tab. Start controls the X tab that is current when the popup opens. | The product runs inside the open tab, not as a background job across the browser. | yes |
| Stop versus pause | Stop sets running to false and keeps the visible count. Start creates a new session with likeCount 0 and an empty seen-id list. Pause and resume keep both the count and the seen-id list. | Pause must not reset the counter. A new start is a new session, so dedup does not leak across sessions. | assumed |
| Full page reload | A full load clears the in-memory session and leaves it stopped. In-app X navigations keep the session. | A reload must not continue liking with no one watching. The content script stays alive across X's own client-side navigations. | assumed |
| Focus lost to the popup | The extension popup does not count as the tab becoming inactive. The session pauses immediately when the document is hidden. After a blur, it waits 200 ms. If the popup reports open in that window and the document is still visible, it keeps running. | Otherwise the popup could never show a live "Curtindo" state, because opening it blurs the page. | assumed |
| Supported surfaces | home is `/` and `/home`. profile is `/{handle}`, `/{handle}/with_replies`, `/{handle}/likes`, and `/{handle}/media`, excluding reserved names. search is `/search`. status is any path containing `/status/` plus digits. Everything else on x.com or twitter.com is other and is not clicked. | The request names home, profile, search, and reply threads. Explore and settings are out of scope. | assumed |
| Reserved first path segments | home, explore, search, settings, messages, notifications, i, compose, login, signup, intent, share, tos, privacy | These are X product routes, not profile handles. | assumed |
| Reply-thread original | On a status page, a reply thread exists when at least one visible post is a reply. The original is the first visible post that is not a reply, or the first post if every post is a reply. The toggle skips only that original, and only on a status reply thread. Timeline reply cards stay eligible. | The toggle is about the thread view, not about reply cards on home, profile, or search. | assumed |
| Interval jitter | At 1 second the delay is exactly 1000 ms. From 2 to 60 seconds the delay is `round(N * 1000 * (0.85 + 0.15 * randomUnit))` milliseconds, clamped to 1000..N*1000. randomUnit is in the range 0 inclusive to 1 exclusive, and a value of 1 is treated as the top of the range. | "Small random variation inside the chosen interval" stays at or below the chosen interval and never goes under 1 second. | assumed |
| Optional cap field | capEnabled defaults to false. The stored cap number defaults to 100 and is ignored until the toggle is on. A valid cap is an integer from 1 to 1000000. | Unlimited is the default. The number 100 is only a starting value for the field, not a session limit. The upper bound blocks accidental huge values without restoring a cap of 30. | assumed |
| Cap stop rule | The like that makes likeCount equal the cap is performed and counted. The session then stops with status cap_reached. No further like is clicked. | The user asked for a cap on likes completed, not a cap that skips the last one. | assumed |
| Unidentifiable posts | A candidate with a missing id, or an id that is not all digits, is skipped and not remembered. | Dedup needs a stable id. Guessing a click target would risk a second click. | assumed |
| Already-liked posts | A post whose control is the already-liked state is skipped. The session never clicks that control. | Clicking it again would undo the like. | assumed |
| Scroll stall | If no eligible like is on screen, scroll. If the position does not advance by more than 1 pixel and no new post id appears, wait 2000 ms, then 4000, 8000, 16000, then 30000 ms, and keep waiting at 30000 ms. Any progress resets the step to 0. The session stays running. | The request says to back off and not end the session when the feed stalls. | assumed |
| Page scrolling itself | If the scroll position advanced and this cycle did not scroll, do not scroll again this cycle. Recheck after 500 ms. | Fighting X's own scroll loads duplicates and jumps the viewport. | assumed |
| Scroll target | Prefer the document when it can scroll. Otherwise use the primary column when that element can scroll. If neither can, treat the cycle as a stall. | Desktop X usually scrolls the document. Some layouts scroll the column. | assumed |
| Login wall | The content script reports loginWall when a login or signup entry point is visible and the page shows no post articles. The session clicks nothing and shows not_logged_in. It stays armed, and liking resumes without a counter reset if the wall disappears and the tab is active. | A wall means the user is not in a usable logged-in feed. Ending the session would force a manual restart after they log in themselves. | assumed |
| Status copy | Exact Portuguese strings live in one map: stopped "Parado", running "Curtindo", paused_inactive "Pausado: a aba do X não está ativa", waiting_for_posts "Aguardando novos posts", not_logged_in "Entre no X nesta aba para começar", cap_reached "Limite da sessão atingido", unsupported_page "Esta página do X não entra na curtida automática". | The popup and the tests must share one precise sentence per state. | assumed |
| Settings validation copy | Interval failure shows "O intervalo precisa ser um número inteiro de 1 a 60." Cap failure shows "O limite precisa ser um número inteiro de 1 a 1000000." Invalid input does not overwrite chrome.storage.local. | The user must see why Start did not save. | assumed |
| Inactive settings | While the cap toggle is off, an empty or invalid cap does not fail validation. The stored cap stays 100 if the field is empty. | The inactive field must not block an unlimited session. | assumed |
| Popup when the current tab is not X | Start is refused. If an X tab has a session, the popup shows that session's status. Otherwise it shows stopped. | The extension must not start liking from a random site. | assumed |
| Icons | icon.svg is the original artwork. The manifest points at PNG files at 16, 32, 48, and 128, rasterized from that artwork. | Chrome's unpacked loader rejects SVG in manifest icon fields. The SVG still ships as the source. | assumed |
| README language order | Portuguese section first, English section second, in one README.md. | The author and the interface are Brazilian Portuguese. Both languages are required. | assumed |
| Repository | Public GitHub repo x-likes-automator under the authenticated gh user, default branch pushed. | The name is free on that account. | yes |
| No background service worker | The content script owns the loop. The popup talks to that tab. | A worker with alarms would like while the user is elsewhere, which is out of scope. | assumed |

**Open questions:** none

---

## User Stories

### P1: Like from the open X tab ⭐ MVP

**User Story**: As a logged-in X reader, I want to start and stop likes in the tab I already have open so that I do not hand over my password or leave a hidden tab liking posts.

**Why P1**: Without a guarded start/stop session there is no product.

**Acceptance Criteria**:

1. The system SHALL act only while the document host is x.com or twitter.com.
2. The system SHALL NOT collect cookies, passwords, or X API tokens.
3. The system SHALL NOT repost, reply, follow, or send a direct message.
4. The system SHALL treat only the action like as allowed. repost, reply, follow, dm, login, and collect_cookies SHALL be refused.
5. WHEN the user starts a session THEN the system SHALL set running to true, likeCount to 0, and seenIds to an empty list.
6. WHEN the user stops a session THEN the system SHALL set running to false, keep likeCount, and SHALL NOT click another control.
7. The system SHALL click at most one like per cycle.
8. IF a login wall is visible THEN the system SHALL NOT click any control and SHALL report status not_logged_in.
9. WHILE a login wall is visible and the session is running, the system SHALL check again after 2000 ms without ending the session.
10. WHEN the login wall is gone and the tab is active THEN the system SHALL resume the same session without changing likeCount.

**Independent Test**: Call the pure session and plan functions with fixtures for start, stop, a refused action, and a login wall. No browser login is required.

---

### P1: Pause when the tab is inactive ⭐ MVP

**User Story**: As someone who switches tabs, I want likes to pause the moment this X tab is hidden or the window loses focus so that the extension does not work in the background.

**Why P1**: Background liking is explicitly forbidden.

**Acceptance Criteria**:

1. WHEN documentVisible is false THEN the system SHALL pause on that cycle and SHALL keep likeCount unchanged.
2. WHEN documentVisible is false THEN the blur grace SHALL be 0 ms.
3. WHEN the document stays visible, the popup is not open, and the window is not focused THEN the system SHALL pause and SHALL keep likeCount unchanged.
4. WHEN the document stays visible, the popup is not open, and the tab is not the active tab THEN the system SHALL pause and SHALL keep likeCount unchanged.
5. WHILE the popup is open and the document is visible, the system SHALL keep the session running.
6. WHEN a blur is not a hidden document and the popup is not open THEN the system SHALL wait 200 ms before pausing.
7. WHEN the tab is visible, focused, and active again THEN the system SHALL resume without resetting likeCount or seenIds.
8. The popup focus grace constant SHALL be 200.

**Independent Test**: Feed boolean activity fixtures and session snapshots to the pure functions and assert the status and the unchanged count.

---

### P1: Pick posts, pace them, and honor the cap ⭐ MVP

**User Story**: As the person running the session, I want visible posts liked once, on a 1 to 60 second pace, with unlimited as the default, so that I control the rate and the length.

**Why P1**: Selection, dedup, interval, and cap are the session.

**Acceptance Criteria**:

1. WHEN the surface is home, profile, or search THEN the system SHALL select the first visible post that has an all-digit id, is not already liked, and is not in seenIds.
2. IF a candidate id is missing or is not all digits THEN the system SHALL skip that candidate.
3. IF a candidate is already liked THEN the system SHALL skip that candidate and SHALL NOT return it.
4. The system SHALL NOT return a post id that is already present in seenIds.
5. WHEN a like is applied THEN the system SHALL append that id to seenIds and SHALL increment likeCount by 1.
6. The default intervalSeconds SHALL be 5, the default capEnabled SHALL be false, the default cap SHALL be 100, and the default likeOriginalInReplyThread SHALL be true.
7. The system SHALL accept an interval only when it is an integer from 1 to 60 inclusive.
8. IF the interval is not an integer from 1 to 60 THEN the system SHALL reject it with error code interval and message "O intervalo precisa ser um número inteiro de 1 a 60."
9. WHEN the interval is 1 and the random unit is 0 THEN the delay SHALL be 1000 ms.
10. WHEN the interval is 1 and the random unit is 0.99 THEN the delay SHALL be 1000 ms.
11. WHEN the interval is 5 and the random unit is 0 THEN the delay SHALL be 4250 ms.
12. WHEN the interval is 5 and the random unit is 1 THEN the delay SHALL be 5000 ms.
13. WHEN the interval is 60 and the random unit is 0 THEN the delay SHALL be 51000 ms.
14. WHEN the interval is 2 and the random unit is 0 THEN the delay SHALL be 1700 ms.
15. WHERE capEnabled is false the system SHALL NOT stop the session because of likeCount, including when likeCount is 30 or 100000.
16. WHERE capEnabled is true and likeCount is already greater than or equal to cap THEN the system SHALL NOT select another like and SHALL report status cap_reached.
17. WHEN a like raises likeCount to the enabled cap THEN the system SHALL keep that likeCount, set running to false, and set status to cap_reached.
18. IF capEnabled is true and cap is not an integer from 1 to 1000000 THEN the system SHALL reject it with error code cap and message "O limite precisa ser um número inteiro de 1 a 1000000."
19. WHERE capEnabled is false and the cap field is empty THEN validation SHALL succeed and the stored cap SHALL be 100.
20. The system SHALL map stopped to "Parado", running to "Curtindo", paused_inactive to "Pausado: a aba do X não está ativa", waiting_for_posts to "Aguardando novos posts", not_logged_in to "Entre no X nesta aba para começar", cap_reached to "Limite da sessão atingido", and unsupported_page to "Esta página do X não entra na curtida automática".

**Independent Test**: Table-test selection, delay, cap, validation messages, and status strings with node:test.

---

### P1: Handle a reply thread ⭐ MVP

**User Story**: As a reader on a post, I want to choose whether the original post in a reply thread is liked so that I can like the replies without liking the root.

**Why P1**: The toggle is a v1 setting and it defaults to on.

**Acceptance Criteria**:

1. WHEN the path is `/` or `/home` THEN the surface SHALL be home.
2. WHEN the path is `/search` THEN the surface SHALL be search.
3. WHEN the path is `/somereader` or `/somereader/with_replies` or `/somereader/likes` or `/somereader/media` THEN the surface SHALL be profile.
4. WHEN the path contains `/status/` followed by digits THEN the surface SHALL be status.
5. WHEN the path is `/explore`, `/messages`, `/settings`, or `/notifications` THEN the surface SHALL be other.
6. WHEN the surface is other THEN the system SHALL NOT select a like and SHALL report status unsupported_page.
7. WHEN the surface is status and no visible post is a reply THEN the system SHALL keep a not-yet-liked post eligible.
8. WHEN the surface is status, a reply is visible, and likeOriginalInReplyThread is false THEN the system SHALL skip the original post.
9. WHEN the surface is status, a reply is visible, likeOriginalInReplyThread is false, and a reply is not yet liked THEN the system SHALL select that reply.
10. WHEN the surface is status, a reply is visible, and likeOriginalInReplyThread is true THEN the system SHALL select the original post when it is not yet liked and not in seenIds.
11. WHEN the surface is home, profile, or search THEN the system SHALL NOT skip a reply card because likeOriginalInReplyThread is false.
12. On a status reply thread, the original SHALL be the first post that is not a reply.
13. IF every visible post on a status reply thread is a reply THEN the original SHALL be the first post.

**Independent Test**: Classify fixture URLs and select from fixture post lists with the toggle on and off.

---

### P1: Keep going when the feed stalls ⭐ MVP

**User Story**: As the person running the session, I want the tab to scroll for more posts and wait out a stall so that a quiet moment does not kill the session.

**Why P1**: Stopping at the first empty screen would end most real timelines.

**Acceptance Criteria**:

1. WHEN no eligible post is visible, this cycle has not scrolled, and the page did not advance THEN the system SHALL choose action scroll.
2. WHEN the document can scroll THEN the system SHALL choose scroll target document.
3. WHEN the document cannot scroll and the primary column can THEN the system SHALL choose scroll target column.
4. WHEN neither the document nor the primary column can scroll THEN the system SHALL choose scroll target none.
5. WHEN the page advanced its own scroll and this cycle did not scroll THEN the system SHALL choose action observe, SHALL set the backoff step to 0, and SHALL wait 500 ms.
6. WHEN a scroll attempt advances the position by more than 1 pixel THEN the system SHALL choose action observe and SHALL set the backoff step to 0.
7. WHEN a scroll attempt does not advance the position and a new post id appeared THEN the system SHALL choose action observe and SHALL set the backoff step to 0.
8. IF a scroll attempt does not advance the position and no new post id appears THEN the first stall SHALL wait 2000 ms, the second 4000 ms, the third 8000 ms, the fourth 16000 ms, and the fifth and later SHALL wait 30000 ms.
9. IF the feed stalls THEN the system SHALL keep running and SHALL report status waiting_for_posts on the wait action.
10. The system SHALL NOT use a like cap of 30 as a stall exit.

**Independent Test**: Feed scroll snapshots, including a stuck position and an outside scroll, to the pure scroll decision.

---

### P1: Control it from a clear popup ⭐ MVP

**User Story**: As the person using the extension, I want a dark Portuguese popup I can operate with the keyboard so that I can see the session and change the pace.

**Why P1**: The popup is the only control surface.

**Acceptance Criteria**:

1. The popup document SHALL set the language to pt-BR.
2. The popup SHALL include a label associated with the interval input, a label associated with the cap input, and a label associated with the original-post checkbox.
3. The popup SHALL render start and stop as button elements.
4. The popup status region SHALL use aria-live polite.
5. The popup SHALL use the dark background color #12141a and the text color #f4f1ea.
6. The popup stylesheet SHALL define a :focus-visible outline.
7. The popup SHALL show the Portuguese sentence for the current status code and the session like count.
8. The settings object SHALL be stored under the storage key settings.
9. IF the interval is invalid THEN the system SHALL refuse to replace the saved settings.
10. The count line SHALL use the prefix "Curtidas nesta sessão:".

**Independent Test**: Parse popup.html and popup.css as text, and assert the storage key plus the validation refusal in the pure settings helper.

---

### P1: Load it unpacked and read the limits ⭐ MVP

**User Story**: As the person installing the extension, I want to load the folder in Chrome or Brave and read a bilingual README so that I know what it does and what it refuses to do.

**Why P1**: The delivery is an unpacked extension plus a public repo, not a store listing.

**Acceptance Criteria**:

1. The manifest SHALL use manifest_version 3 and SHALL register content scripts for https://x.com/* and https://twitter.com/*.
2. The manifest SHALL request storage permission and SHALL NOT request cookies, identity, or an X API scope.
3. The repository SHALL include an original icon.svg.
4. The manifest icon fields SHALL point at PNG files and SHALL NOT point at icon.svg.
5. The README SHALL contain a Portuguese section and an English section.
6. The README SHALL state that the extension uses only the open logged-in tab, how to load unpacked in Chrome, how to load unpacked in Brave, the author Fernando Paladini, the MIT license, and that automated likes can conflict with X rules and the user is responsible for how they use it.
7. The README SHALL name the settings for interval, unlimited versus optional cap, and the reply-thread original toggle.

**Independent Test**: Parse manifest.json and README.md as text after those files exist. Icon authorship is the committed SVG, reviewed against the design.

---

## Edge Cases

- IF the interval is 0, 61, 1.5, or empty THEN the system SHALL reject it and SHALL keep the previous saved settings.
- IF the enabled cap is 0, negative, 1.5, or 1000001 THEN the system SHALL reject it.
- WHEN likeCount is 30 and capEnabled is false THEN the system SHALL keep running.
- IF the same post id is offered twice in one session THEN the system SHALL select it at most once.
- IF the only visible control is already liked THEN the system SHALL scroll or wait and SHALL NOT click it.
- WHEN the scroll position does not move and no new post appears THEN the system SHALL wait with backoff and SHALL keep the session running.
- WHEN the page scrolls itself THEN the system SHALL NOT scroll again on that cycle.
- WHEN the document becomes hidden mid-wait THEN the system SHALL pause and SHALL keep likeCount.
- IF the host is not x.com or twitter.com THEN the system SHALL NOT select a like.
- IF a status thread has no reply THEN the system SHALL still like the visible not-yet-liked post when the toggle is off.
- WHEN start is requested and the current tab is not an X tab THEN the system SHALL refuse to start.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LIKE-01 | P1: Like from the open X tab | Tasks | Verified |
| LIKE-02 | P1: Pause when the tab is inactive | Tasks | Verified |
| LIKE-03 | P1: Pick posts, pace them, and honor the cap | Tasks | Verified |
| LIKE-04 | P1: Handle a reply thread | Tasks | Verified |
| LIKE-05 | P1: Keep going when the feed stalls | Tasks | Verified |
| LIKE-06 | P1: Control it from a clear popup | Tasks | Verified |
| LIKE-07 | P1: Load it unpacked and read the limits | Tasks | Verified |

**Coverage:** 7 total, 7 mapped to tasks (T1–T8), 0 unmapped

---

## Success Criteria

- [ ] `node --test` passes without a network call to X.
- [ ] The folder loads as an unpacked Manifest V3 extension in Chrome and Brave, with no build step.
- [ ] A running session pauses when the X tab is hidden, resumes with the same count, and does not like on a login wall.
- [ ] The default session has no numeric cap. An optional cap stops the session on the like that reaches it.
- [ ] The public GitHub repository contains the source, the MIT license, and the bilingual README.
