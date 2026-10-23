# likes-session Validation

**Date**: 2026-10-23
**Spec**: `.specs/features/likes-session/spec.md`
**Diff range**: `234c07e..HEAD` (`234c07e..082771a`)
**Verifier**: independent sub-agent (author ≠ verifier)

**Result**: PASS

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | Done | Pure session policy and `test/policy.test.js` |
| T2 | Done | Manifest V3 registration |
| T3 | Done | Original icon and PNG sizes |
| T4 | Done | Content-script loop |
| T5 | Done | Popup document |
| T6 | Done | Popup stylesheet |
| T7 | Done | Popup settings and live status |
| T8 | Done | Bilingual README and MIT license |

No task is blocked or partial. Every checkbox in `tasks.md` is marked done.

---

## Spec-Anchored Acceptance Criteria

78 criteria. Each row cites the assertion that locks the spec value. 0 spec-precision gaps.

### P1: Like from the open X tab (LIKE-01)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Act only while the host is x.com or twitter.com | A non-X host is `other` and yields no post id. `twitter.com` home stays `home` | `test/policy.test.js:462` `classifySurface("https://example.com/home")` === `"other"`; `test/policy.test.js:467` `plan.postId` === `undefined`; `test/policy.test.js:439` `classifySurface("https://twitter.com/home?lang=en")` === `"home"`; `test/manifest.test.js:12` matches are `https://x.com/*` and `https://twitter.com/*` | ✅ |
| Do not collect cookies, passwords, or X API tokens | Content script has no cookie, identity, or `api.x.com` use. Manifest permission list is storage only | `test/content-adapter.test.js:138` `source.includes("chrome.cookies")` === `false`; `test/content-adapter.test.js:139` `chrome.identity` === `false`; `test/content-adapter.test.js:140` `api.x.com` === `false`; `test/manifest.test.js:20` `permissions` deep-equal `["storage"]`; `test/policy.test.js:81` `allowedAction("collect_cookies")` === `false` | ✅ |
| Do not repost, reply, follow, or send a direct message | Those actions are refused | `test/policy.test.js:61` `allowedAction("repost")` === `false`; `test/policy.test.js:65` `allowedAction("reply")` === `false`; `test/policy.test.js:69` `allowedAction("follow")` === `false`; `test/policy.test.js:73` `allowedAction("dm")` === `false` | ✅ |
| Only `like` is allowed. repost, reply, follow, dm, login, and collect_cookies are refused | `like` is true. Each named action is false | `test/policy.test.js:57` `allowedAction("like")` === `true`; `test/policy.test.js:77` `allowedAction("login")` === `false`; plus the four refusals above and `test/policy.test.js:81` | ✅ |
| Start sets running, likeCount, and seenIds | `running` true, `likeCount` 0, `seenIds` `[]` | `test/policy.test.js:85` `startSession()` deep-equals that object | ✅ |
| Stop keeps the count and does not click again | `running` false, `likeCount` kept, plan has no post id | `test/policy.test.js:97` `stopped.running` === `false`; `test/policy.test.js:98` `stopped.likeCount` === `3`; `test/policy.test.js:105` `plan.postId` === `undefined`; `test/content-adapter.test.js:106` `clicks` stays `["10001"]` | ✅ |
| At most one like per cycle | One click, and a multi-post plan returns one id | `test/content-adapter.test.js:65` `clicks` deep-equal `["10001"]`; `test/policy.test.js:223` `plan.postId` === `"10002"` when two posts are visible | ✅ |
| Login wall: click nothing and report `not_logged_in` | Action `block_login`, status `not_logged_in`, no post id, no click | `test/policy.test.js:110` `plan.action` === `"block_login"`; `test/policy.test.js:111` `plan.status` === `"not_logged_in"`; `test/policy.test.js:113` `plan.postId` === `undefined`; `test/content-adapter.test.js:94` `clicks` deep-equal `[]` | ✅ |
| While the wall is visible, recheck after 2000 ms and do not end the session | `waitMs` 2000 and `running` stays true | `test/policy.test.js:112` `plan.waitMs` === `2000`; `test/policy.test.js:116` `next.running` === `true` | ✅ |
| When the wall is gone and the tab is active, resume the same session without changing likeCount | Next plan likes the new id. Count stays 4 | `test/policy.test.js:127` `plan.action` === `"like"`; `test/policy.test.js:128` `plan.postId` === `"10002"`; `test/policy.test.js:129` `session.likeCount` === `4` | ✅ |

