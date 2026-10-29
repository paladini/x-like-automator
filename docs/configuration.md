# Configuration reference

[← Back to README](../README.md)

Full semantics for every setting, the exact validation messages the popup shows, what
each status line means, and which X pages the session runs on. The tables and strings
here are contract-tested against `lib/policy.js` (`test/docs.test.js`): the shipped
code is the source of truth, and the documentation drift test is the gate.

The popup UI itself is Brazilian Portuguese (`pt-BR`); every literal below is the exact
string the shipped code renders. English glosses are provided for readers of the
English README.

## Settings reference

Settings persist to `chrome.storage.local` (key `settings`) and are validated by the
policy engine (`validateSettings` in `lib/policy.js`) before saving; invalid values are
refused inline. Changes take effect at the next start.

| Key | Popup control | Type | Range / values | Default |
|---|---|---|---|---|
| `intervalSeconds` | *Intervalo entre curtidas (segundos)* — `#interval` | integer seconds | 1 – 60 | **5** |
| `capEnabled` | inverse of *Sem limite de curtidas* — `#unlimited` | boolean | on / off | **off** (unlimited by default) |
| `cap` | *Limite de curtidas nesta sessão* — `#cap` | integer | 1 – 1,000,000 | **100** |
| `likeOriginalInReplyThread` | *Curtir o post original em uma thread de resposta* — `#like-original` | boolean | on / off | **on** |
| `alsoRepost` | *Repostar também* — `#also-repost` | boolean | on / off | **on** (also on when the stored setting is missing) |
| `interfaceLanguage` | *Idioma da interface* — `#interface-language` | choice | any of the 49 packs in `lib/ui-languages.js` | **pt-BR** |

What each setting actually controls:

- **`intervalSeconds`** — the pacing knob. The delay between actions is randomized to
  **85–100 % of this value** (`nextDelayMs`): a 5 s setting draws from 4.25–5 s, a
  1 s setting is a constant 1 s. The jitter never exceeds the configured interval —
  the tool is explicitly designed to like *slower* than you asked, never faster.
- **`capEnabled` / `cap`** — optional dose limit: the session stops itself after `cap`
  likes (status `cap_reached`, stop reason `cap`). By default the session is
  **unlimited** until you press *Parar*; tick *Sem limite de curtidas* keeps that.
  `cap` is validated only when the cap is enabled; when disabled it still coerces to
  an integer (default 100) so re-enabling has a sane value.
- **`likeOriginalInReplyThread`** — on a `status` surface (a post with replies), the
  first non-reply post is annotated `original` and this toggle decides whether it is
  eligible. On `home`, `search`, and `profile` the toggle changes nothing.
- **`alsoRepost`** — the plain-repost second signal. After liking a post, the next
  tick clicks the Repost icon and the tick after that clicks only the plain menu item
  (share with no phrase). Already-reposted posts are detected by pressed state or
  undo labels and skipped; each post is reposted at most once per session
  (`repostDoneIds`). Turn it off to like only.
- **`interfaceLanguage`** — which X-page label pack the parser uses for Like / Unlike
  / Repost / Undo-repost / Quote labels. Unknown ids fall back to `pt-BR`
  (`knownLanguage`). This setting does **not** change the extension UI (the popup is
  pt-BR-only) — it matches the *page's* interface language. See
  [localization.md](localization.md).

## Validation messages

Invalid values are refused inline before anything is stored. The popup shows these
exact strings, defined as `SETTINGS_ERRORS` in `lib/policy.js`:

| Setting | Message |
|---|---|
| `intervalSeconds` | *"O intervalo precisa ser um número inteiro de 1 a 60."* |
| `cap` | *"O limite precisa ser um número inteiro de 1 a 1000000."* |

`capEnabled`, `likeOriginalInReplyThread`, and `alsoRepost` are checkboxes and cannot
be invalid; `interfaceLanguage` degrades safely to the default. An invalid setting
never starts a session — the popup keeps showing the inline error.

## Status messages

The popup status line renders one of these `STATUS_MESSAGES` strings (exact literals
are contract-tested against `lib/policy.js`), styled by a tone class chosen in
`popupView` — `live`, `waiting`, `paused`, or the default `idle`:

| Status key | Popup text | Tone | Meaning |
|---|---|---|---|
| `stopped` | `Parado` | `idle` | No session is running. |
| `running` | `Curtindo` | `live` | A session is active and liking eligible posts. |
| `paused_inactive` | `Pausado: a aba do X não está ativa` | `paused` | Auto-paused (tab hidden or window unfocused). The popup shortens this line to `Pausado`; it resumes when you return. |
| `waiting_for_posts` | `Aguardando novos posts` | `waiting` | Nothing eligible is visible; the extension is scrolling/waiting (backoff up to 30 s). |
| `not_logged_in` | `Entre no X nesta aba para começar` | `waiting` | Login wall detected; re-checked every 2 s (`LOGIN_RECHECK_MS`). |
| `cap_reached` | `Limite da sessão atingido` | `idle` | The optional cap was hit; the session stopped itself. |
| `unsupported_page` | `Esta página do X não entra na curtida automática` | `waiting` | You navigated outside the supported surfaces; re-checked every 2 s (`UNSUPPORTED_RECHECK_MS`). |
| `automation_wait` | `O X pediu para esperar. A sessão continua daqui a pouco.` | `waiting` | X showed the unusual-activity notice; the session waits exactly 60 s (`AUTOMATION_WAIT_MS`) and resumes itself. |

## Supported pages

The policy classifies the current URL into a *surface* (`classifySurface`). Only these
X hosts are eligible: `x.com`, `twitter.com`.

| Surface | Path shape | Examples | Notes |
|---|---|---|---|
| Home timeline | `/` or `/home` | `https://x.com/home` | The classic use case. |
| Search results | `/search?q=…` | `https://x.com/search?q=eleicoes` | Visible results are liked top-to-bottom as you scroll. |
| Profile | `/<handle>` (+ `with_replies`, `media`, `likes` tabs) | `https://x.com/jack/media` | Handles are 1–15 of `[A-Za-z0-9_]`, and reserved segments (`explore`, `messages`, …) never classify as profiles. |
| Single post / thread | `/<handle>/status/<id>` | `https://x.com/jack/status/20` | Replies are liked in page order; the original post follows the reply-thread toggle. |

Everything else — `explore`, `notifications`, `messages`, `settings`, `compose`,
`login`, any non-X site — is reported as `unsupported_page`
(**"Esta página do X não entra na curtida automática"**) and revisited every 2
seconds. Navigate back to a supported page and the session resumes exactly where it
left off.

Related: [Behavior and limits](behavior-and-limits.md) ·
[Architecture](architecture.md) · [Localization](localization.md) ·
[← Back to README](../README.md)
