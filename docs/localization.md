# Localization: how the parser reads 49 X interface languages

[← Back to README](../README.md)

The Like button on X is a button with a localized `aria-label`. To click the right
thing in the right language, the extension ships label packs copied from X's own
locale bundles. This document explains where they come from, how they are used, and
what happens when a label is wrong or missing.

## Where the labels come from

`lib/ui-languages.js` is generated from X's responsive-web i18n bundles
(`https://abs.twimg.com/responsive-web/client-web/i18n/`). Each action label traces to
a bundle message id:

| Message id | Label role |
|---|---|
| `d636ebc6` | Like |
| `eb3a8b0c` | Unlike |
| `f2919fb8` | plain Repost |
| `fd1e5446` | Undo repost |
| `bb5c5864` | Quote |

The pt-BR pack is the `pt` bundle ("Descurtir" is message `ca0f5894` in that bundle).
**49 languages** are sourced this way — `pt-BR`, `en`, and 47 more locales X ships
(`ar`, `ar-x-fm`, `bg`, … `zh`, `zh-Hant`), each with its own `like`, `unlike`,
`repost`, `undoRepost`, and `quote` label set in `UI_LANGUAGES`.

## How the labels are used

The popup's **Idioma da interface** setting picks one pack, and three mechanisms
consume it:

1. **Post detection.** `tweetSelector(languageId)` builds the article-matching CSS:
   stable `data-testid` selectors first (`article[data-testid='tweet']`,
   `article:has(button[data-testid='like'])`, …), then one
   `article:has(button[aria-label='<label>'])` per Like/Unlike label in the pack —
   covering X renders that drop the test ids.
2. **Like-state.** `likeControlState` checks `data-testid` (`unlike`/`like`) and the
   pack's labels against the button's `aria-label` (whitespace-normalized by
   `exactLabel`). `liked` is matched before `like` — order-sensitive so a liked post
   can never be classified as unliked.
3. **Repost safety.** `repostMenuChoice` matches the open popover's item texts against
   the pack: click only a positive `repost` label that is also **not** in the quote
   blacklist; `undoRepost` labels mean "already done, escape"; anything unrecognized
   closes the menu. The blacklist is `NEVER_QUOTE` — every pack's Quote label **plus**
   36 fixed cross-language entries (`Citar`, `Cita`, `引用`, `ציטוט`, …), so a
   quote composer is never opened even if X renders the item in a language you did
   not select.

## Fail-safes

- **Unknown language** → `knownLanguage` falls back to `pt-BR`; an invalid stored id
  never breaks a session.
- **Unknown button state** → classified `"other"`, never clicked. A wrong label costs
  a skipped post, not a mis-click.
- **Missing menu item** → the menu is closed (Escape) and the post is skipped.
- **Label drift** (X renames a string): liking silently stops finding buttons in that
  language — visible as status `Curtindo` with nothing happening, or posts not
  detected at all. File the exact `aria-label` you see (see
  [troubleshooting.md](troubleshooting.md)); packs are re-copied from the bundles.

## Verification status per locale

- **pt-BR** — the primary locale: verified end-to-end against the live X web UI,
  including the repost popover.
- **en** — bundle-verified, exercised in tests.
- **The remaining 47 packs** — copied verbatim from X's bundles (message ids above),
  live-UAT best-effort. They are safe by construction: a wrong label can only cause
  skips, never unwanted clicks. Repost item discovery additionally has a
  structural fallback: X's stable `[data-testid='retweetConfirm']` anchor works even
  when the label text moved, and the exact-label scan excludes anything inside an
  `article` so a menu item is the only thing ever clicked.

## Adding or fixing a language

1. Open X's bundle for that locale and copy the five messages (`d636ebc6`,
   `eb3a8b0c`, `f2919fb8`, `fd1e5446`, `bb5c5864`).
2. Add the pack to `UI_LANGUAGES` in `lib/ui-languages.js` (`id`, `label`, `like`,
   `unlike`, `repost`, `undoRepost`, `quote`) and any new Quote string to
   `NEVER_QUOTE`.
3. Add the `<option>` in `popup/popup.html`.
4. Add a `likeControlState` / `repostMenuChoice` case to `test/policy.test.js`.

Related: [Architecture](architecture.md) · [Configuration reference](configuration.md) ·
[Troubleshooting](troubleshooting.md) · [← Back to README](../README.md)