### P1: Pause when the tab is inactive (LIKE-02)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Hidden document pauses and keeps likeCount | Action `pause`, status `paused_inactive`, count stays 4 | `test/policy.test.js:135` `plan.action` === `"pause"`; `test/policy.test.js:136` `plan.status` === `"paused_inactive"`; `test/policy.test.js:138` `next.likeCount` === `4` | ✅ |
| Hidden document makes blur grace 0 ms | Delay is 0 | `test/policy.test.js:144` `blurPauseDelayMs({ becameHidden: true, popupOpen: false })` === `0` | ✅ |
| Visible document, popup closed, window unfocused: pause and keep the count | Decision `pause`, count stays 2 | `test/policy.test.js:150` `activityDecision(...)` === `"pause"`; `test/policy.test.js:157` `applyPlan(...).likeCount` === `2` | ✅ |
| Visible document, popup closed, tab inactive: pause and keep the count | Decision `pause`, count stays 4, seen ids kept | `test/policy.test.js:163` `activityDecision({ tabActive: false, ... })` === `"pause"`; `test/policy.test.js:169` `plan.action` === `"pause"`; `test/policy.test.js:171` `next.likeCount` === `4`; `test/policy.test.js:172` `seenIds` deep-equal `["10001"]` | ✅ |
| Popup open and document visible: keep running | Decision `run`, action `like`, status `running` | `test/policy.test.js:178` `activityDecision({ popupOpen: true, windowFocused: false, ... })` === `"run"`; `test/policy.test.js:184` `plan.action` === `"like"`; `test/policy.test.js:185` `plan.status` === `"running"` | ✅ |
| Blur that is not a hide, popup closed: wait 200 ms | Delay is 200. Open popup does not schedule a pause | `test/policy.test.js:190` `blurPauseDelayMs({ becameHidden: false, popupOpen: false })` === `200`; `test/policy.test.js:191` popup-open delay === `null` | ✅ |
| Visible, focused, and active again: resume without resetting likeCount or seenIds | Count goes 4 to 5. Seen ids keep `10001` and append `10002` | `test/policy.test.js:206` `plan.action` === `"like"`; `test/policy.test.js:207` `next.likeCount` === `5`; `test/policy.test.js:208` `seenIds` deep-equal `["10001", "10002"]` | ✅ |
| Popup focus grace constant is 200 | Constant is 200 | `test/policy.test.js:189` `POPUP_FOCUS_GRACE_MS` === `200` | ✅ |

The inactive-tab count is locked at 4 in `test/policy.test.js:171`, not at the fresh-session 0 in `test/content-adapter.test.js:74`. The adapter test still locks the pause itself: `test/content-adapter.test.js:73` `clicks` deep-equal `[]` and `test/content-adapter.test.js:75` status === `"paused_inactive"`.

