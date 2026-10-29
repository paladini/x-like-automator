---
name: Feature request
about: Propose a change — read the ground rules first
title: "[feat] "
labels: enhancement
assignees: ""
---

## Ground rules check

Confirm your idea fits the project's deliberate scope (see CONTRIBUTING.md):

- [ ] Does **not** add multi-tab orchestration or a background service worker
      (presence is the switch)
- [ ] Does **not** remove or bypass the human-like pacing (85–100 % of the
      configured interval, floor 1 s)
- [ ] Does **not** weaken the safety invariants: never unlike, never undo a
      repost, never quote, never reply, never follow, never DM, never touch
      credentials or cookies, unknown state never clicked
- [ ] Does **not** add network calls or dependencies to the shipped extension

## Problem statement

What problem does this solve, and for whom?

## Proposed solution

What should happen, at the level of observable behavior (popup controls, status
messages, counters). Implementation sketches welcome but not required.

## Alternatives considered

Other ways to get the same outcome, and why they are worse.

## Docs impact

Which documented behavior this touches (settings table, status messages,
supported pages, the refusal list) — if you know them; a maintainer can map it
otherwise.
