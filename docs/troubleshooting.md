# Troubleshooting

[← Back to README](../README.md)

Expanded symptom → cause → fix catalog. The README carries a quick table; this file
holds the full one and the mechanisms behind each entry. Report anything not covered
here as a [bug report](../.github/ISSUE_TEMPLATE/bug_report.md) — please include the
version (shown by `manifest.json`), the browser, the X account language, the **Idioma
da interface** setting, and the exact popup status line.

## Installation & startup

| Symptom | Cause | Fix |
|---|---|---|
| *"Abra uma aba do X para iniciar."* | The active tab is not an X page. | Click Start while an `x.com` / `twitter.com` tab is active. |
| *"Recarregue a aba do X e toque em Iniciar de novo."* | The content script isn't in the page — the tab was opened before the extension was installed or updated. | Reload the X tab (F5), then press Start. |
| Status stays `Parado` after a browser restart | Session state lives in `chrome.storage.session`, which is cleared on browser shutdown (by design — nothing sensitive persists). | Press Start. Settings survive; only the run state is volatile. |
| Nothing happens after **Iniciar** on a tab that was already open | Same as above — the tab predates the install/update. | Reload the X tab, press Start again. |
| You edited the extension code and it feels stale | Unpacked extensions cache the old script in already-open tabs. | Reload the extension at `chrome://extensions`, **then** reload the X tab. |
| No toolbar icon after Load unpacked | The selected folder is not the repository root. | **Load unpacked** again and pick the folder that directly contains `manifest.json`. |

## Session behavior

| Symptom | Cause | Fix |
|---|---|---|
| `Pausado: a aba do X não está ativa` forever | The X tab is not the visible/focused one. | Click the X tab. The session resumes with the same count. |
| `Entre no X nesta aba para começar` | Login wall detected (no posts rendered plus a login/signup control or login URL). | Sign in normally; a running session re-checks every 2 s and resumes by itself. |
| `Esta página do X não entra na curtida automática` | You navigated to explore/notifications/messages/settings or another site. | Navigate back to home, search, a profile, or a thread; the session resumes exactly where it left off. |
| `Aguardando novos posts` for a long time | Every visible post is already liked/reposted and the scroll ladder is waiting with exponential backoff (2 s → 30 s cap). | Normal on a stale feed. The tab also reloads every 5 minutes on its own, which brings fresh content. |
| Status shows `Limite da sessão atingido` | The optional cap was reached and the session stopped itself. | Expected. Press Start for a fresh session, or keep *Sem limite de curtidas* on. |
| The counter is lower than the likes you counted by eye | A like click that fails (X re-rendered the post mid-tick) is **not** counted; the tick degrades to a 2 s wait and retries. | Expected metric semantics. Investigate only if *no* like ever counts. |
| A post you liked manually got skipped | Correct behavior: the Like control reads *already liked* and is never clicked. | Nothing to do — that is the never-unlike invariant. |
| It stopped liking by itself after several minutes | X showed the automation notice; the session is in its 60 s wait. | Wait it out, then use a longer interval or a cap. See "X refused the click" below. |
| Two X tabs open and one resumed the other's session | Should be impossible: the resume marker (`sessionStorage`) exists only in the tab that pressed Start. | Treat as a bug; capture both tabs' popups and file an issue. |

## Repost

| Symptom | Cause | Fix |
|---|---|---|
| Posts get liked but never reposted | `alsoRepost` is off, the post was already reposted (pressed state / undo label detected → skipped by design), or the retry ladder gave up (3 attempts) and marked the post handled. | Verify **Repostar também** is on. One skipped post is fine; *every* post skipped → report, with a screenshot of the open repost menu in your X language. |
| The repost menu opens and closes itself | The plain item was not found in your language's pack (unknown → escape, never click). | Report the exact item labels you see — this is how locale packs get fixed. |
| A quoted repost happened | Should be impossible: Quote labels are blacklisted in every pack plus `NEVER_QUOTE`. | **Critical safety bug.** File an issue titled `[safety]` with the markup. |
| A repost was undone | Should be impossible: undo-repost labels and `aria-pressed` state mark posts as already-reposted and never click. | **Critical safety bug.** File an issue titled `[safety]` with the markup. |

## Language & detection

| Symptom | Cause | Fix |
|---|---|---|
| Posts are detected but likes never click | The Like button's `aria-label` isn't in your selected pack (X changed wording, or you picked the wrong language). | Match **Idioma da interface** to the page; open an issue with the exact label text you see. |
| No posts detected at all on a supported page | X rendered a variant without the stable `data-testid` anchors and none of the label `:has()` selectors matched. | Switch the interface language in the popup; if it persists, file a bug with the page HTML around a post. |
| X shows a language the popup does not list | The parser only knows labels copied from X's locale bundles. | Open an issue with the label text — see [localization.md](localization.md) for how packs are sourced and added. |

## Cadence & scrolling

| Symptom | Cause | Fix |
|---|---|---|
| The gap between likes varies a little | By design: each delay is drawn from 85–100 % of the configured interval (a 1 s interval is exact). | Nothing to fix — see [configuration.md](configuration.md). |
| It never likes faster than a second apart with interval 1 | Hard floor: `nextDelayMs` clamps to at least 1000 ms. | Intended — sub-second pacing is refused by design. |
| The page scrolls without liking | The scroll ladder is looking for eligible posts (scroll ≈ 80 % viewport, 500 ms observe, then backoff). | Normal; if the feed is exhausted, the 5-minute reload brings fresh content. |

## X refused the click

> Esta solicitação parece ser automatizada. Para proteger nossos usuários contra
> spam e outras atividades maliciosas, não poderemos concluir esta ação agora. Tente
> novamente mais tarde.

Nothing else is required. The extension pauses, waits one minute (`AUTOMATION_WAIT_MS`
= 60000 ms), and resumes the same session. The account is not changed by that wait. If
the notice returns repeatedly, the honest fixes are: a longer interval, an enabled
cap, or stopping — the tool is not designed to defeat X's protections and never will
be.

## Still stuck?

- Check the [FAQ](faq.md), the [configuration reference](configuration.md), and the
  [architecture notes](architecture.md).
- Reproduce with defaults first (5 s / unlimited / all toggles on / pt-BR) — most
  mismatches are locale-pack issues visible immediately in the status line.
- Security concerns or credential-adjacent behavior: see [SECURITY.md](../SECURITY.md);
  never file those as public issues.

[← Back to README](../README.md)