### P1: Pick posts, pace them, and honor the cap (LIKE-03)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Home, profile, and search select the first visible all-digit post that is not liked and not seen | First post `10001` is liked. Selected id is `10002` on `/home`, `/somereader`, and `/search` | `test/policy.test.js:216` URLs include `https://x.com/somereader` and `https://x.com/search?q=abc`; `test/policy.test.js:223` `plan.postId` === `"10002"` | ✅ |
| Missing or non-digit id is skipped | Both fixtures select `10002` | `test/policy.test.js:233` picked deep-equal `{ id: "10002" }`; `test/policy.test.js:242` same after id `"12ab"` | ✅ |
| Already-liked candidate is not returned | Result is null | `test/policy.test.js:247` `picked` === `null` | ✅ |
| An id already in seenIds is not returned | Result is null | `test/policy.test.js:252` `picked` === `null` | ✅ |
| Applying a like appends the id and increments likeCount by 1 | Count 1, seen ids `["10001"]` | `test/policy.test.js:277` `next.likeCount` === `1`; `test/policy.test.js:278` `seenIds` deep-equal `["10001"]` | ✅ |
| Defaults | interval 5, cap off, cap 100, original posts on | `test/policy.test.js:283` `defaultSettings()` deep-equals `{ intervalSeconds: 5, capEnabled: false, cap: 100, likeOriginalInReplyThread: true }` | ✅ |
| Accept an interval only when it is an integer from 1 to 60 | 0, 61, 1.5, and empty are rejected. Integer 5 is accepted | `test/policy.test.js:294` errors deep-equal `["interval"]`; `test/policy.test.js:300` same for 61; `test/policy.test.js:305` same for 1.5; `test/policy.test.js:311` same for empty; `test/policy.test.js:416` `result.ok` === `true` for interval 5 | ✅ |
| Invalid interval uses the exact sentence | Error code `interval` and that Portuguese sentence | `test/policy.test.js:316` `settingsErrorMessage("interval")` === `"O intervalo precisa ser um número inteiro de 1 a 60."` | ✅ |
| Interval 1, random unit 0 | 1000 ms | `test/policy.test.js:322` `nextDelayMs(1, 0)` === `1000` | ✅ |
| Interval 1, random unit 0.99 | 1000 ms | `test/policy.test.js:323` `nextDelayMs(1, 0.99)` === `1000` | ✅ |
| Interval 5, random unit 0 | 4250 ms | `test/policy.test.js:327` `nextDelayMs(5, 0)` === `4250` | ✅ |
| Interval 5, random unit 1 | 5000 ms | `test/policy.test.js:331` `nextDelayMs(5, 1)` === `5000` | ✅ |
| Interval 60, random unit 0 | 51000 ms | `test/policy.test.js:335` `nextDelayMs(60, 0)` === `51000` | ✅ |
| Interval 2, random unit 0 | 1700 ms | `test/policy.test.js:339` `nextDelayMs(2, 0)` === `1700` | ✅ |
| Cap off does not stop for likeCount, including 30 and 100000 | `reached` false and the plan still likes | `test/policy.test.js:353` `capDecision(30, defaultSettings()).reached` === `false`; `test/policy.test.js:354` `plan.action` === `"like"`; `test/policy.test.js:359` `capDecision(100000, ...).reached` === `false`; `test/policy.test.js:360` action === `"like"` | ✅ |
| Cap on and likeCount already at the cap: do not select another like. Status `cap_reached` | Action `stop_cap`, no post id | `test/policy.test.js:367` `plan.action` === `"stop_cap"`; `test/policy.test.js:368` `plan.status` === `"cap_reached"`; `test/policy.test.js:369` `plan.postId` === `undefined` | ✅ |
| The like that reaches the cap is kept, then the session stops | Count stays 2, `running` false, status `cap_reached` | `test/policy.test.js:378` `next.likeCount` === `2`; `test/policy.test.js:379` `next.running` === `false`; `test/policy.test.js:381` `next.status` === `"cap_reached"` | ✅ |
| Invalid enabled cap uses the exact sentence | 0, -1, 1.5, and 1000001 yield error code `cap` and that sentence | `test/policy.test.js:389` errors deep-equal `["cap"]`; `test/policy.test.js:394` same for -1; `test/policy.test.js:399` same for 1.5; `test/policy.test.js:404` same for 1000001; `test/policy.test.js:409` message === `"O limite precisa ser um número inteiro de 1 a 1000000."` | ✅ |
| Cap off and empty cap field: validation succeeds and stored cap is 100 | `ok` true, cap 100, capEnabled false | `test/policy.test.js:416` `result.ok` === `true`; `test/policy.test.js:417` `result.settings.cap` === `100`; `test/policy.test.js:418` `capEnabled` === `false` | ✅ |
| Status sentences are the seven exact Portuguese strings | stopped, running, paused_inactive, waiting_for_posts, not_logged_in, cap_reached, unsupported_page | `test/policy.test.js:427` `"Parado"`; `test/policy.test.js:428` `"Curtindo"`; `test/policy.test.js:429` `"Pausado: a aba do X não está ativa"`; `test/policy.test.js:430` `"Aguardando novos posts"`; `test/policy.test.js:431` `"Entre no X nesta aba para começar"`; `test/policy.test.js:432` `"Limite da sessão atingido"`; `test/policy.test.js:433` `"Esta página do X não entra na curtida automática"` | ✅ |

