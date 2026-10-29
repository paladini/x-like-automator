# Behavior and limits

[← Back to README](../README.md)

The complete list of things the extension does — and deliberately does not do — plus
the guarantees behind every counter. The README carries the short version; this is the
full one. Nothing was lost in the move.

## Safety invariants (never broken, by construction)

- **Never unlikes.** A post is only ever liked when its control positively reports the
  *not liked yet* state (`likeControlState` = `like`). An already-liked post is
  skipped, and the Unlike family is never clicked.
- **Never undoes a repost, never quotes.** `repostMenuChoice` clicks only the plain
  Repost item when it is positively present. Undo-repost labels close the menu;
  quote and comment labels are a hard blacklist (`NEVER_QUOTE`) across all 49 packs.
- **Unknown state is never clicked.** A control whose state cannot be proven classifies
  as `"other"` and is skipped. Fail-safe over coverage — a locale X never heard of
  costs you skipped posts, never mis-clicks.
- **The refusal list is absolute.** Quote and comment composers, replies, follows,
  DMs, login flows, and cookie collection are refused by the engine
  (`REFUSED_ACTIONS` / `allowedAction`). The one extra click allowed is the plain
  repost.

## Eligibility rules

A post is liked only if **all** of these hold:

1. it is rendered as an outermost `article[data-testid='tweet']` on a supported
   surface — quoted/nested articles inside a bigger post are ignored;
2. it has a numeric status id (extracted from a `…/status/<id>` link);
3. its Like control positively reports *not liked yet* in your chosen interface
   language;
4. it was not already handled this session (`seenIds`).

Before clicking, the post is smoothly scrolled into view (`likedPostScroll`: `center`
when it fits, `nearest` when it doesn't) — nothing is ever clicked off-screen. A post
handled once is never re-handled in the same session, even when you scroll back up.

## The like counter is honest — reposts are attempts

`Curtidas nesta sessão` counts a like only when the engine positively planned and the
adapter positively clicked a control that *was* provably unliked. Failed clicks
(post re-rendered mid-tick) are **not** counted: the runner degrades the action to a
2 s wait and retries naturally on the next tick. Reposts are attempt-confirmed:
counted in `repostDoneIds` once the plain item was clicked, or when the post is
already reposted or the menu can't be read — a post is only ever *touched* once per
session either way.

## Per-session memory only

`seenIds` and `repostDoneIds` live in the session object and are **not** persisted as
history. After a reload or a new Start, already-liked posts are re-detected from the
live page state and skipped; nothing depends on remembering which posts you liked
last week.

## Presence is the switch

Liking runs only while the X tab is visible and the window focused. A hidden tab or a
blur pauses within one event; a blur right after opening the popup is ignored
(200 ms grace) and an open popup overrides focus-loss detection entirely. There is
deliberately **no background service worker**: Chrome throttles background timers, and
this tool would rather stop than tick in the dark. Nothing runs while you are away.

## The 5-minute housekeeping reload

Every 300 s of session time the tab reloads itself and the session resumes on its own
(counters preserved, sweep restarted from the live page). This exists because X's SPA
accumulates DOM over long sessions and scrolls get heavy. A manual F5 on the started
tab resumes the same way; **a browser restart does not** (volatile storage — press
Start again). Full mechanism: [architecture.md](architecture.md#reload--resume).

## X's automation notice is respected, not dodged

When X shows *"Esta solicitação parece ser automatizada…"*, the extension stops
clicking, waits exactly 60 s, and resumes the same session. It never solves captchas,
never rotates accounts, never retries harder. If the notice keeps appearing, the right
answer is a longer interval or a cap — or stop.

## Run state is volatile by design

The live session lives in `chrome.storage.session`, cleared at browser shutdown.
Settings survive in `chrome.storage.local`. Nothing sensitive persists: no tokens, no
history, no liked-post lists.

## No data export, no multi-tab orchestration

The popup shows one number. There is no CSV, no dashboard, no analytics, no second
tab taking over when the first closes. These are scope decisions, not oversights.

## Sponsored and promoted posts

Promoted cards that render as ordinary `article[data-testid='tweet']` with a Like
control **are eligible** — the tool does not classify ads. Filtered are only the
structural cases (nested/quoted articles, posts without numeric ids). If a promoted
post gets liked, that is the same click you could make by hand.

## Privacy in detail

The extension declares the minimum Chrome API surface it needs: `permissions:
["storage"]` — the only permission — and `host_permissions` for exactly the two X
origins (`https://x.com/*`, `https://twitter.com/*`) so the content script can read
and click there. What it **never** does — each bullet is asserted by the test contract
in `test/manifest.test.js`:

- ❌ No `cookies` or `identity` permission; no passwords, tokens, session cookies, or
  X API keys read or written.
- ❌ No network calls of its own: no `fetch`, no `XMLHttpRequest` in any shipped
  script — nothing leaves the page. All state stays in `chrome.storage`.
- ❌ No other sites: injection is limited to the two X origins above.
- ❌ No background service worker: execution requires a visible, present tab.

Related: [Configuration reference](configuration.md) · [Architecture](architecture.md) ·
[Troubleshooting](troubleshooting.md) · [FAQ](faq.md) · [← Back to README](../README.md)
