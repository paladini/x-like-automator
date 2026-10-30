# Security Policy

Short version: this extension is deliberately built so there is little to report — it
holds no secrets, opens no sockets, and runs no background code. If you find something
that breaks that model, we want to know.

## Reporting a vulnerability

**Do not open a public issue for security problems.** Report them privately:

1. Use GitHub's **Report a vulnerability** form on the repository's Security tab
   (github.com/paladini/x-like-automator/security) to open a private security
   advisory, or
2. Open a regular issue containing only the words "security contact request" and wait
   for the maintainer to move the conversation to a private channel.

The maintainer aims to acknowledge private security reports within **72 hours** and will
discuss scope, severity, and a disclosure timeline with you before any public advisory.

## Supported versions

| Version | Supported |
|---|---|
| 1.1.x | ✅ |
| < 1.1 | ❌ (update to current `main`) |

## What this extension guarantees (and how it is tested)

These properties are not just promises — CI asserts them (`test/manifest.test.js`):

- Only the `storage` permission; no `cookies`, no `identity`, no credential access,
  no X API token anywhere.
- Host access limited to the two X origins (`https://x.com/*`,
  `https://twitter.com/*`); the content script never injects on any other site.
- No `fetch` or `XMLHttpRequest` in any shipped script — the extension performs no
  network calls of its own and phones home nowhere.
- No background service worker; execution requires a visible, present tab.
- Run state is volatile (`chrome.storage.session`); nothing sensitive persists beyond
  settings in `chrome.storage.local` and live counters.
- A hard refusal list: quote and comment composers, replies, follows, DMs, login
  flows, and cookie collection are refused by the policy engine itself.

## Scope notes

- Account-level risk from **using** the tool (X Rules and Terms of Service, rate
  limits, suspensions) is documented in the README disclaimer and is not a
  vulnerability.
- Vulnerating X itself is out of scope for this repository; report it to X through
  its bug bounty program (hackerone.com/x).