### P1: Handle a reply thread (LIKE-04)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| `/` or `/home` is home | Surface `home` | `test/policy.test.js:437` `classifySurface("https://x.com/")` === `"home"`; `test/policy.test.js:438` `/home` === `"home"` | ✅ |
| `/search` is search | Surface `search` | `test/policy.test.js:440` `classifySurface("https://x.com/search?q=abc")` === `"search"` | ✅ |
| Profile handle, with_replies, likes, and media are profile | Surface `profile` for all four | `test/policy.test.js:444` `/somereader` === `"profile"`; `test/policy.test.js:445` `/with_replies`; `test/policy.test.js:446` `/likes`; `test/policy.test.js:447` `/media` | ✅ |
| A path with `/status/` plus digits is status | Surface `status` | `test/policy.test.js:451` `/somereader/status/123456789` === `"status"` | ✅ |
| Explore, messages, settings, and notifications are other | Surface `other` | `test/policy.test.js:455` `/explore`; `test/policy.test.js:456` `/messages`; `test/policy.test.js:457` `/settings`; `test/policy.test.js:458` `/notifications` | ✅ |
| Surface other does not select a like and reports `unsupported_page` | Action `skip_surface`, no post id | `test/policy.test.js:464` `plan.action` === `"skip_surface"`; `test/policy.test.js:465` `plan.status` === `"unsupported_page"`; `test/policy.test.js:467` `plan.postId` === `undefined` | ✅ |
| Status page with no reply keeps a not-yet-liked post eligible, toggle off | Selected id is that post | `test/policy.test.js:477` `plan.postId` === `"44444"` | ✅ |
| Status reply thread, toggle off: skip the original | Selected id is the reply, not `11111` | `test/policy.test.js:491` `plan.postId` === `"22222"` | ✅ |
| Same thread: select the not-yet-liked reply | Selected id is `22222` | `test/policy.test.js:491` `plan.postId` === `"22222"` | ✅ |
| Toggle on: select the original when it is not liked and not seen | Selected id is `11111` | `test/policy.test.js:503` `plan.postId` === `"11111"` | ✅ |
| Home, profile, and search do not skip a reply card when the toggle is off | A lone reply card is selected on all three surfaces | `test/policy.test.js:508` URLs are home, `/somereader`, and `/search`; `test/policy.test.js:518` `plan.postId` === `"33333"` with `isReply: true` and `likeOriginalInReplyThread: false` | ✅ |
| On a status reply thread, the original is the first post that is not a reply, even when a reply is above it | Index 0 stays `reply`. Index 1 is `original`. Toggle off likes the reply above the original | `test/policy.test.js:529` `marked[0].role` === `"reply"`; `test/policy.test.js:530` `marked[1].role` === `"original"`; `test/policy.test.js:538` `plan.postId` === `"22222"` | ✅ |
| If every visible post is a reply, the original is the first post | Index 0 is `original`. Toggle off likes the second post | `test/policy.test.js:547` `marked[0].role` === `"original"`; `test/policy.test.js:555` `plan.postId` === `"66666"` | ✅ |

### P1: Keep going when the feed stalls (LIKE-05)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| No eligible post, this cycle has not scrolled, page did not advance | Action `scroll` | `test/policy.test.js:568` `decision.action` === `"scroll"`; `test/policy.test.js:579` `plan.action` === `"scroll"` | ✅ |
| Document can scroll | Target `document` | `test/policy.test.js:585` `chooseScrollTarget({ documentScrollable: true, columnScrollable: true })` === `"document"`; `test/policy.test.js:581` `plan.scrollTarget` === `"document"` | ✅ |
| Document cannot scroll and the column can | Target `column` | `test/policy.test.js:589` `chooseScrollTarget({ documentScrollable: false, columnScrollable: true })` === `"column"` | ✅ |
| Neither can scroll | Target `none`, then a stall wait | `test/policy.test.js:593` target === `"none"`; `test/policy.test.js:605` `plan.action` === `"wait"`; `test/policy.test.js:606` `plan.waitMs` === `2000` | ✅ |
| The page advanced its own scroll and this cycle did not scroll | Action `observe`, backoff step 0, wait 500 ms | `test/policy.test.js:620` `decision.action` === `"observe"`; `test/policy.test.js:621` `nextBackoffStep` === `0`; `test/policy.test.js:622` `waitMs` === `500` | ✅ |
| A scroll advances by more than 1 pixel | Action `observe`, backoff step 0, wait 500 ms | `test/policy.test.js:635` `decision.action` === `"observe"`; `test/policy.test.js:636` `nextBackoffStep` === `0`; `test/policy.test.js:637` `waitMs` === `500` for a move from 0 to 500 | ✅ |
| Scroll does not advance and a new post id appeared | Action `observe`, backoff step 0 | `test/policy.test.js:650` `decision.action` === `"observe"`; `test/policy.test.js:651` `nextBackoffStep` === `0` | ✅ |
| Stall waits are 2000, 4000, 8000, 16000, then 30000 | Those six waits, including a second 30000 | `test/policy.test.js:655` expected list; `test/policy.test.js:667` `decision.waitMs` === `waitMs` | ✅ |
| A stall keeps the session running and reports `waiting_for_posts` | Action `wait`, that status, `running` true | `test/policy.test.js:686` `plan.action` === `"wait"`; `test/policy.test.js:687` `plan.status` === `"waiting_for_posts"`; `test/policy.test.js:689` `next.running` === `true` | ✅ |
| A like cap of 30 is not a stall exit | Count 30 stays running on a stall | `test/policy.test.js:690` `next.likeCount` === `30`; `test/policy.test.js:689` `next.running` === `true` | ✅ |

