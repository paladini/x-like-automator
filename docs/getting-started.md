# Getting started

[← Back to README](../README.md)

This guide takes you from an empty browser to a running, pausing, auto-reloading
session, explaining every control along the way. The short version lives in the
README's [Install & first run](../README.md#install--first-run); this is the full
walkthrough.

## Requirements

- **A Chromium browser with Manifest V3 support:** Google Chrome, Brave, or Microsoft
  Edge. The extension relies on the CSS `:has()` selector for post detection, so you
  need **Chrome / Edge 105+** (or a current Brave release).
- **A logged-in X account** in a normal browser tab. The extension never logs you in
  and never touches credentials.
- **No Node.js required to run it.** Node 20+ is only needed to run the test suite.

## Install the extension

There is no build step: the repository folder *is* the unpacked extension. Download
the release zip (the folder must contain `manifest.json` at the top level) or clone
the repository.

### Google Chrome

1. Download or clone this repository:
   ```bash
   git clone https://github.com/paladini/x-like-automator.git
   ```
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the `x-like-automator` folder — the one that contains `manifest.json`.
6. (Recommended) Click the puzzle-piece icon in the toolbar and **pin** *X Likes
   Automator* so the popup is one click away.

### Brave

1. Open `brave://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the folder that contains `manifest.json`.

### Microsoft Edge

1. Open `edge://extensions`.
2. Turn on **Developer mode** (bottom-left).
3. Click **Load unpacked**.
4. Select the folder that contains `manifest.json`.

## Your first session — step by step

### Step 1 — Open X in a tab and sign in

Go to `https://x.com/home` in a regular browser tab and make sure you are logged in.
If you see a login wall instead of your timeline, the extension will detect it, show
**"Entre no X nesta aba para começar"** ("Sign in to X in this tab to start"), and
re-check every 2 seconds. As soon as you sign in, a running session resumes by itself.

### Step 2 — Open the popup

Click the pinned *X Like Automator* toolbar icon. The popup shows the current
**status** (initially `Parado` — "Stopped"), the **like count** for the current
session (`Curtidas nesta sessão: 0`), and the settings described in the
[configuration reference](configuration.md).

> Opening the popup does **not** pause a running session. The extension knows the
> popup is open and keeps working while you watch the counter.

### Step 3 — Configure the pace

Set **Intervalo entre curtidas** ("Interval between likes") to `5` seconds for a
conservative first run. The real delay between two likes is randomized to
**85–100 % of the interval** (so 4.25–5 s for a 5 s setting), which keeps the rhythm
less robotic. A 1 s setting is a constant 1 s.

### Step 4 — Choose a limit (or don't)

**Sem limite de curtidas** ("Unlimited likes") is **on by default**: the session runs
until *you* stop it. To use a cap, uncheck it and set **Limite de curtidas nesta
sessão** ("Like cap for this session", default 100, allowed 1–1,000,000). When the cap
is reached the session stops by itself and the popup shows **"Limite da sessão
atingido"**. Pressing Start begins a fresh session with the count reset to 0.

### Step 5 — Reply-thread behavior

**Curtir o post original em uma thread de resposta** ("Like the original post in a
reply thread") is **on by default**. On a single-post page (`x.com/<user>/status/<id>`)
that contains replies, the extension treats the first non-reply post as the *original*
of the thread and likes it along with the replies. Turn this off if you want replies
liked but the thread's original post left alone. On the home timeline, a profile, and
search this toggle changes nothing — every visible, not-yet-liked post is eligible.

### Step 6 — Press "Iniciar" (Start)

The popup status changes to **"Curtindo"** ("Liking"). The extension now walks the
visible posts in page order, clicking Like only on posts that are not liked yet, with
your configured pacing. A post it has already handled is never re-liked in the same
session, even if you scroll back up. When **Repostar também** is on (also the
default), the same interval then separates a second pair of clicks on that post: the
repost icon, then only the plain menu item. The post is scrolled into view before each
of those clicks. If the plain item is missing, the menu is closed and that post is
skipped.

If the active tab is not an X tab, pressing Start shows **"Abra uma aba do X para
iniciar."** — nothing else happens.

### Step 7 — Let it run: scrolling and waiting

When every eligible post on screen has been liked, the extension scrolls down about
80 % of a viewport (the page document or X's primary column, whichever actually
scrolls), then observes the newly loaded posts for 500 ms. If nothing new appears, it
waits with exponential backoff — 2 s, 4 s, 8 s … capped at 30 s — and the status shows
**"Aguardando novos posts"**. As soon as a scroll or a new load reveals something
eligible, it likes it immediately and the backoff resets.

### Step 8 — Pause and resume, automatically

Switch to another tab, minimize the window, or move focus to another app: liking
**pauses immediately** and the status becomes **"Pausado: a aba do X não está
ativa"**. Click back on the X tab: the *same* session resumes with the *same* count.
There is no resume button — presence is the switch.

### Step 9 — The 5-minute auto-reload

Every 5 minutes of session time the tab reloads itself. This is invisible
maintenance: the DOM is rebuilt fresh (X accumulates a lot of markup over a long
session), and the session comes back on its own — same count, same toggles, sweep
restarted so already-liked posts are recognized from the page state, not from memory.
You do not press Start again. A manual F5 on the started tab resumes the same way;
a *second* X tab never resumes (there is exactly one session tab). See
[architecture.md](architecture.md#reload--resume) for the mechanism.

### Step 10 — Stop the session

Click **Parar** ("Stop"). The status returns to **Parado** and the final count stays
visible in the popup. The session state lives in `chrome.storage.session`, so you can
reopen the popup later in the same browser run and still see the count. Restarting the
browser clears it — press Start for a fresh session.

### Step 11 — Verify, tweak, repeat

Open the popup mid-session and watch the counter increment live. Adjust the interval
or the cap and press Start again — settings are saved on every Start and applied to
the new session.

## First-run checklist (10 minutes)

The automated suite proves the logic against fixtures; these steps prove the
selectors against the live site:

1. Install and start with defaults. Expect status *Curtindo* within one tick.
2. Watch the first 3–4 likes: posts flip to liked ~5 s apart, one at a time, in page
   order.
3. Scroll away and back: a handled post is never re-liked.
4. With **Repostar também** on, each liked post gets the repost icon click and then
   the plain menu item; a post you reposted manually beforehand is skipped.
5. Switch to another tab: status becomes the paused message; return and the same
   count resumes.
6. Open the popup while it runs: liking keeps going, the counter repaints live.
7. Wait 5 minutes: the tab reloads itself and resumes without pressing Start.
8. Click **Parar**: no further clicks, final count remains visible.
9. If X shows *"Esta solicitação parece ser automatizada…"*, the status switches to
   the wait message and the session resumes on its own a minute later.

Related: [Configuration reference](configuration.md) · [Behavior and limits](behavior-and-limits.md) ·
[Troubleshooting](troubleshooting.md) · [FAQ](faq.md) ·
[Architecture](architecture.md) · [Localization](localization.md) ·
[← Back to README](../README.md)
