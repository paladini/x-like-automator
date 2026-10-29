# FAQ

[← Back to README](../README.md)

Short answers to the questions users actually ask. Deeper semantics live in
[docs/behavior-and-limits.md](behavior-and-limits.md) and
[docs/architecture.md](architecture.md).

### X says the request looks automated. Did something happen to my account?

No. This message is normal:

> Esta solicitação parece ser automatizada. Para proteger nossos usuários contra spam e outras atividades maliciosas, não poderemos concluir esta ação agora. Tente novamente mais tarde.

X is asking for a pause. The extension stops clicking, waits one minute, and then
continues the same session. Waiting is the whole behavior — it does not try to hide
that it is automating, and the wait does not change the account. If the notice keeps
coming back, use a longer interval or a cap. See
[troubleshooting.md](troubleshooting.md).

### Do I need to keep the tab open?

Yes. The session lives in the single logged-in X tab: there is no background service
worker, so closing the tab ends the session's activity (a browser restart also clears
the volatile run state in `chrome.storage.session`; settings survive). "Open" does not
mean "watched", though: you can leave the tab in the background — the session simply
pauses and resumes with the identical count when you return, and keeping the popup
open also counts as presence.

### Will it undo my likes by accident?

No. A post is only ever liked when its control positively reports the *not liked yet*
state; already-liked posts are skipped, never clicked. An unrecognized control
classifies as `"other"` and is also skipped (fail-safe over coverage), and the
undo-repost family plus the quote blacklist (`NEVER_QUOTE`) close menus without
clicking. See [Behavior and limits](behavior-and-limits.md).

### Can it run while I browse other tabs?

No — presence is the switch. The session pauses while the X tab is hidden or
unfocused, which is also why there is no background worker. Come back to the tab and
the same session continues with the same count.

### Does it work when my X is in English (or Japanese, or Arabic)?

Yes — set **Idioma da interface** to match the language X shows you. The parser knows
Like, Unlike, Repost, Undo-repost, and Quote labels for the 49 locales sourced from
X's own bundles. If your language is missing or a label changed, the extension skips
posts instead of mis-clicking; open an issue with the exact button text you see. See
[localization.md](localization.md).

### What happens when I press F5?

The session resumes by itself. The tab that started the session carries a
`sessionStorage` marker, and after the reload the content script finds the running
session in `chrome.storage.session` and continues with the same count — that is also
exactly what the internal 5-minute housekeeping reload does. A *different* X tab has
no marker and never resumes someone else's session. A **browser restart** clears the
volatile state: press Start again.

### Why is the default session unlimited?

Because the pause is real: liking stops the moment you leave the tab, so an
unattended runaway is structurally impossible. Still, if you are unsure, turn off
*Sem limite de curtidas* and keep the default cap of 100 — the session then stops
itself with *"Limite da sessão atingido"*.

### Why does the pace have randomness instead of an exact interval?

The opposite of the researcher-cousin project ([Threads Likes Automator](https://github.com/paladini/threads-like-automator)),
which is built for experiments and never randomizes: this tool is built for humans,
and an exactly-5.000 s metronome is the most machine-like signal you can emit. So each
delay is drawn from 85–100 % of your interval — always *at most* the interval you
configured, never less than 1 s.

### Can I run it on two X tabs at once?

No — one session, one tab, deliberately. The start message goes to the active tab, the
resume marker is per tab, and presence-gating makes a hidden tab pause. Opening a
second tab does not steal or double the session; the new tab just sits idle.

### Does it read my cookies, DMs, or password?

No. `storage` is the only permission, plus host access to `x.com` and
`twitter.com` so the page can be read and clicked. There are no network calls, no
analytics, no tokens, and nothing is sent anywhere — the entire privacy contract is
asserted by `test/manifest.test.js`.

Related: [Troubleshooting](troubleshooting.md) · [Configuration reference](configuration.md) ·
[← Back to README](../README.md)