### P1: Control it from a clear popup (LIKE-06)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Popup language is pt-BR | `lang="pt-BR"` | `test/popup-markup.test.js:8` HTML matches `<html lang="pt-BR"` | ✅ |
| Labels for the interval input, the cap input, and the original-post checkbox | `for` matches `interval`, `cap`, and `like-original` | `test/popup-markup.test.js:12` `for="interval"`; `test/popup-markup.test.js:13` `for="cap"`; `test/popup-markup.test.js:14` `for="like-original"`; `test/popup-markup.test.js:17` `id="like-original"` | ✅ |
| Start and stop are button elements | Both ids are `<button>` | `test/popup-markup.test.js:21` `<button id="start">`; `test/popup-markup.test.js:22` `<button id="stop">` | ✅ |
| Status region is aria-live polite | `aria-live="polite"` on `#status` | `test/popup-markup.test.js:27` HTML matches that attribute | ✅ |
| Background `#12141a` and text `#f4f1ea`, bound as those roles | `--bg` is the background color. `--text` is the text color. The two hex values are not swapped | `test/popup-css.test.js:8` `--bg` matches `#12141a`; `test/popup-css.test.js:9` `--text` matches `#f4f1ea`; `test/popup-css.test.js:10` `background: var(--bg)`; `test/popup-css.test.js:11` `color: var(--text)`; `test/popup-css.test.js:12` `--bg` is not `#f4f1ea`; `test/popup-css.test.js:13` `--text` is not `#12141a` | ✅ |
| Stylesheet defines a :focus-visible outline | A `:focus-visible` rule contains `outline` | `test/popup-css.test.js:17` CSS matches `:focus-visible { ... outline:` | ✅ |
| Popup shows the Portuguese sentence for the status code and the like count | Paused sentence with count 4, then running sentence with count 5 | `test/popup-controller.test.js:119` status text === `"Pausado: a aba do X não está ativa"`; `test/popup-controller.test.js:120` count text === `"Curtidas nesta sessão: 4"`; `test/popup-controller.test.js:125` status === `"Curtindo"`; `test/popup-controller.test.js:126` count === `"Curtidas nesta sessão: 5"` | ✅ |
| Settings are stored under the key `settings` | Storage key is `settings`. A valid save writes that key | `test/policy.test.js:701` `SETTINGS_STORAGE_KEY` === `"settings"`; `test/popup-controller.test.js:87` saved object is `{ settings: { ... } }` | ✅ |
| Invalid interval does not replace saved settings | `storage.set` is not called | `test/popup-controller.test.js:77` `sets.length` === `0`; `test/popup-controller.test.js:79` error text is the interval sentence | ✅ |
| Count line uses the prefix `Curtidas nesta sessão:` | That prefix is in the document | `test/popup-markup.test.js:31` `html.includes("Curtidas nesta sessão:")` === `true` | ✅ |

