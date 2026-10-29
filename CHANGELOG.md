# Changelog

All notable changes to **X Likes Automator** are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-29

### Added

- **Plain repost as an optional second signal** (`alsoRepost`, default **on**): after
  liking, the extension clicks the Repost icon and then only the plain menu item
  (share with no phrase). It never opens a composer, never types, never quotes, and
  never undoes a repost; already-reposted posts are skipped and each post is reposted
  at most once per session. The item is found through X's stable
  `[data-testid='retweetConfirm']` anchor with localized-label fallbacks.
- **Interface-language packs for 49 X locales** (`lib/ui-languages.js`): Like, Unlike,
  Repost, Undo-repost, and Quote labels copied from X's responsive-web locale bundles,
  selectable in the popup (default Português (Brasil)). Quote labels are a hard
  blacklist (`NEVER_QUOTE`) across every pack.
- **Automation-notice awareness**: when X shows *"Esta solicitação parece ser
  automatizada…"*, the session pauses on the `automation_wait` status, waits exactly
  60 s, and resumes the same session — it never tries to bypass the notice.
- **Five-minute auto-reload with automatic resume**: a started tab reloads itself every
  5 minutes (`PAGE_RELOAD_MS`) so the SPA never accumulates DOM, and the session comes
  back on its own — counters preserved, sweep restarted — through a per-tab
  `sessionStorage` marker plus the `chrome.storage.session` snapshot. A second X tab
  has no marker and never hijacks the session.
- **Repost retry ladder**: a repost whose button or menu is not ready retries up to
  3 times, one second apart, and is then marked handled instead of looping.
- **Documentation set** (docs-as-contract): the README is now a lean end-user entry and
  deep content moved to `docs/` — `getting-started.md`, `configuration.md`,
  `architecture.md`, `behavior-and-limits.md`, `localization.md`, `faq.md`,
  `troubleshooting.md` — plus `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`,
  this changelog, GitHub issue/PR templates, and a `node --test` contract suite
  (`test/docs.test.js`).
- **CI**: GitHub Actions workflow running `npm test` (`node --test`, zero dependencies)
  on a Node 20.x / 22.x matrix across Ubuntu and Windows.

### Changed

- **Script isolation**: `lib/policy.js`, `lib/ui-languages.js`, and `popup/popup.js`
  are wrapped in IIFEs. Classic scripts share one global lexical scope; top-level
  constants previously collided between the popup and the content pages.

### Fixed

- The popup paints the session returned by `start` immediately instead of waiting for
  the first storage mirror, so the counter and status are correct from the first tick.

## [1.0.0] - 2026-10-24

### Added

- Initial release: Manifest V3 extension with **no background service worker** — the
  session lives in the one logged-in X (or Twitter) tab you keep open.
- Auto-like of visible, provably not-yet-liked posts at a human-like pace: the delay
  between likes is randomized to **85–100 % of the configured interval** (1–60 s,
  default 5 s), and a post handled this session is never re-liked.
- Unlimited by default, with an optional per-session cap (1–1,000,000, default 100).
- Instant auto-pause when the tab is hidden or the window loses focus ("presence is the
  switch"); the same session resumes with the same count when you return. An open
  popup counts as presence, with a 200 ms grace period.
- Auto-scroll and waiting: ~80 % viewport scrolls, a 500 ms observe window, then
  exponential backoff (2 s → 30 s cap) when nothing eligible is visible.
- Thread-aware liking on `x.com/<user>/status/<id>` with an optional
  *like the original post* toggle; supported surfaces are home, search, profile
  (including `with_replies`, `media`, `likes` tabs), and single-post threads.
- Login-wall detection (re-checked every 2 s) and unsupported-page detection.
- Popup UI in Brazilian Portuguese with live counter, validated settings, and inline
  validation errors.
- Privacy by construction: `storage` is the only permission; no cookies, no
  credentials, no API tokens, no `fetch`/XHR, no analytics — all enforced by
  `test/manifest.test.js`.
- Zero build, zero dependencies: the repository folder *is* the unpacked extension;
  the full suite runs on Node's built-in test runner (`node --test`).
- Bilingual READMEs (`README.md` English, `README.pt-BR.md` Brazilian Portuguese) with
  the Terms-of-Service disclaimer.