### P1: Load it unpacked and read the limits (LIKE-07)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Manifest V3 content scripts for both X origins | `manifest_version` 3. Matches are the two https patterns | `test/manifest.test.js:8` `manifest_version` === `3`; `test/manifest.test.js:12` matches deep-equal `["https://x.com/*", "https://twitter.com/*"]` | ✅ |
| Storage permission only. No cookies, identity, or X API scope | Permissions are `["storage"]`. No cookies, identity, or `api.x.com` | `test/manifest.test.js:20` permissions deep-equal `["storage"]`; `test/manifest.test.js:21` cookies absent; `test/manifest.test.js:22` identity absent; `test/manifest.test.js:23` `api.x.com` absent | ✅ |
| Repository includes an original icon.svg | SVG root exists and does not name another extension | `test/icon.test.js:19` SVG matches `<svg`; `test/icon.test.js:20` store id absent; `test/icon.test.js:21` `"x liker"` absent | ✅ |
| Manifest icons point at PNG files and not icon.svg | Every icon path ends in `.png`. Manifest text has no `icon.svg` | `test/manifest.test.js:37` path matches `\.png$`; `test/manifest.test.js:38` path does not end in `.svg`; `test/manifest.test.js:40` manifest JSON does not include `icon.svg` | ✅ |
| README has a Portuguese section and an English section | Both headings are present | `test/readme.test.js:9` includes `## Português`; `test/readme.test.js:10` includes `## English` | ✅ |
| README states the open logged-in tab, unpacked load in Chrome and Brave, author Fernando Paladini, MIT, and the X-rules responsibility | Those phrases are present in Portuguese and English | `test/readme.test.js:15` `"aba do X"`; `test/readme.test.js:16` `"tab you already have open"`; `test/readme.test.js:17` `chrome://extensions`; `test/readme.test.js:18` `brave://extensions`; `test/readme.test.js:19` `"Carregar sem compactação"`; `test/readme.test.js:20` `"Load unpacked"`; `test/readme.test.js:29` `"Fernando Paladini"`; `test/readme.test.js:30` `"MIT"`; `test/readme.test.js:31` `"podem entrar em conflito com as regras do X"`; `test/readme.test.js:33` `"can conflict with X's rules"`; `test/readme.test.js:34` `"You are responsible for how you use this extension."` | ✅ |
| README names interval, unlimited versus optional cap, and the reply-thread original toggle | Both languages name all three settings | `test/readme.test.js:21` `"Intervalo entre curtidas"`; `test/readme.test.js:22` `"Sem limite de curtidas"`; `test/readme.test.js:23` `"limite opcional"`; `test/readme.test.js:24` `"post original em uma thread de resposta"`; `test/readme.test.js:25` `"Interval between likes"`; `test/readme.test.js:26` `"Unlimited likes"`; `test/readme.test.js:27` `"optional cap"`; `test/readme.test.js:28` `"original post in a reply thread"` | ✅ |

**Status**: All 78 acceptance criteria covered.

---

## Discrimination Sensor

Isolated worktree: `D:\eleicoes\_sensor-likes-8568` at detached `082771a`. Mutations were applied only there. No `git stash`. Each mutant was restored before the next one. The worktree was removed with `git worktree remove --force`.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `lib/policy.js:182` | Forced `originalIndex = 0`, so a reply above the original post becomes the original | Killed. `node --test` exit 1. 100 passed, 1 failed: `test/policy.test.js:529` expected role `"reply"`, actual `"original"` |
| 2 | `lib/policy.js:332` | Pause returns `likeCount: 0` | Killed. `node --test` exit 1. 97 passed, 4 failed, including `test/policy.test.js:171` expected `4` for an inactive tab, actual `0` |
| 3 | `popup/popup.css:2` | Swapped the role values to `--bg: #f4f1ea` and `--text: #12141a` | Killed. `node --test` exit 1. 100 passed, 1 failed: `test/popup-css.test.js:8` required `--bg: #12141a` |

**Sensor depth**: lightweight, 3 behavior-level mutations on the previously weak paths.
**Sensor outcome**: 3/3 killed.

Porcelain of the real repo before the sensor was `?? .specs/features/likes-session/validation.md`. After `git worktree remove`, `git status --porcelain` was the same line. `git worktree list` shows only `D:/eleicoes/x-likes-automator`.

---

## Interactive UAT Results

| # | Test | Result | Details |
| - | ---- | ------ | ------- |
| 1 | Logged-in X session in Chrome or Brave | Skipped | No logged-in X account in this environment. The spec's independent tests are `node --test` fixtures. This skip is not a product failure |

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; adapter happy, pause, login wall, and scroll paths) | ✅ |
| Every test maps to a spec requirement, listed edge case, or task Done-when | ✅ |
| Documented guidelines followed: `.specs/features/likes-session/tasks.md` coverage table and Gate Check Commands. No separate project testing guide | ✅ |

Spot-check of LIKE-04: `test/policy.test.js:522` builds a status thread whose first card is a reply and asserts both the role of the later non-reply and the id selected when the toggle is off. That is the spec outcome, not a call-count check.

---

## Edge Cases

- [x] Interval 0, 61, 1.5, or empty is rejected and does not replace saved settings. `test/policy.test.js:294`, `test/policy.test.js:300`, `test/policy.test.js:305`, `test/policy.test.js:311`, and `test/popup-controller.test.js:77` (`sets.length` === `0`).
- [x] Enabled cap 0, negative, 1.5, or 1000001 is rejected. `test/policy.test.js:389`, `test/policy.test.js:394`, `test/policy.test.js:399`, `test/policy.test.js:404`.
- [x] likeCount 30 with cap off keeps running. `test/policy.test.js:354` `plan.action` === `"like"`.
- [x] The same post id is selected at most once. `test/policy.test.js:264` first pick is `{ id: "10001" }`; `test/policy.test.js:270` the second pick is `null`.
- [x] An already-liked control is not clicked. The cycle scrolls. `test/content-adapter.test.js:124` `clicks` deep-equal `[]`; `test/content-adapter.test.js:125` `scrolls` deep-equal `["document"]`.
- [x] A stuck scroll waits with backoff and keeps the session running. `test/policy.test.js:667` and `test/policy.test.js:689`.
- [x] A page that scrolls itself is observed, not scrolled again. `test/policy.test.js:620` action === `"observe"`.
- [x] A document hidden during the session pauses and keeps likeCount. `test/content-adapter.test.js:86` `likeCount` === `1` after `onHide`; `test/content-adapter.test.js:87` status === `"paused_inactive"`.
- [x] A non-X host does not select a like. `test/policy.test.js:467` `plan.postId` === `undefined`.
- [x] A status thread with no reply is still liked when the toggle is off. `test/policy.test.js:477` `plan.postId` === `"44444"`.
- [x] Start on a non-X tab is refused. `test/popup-controller.test.js:101` no start message; `test/policy.test.js:695` `canStart({ tabIsX: false, settingsOk: true })` === `false`.

---

## Gate Check

- **Gate command**: `node --test` (Build row in `tasks.md`)
- **Result of the suite**: 101 passed, 0 failed, 0 skipped
- **Test count before feature** (`234c07e`): 0. That commit has no `test/` files
- **Test count after feature**: 101
- **Delta**: +101
- **Skipped tests**: none
- **Failures**: none

`node --test` summary on the real tree: `tests 101`, `pass 101`, `fail 0`, `skipped 0`, `todo 0`.

---

## Fix Plans

None. The four previously open behaviors are now locked by assertions, and the three mutants died.

---

## Requirement Traceability Update

Assessed from this run. `spec.md` was not edited.

| Requirement | Previous status | Assessed status |
| ----------- | --------------- | --------------- |
| LIKE-01 | Implementing | Verified |
| LIKE-02 | Implementing | Verified |
| LIKE-03 | Implementing | Verified |
| LIKE-04 | Implementing | Verified |
| LIKE-05 | Implementing | Verified |
| LIKE-06 | Implementing | Verified |
| LIKE-07 | Implementing | Verified |

---

## Summary

**Overall**: Ready

**Spec-anchored check**: 78/78 acceptance criteria matched the spec outcome. 0 spec-precision gaps.
**Sensor**: 3/3 mutations killed.
**Gate**: 101 passed, 0 failed, 0 skipped.

**What works**: Selection, dedup, interval, cap, pause, reply-thread original, scroll stall, popup contract, manifest, icon, and README match the spec values cited above.

**Issues found**: none.

**Next steps**: none for this feature's automated gate. Interactive use on a logged-in X tab was skipped.
