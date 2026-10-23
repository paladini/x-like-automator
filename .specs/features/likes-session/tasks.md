# X Likes Automator Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/likes-session/design.md`
**Status**: Approved

Autonomous mode from the request: do not stop for gray areas. Eight tasks fit one batch, so Execute runs inline. MCP for every task: NONE. Skills: `tlc-spec-driven` for the cycle, and `frontend-design` while building the popup.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied. The product request additionally requires `node:test` for like selection, dedup, interval, cap, visibility, and scroll-stall. No existing tests, linter, or CI config were in the repo.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain policy | unit | All branches; 1:1 to spec acceptance criteria for selection, dedup, interval, cap, visibility, scroll, surfaces, and status strings; every listed edge case for those decisions has a test | `test/policy.test.js` | `node --test` |
| Manifest contract | unit | Manifest version, hosts, permissions, and icon paths match the spec | `test/manifest.test.js` | `node --test` |
| Icon | unit | SVG root exists and manifest icons are PNG files, not the SVG | `test/icon.test.js` | `node --test` |
| Content adapter | unit | Start, stop, hidden tab, login wall, and one like click. Happy path plus those failure paths. No cookie or token API | `test/content-adapter.test.js` | `node --test` |
| Popup document | unit | lang, labels, buttons, live region, and the count prefix | `test/popup-markup.test.js` | `node --test` |
| Popup stylesheet | unit | Background `#12141a`, text `#f4f1ea`, and a `:focus-visible` outline | `test/popup-css.test.js` | `node --test` |
| Popup controller | unit | Invalid settings do not save. Start on a non-X tab is refused. Start on an X tab sends the message. Status text is the spec sentence | `test/popup-controller.test.js` | `node --test` |
| README | unit | Portuguese and English sections, unpacked steps, author, MIT, and the rules note | `test/readme.test.js` | `node --test` |

## Gate Check Commands

> Generated from codebase - confirm before Execute. There is no bundler and no linter. Loading the extension is "open this folder". The gate is the test suite.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `node --test` |
| Full | After tasks with e2e or integration tests | `node --test` |
| Build | After phase completion or config tasks | `node --test` |

---

## Execution Plan

Phases are ordered and run sequentially. Tasks inside a phase run in order. The full task body lives in its phase so the phase membership stays with that phase.

### Phase 1: Policy

```
T1
```

#### T1: Add the session policy module

**What**: Pure session decisions and `test/policy.test.js`. Also adds `package.json` with `"type": "module"` and `"test": "node --test"`.
**Where**: `lib/policy.js`
**Depends on**: None
**Reuses**: none
**Requirement**: LIKE-01, LIKE-02, LIKE-03, LIKE-04, LIKE-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `node --test` passes
- [x] Selection, dedup, interval, cap, activity, scroll, surface, and status strings assert the spec values
- [x] Test count is at least 40 and none are skipped

**Tests**: unit
**Gate**: build

**Commit**: `feat(policy): add pure like-session decisions`

**Status**: Complete. Gate `node --test`: 71 passed, 0 failed, 0 skipped.

---

### Phase 2: Shell

```
T2 -> T3
```

#### T2: Register the Manifest V3 extension

**What**: `manifest.json` for unpacked Chrome and Brave, plus `test/manifest.test.js`.
**Where**: `manifest.json`
**Depends on**: None
**Reuses**: none
**Requirement**: LIKE-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Manifest version is 3
- [x] Content scripts match `https://x.com/*` and `https://twitter.com/*`
- [x] Permissions are storage only, with those two host permissions
- [x] `node --test` passes
- [x] Test count is higher than before this task and none are skipped

**Tests**: unit
**Gate**: quick

**Commit**: `feat(manifest): register the unpacked mv3 extension`

**Status**: Complete. Gate `node --test`: 76 passed, 0 failed, 0 skipped.

---

#### T3: Add the original icon

**What**: Hand-drawn `icons/icon.svg` and committed PNG rasters at 16, 32, 48, and 128. Plus `test/icon.test.js`.
**Where**: `icons/icon.svg`
**Depends on**: T2
**Reuses**: none
**Requirement**: LIKE-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `icons/icon.svg` is an original SVG and does not name another extension
- [x] PNG files exist at the four sizes and the manifest points at those PNGs
- [x] `node --test` passes
- [x] Test count is higher than before this task and none are skipped

**Tests**: unit
**Gate**: build

**Commit**: `feat(icons): add the original toolbar icon`

**Status**: Complete. Gate `node --test`: icon tests passed, 0 skipped.

---

### Phase 3: Content loop

```
T4
```

#### T4: Run the like loop in the open tab

**What**: `content/content.js` exports `createSessionRunner` and boots only inside an extension page. `test/content-adapter.test.js` drives it with fakes.
**Where**: `content/content.js`
**Depends on**: T1, T2
**Reuses**: `lib/policy.js`
**Requirement**: LIKE-01, LIKE-02, LIKE-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A start on a visible home fixture clicks the selected post id once
- [x] A hidden document does not click and keeps the count
- [x] A login wall does not click
- [x] Stop does not click
- [x] The file does not reference `chrome.cookies` or an API token
- [x] `node --test` passes
- [x] Test count is higher than before this task and none are skipped

**Tests**: unit
**Gate**: build

**Commit**: `feat(content): like posts in the open X tab`

**Status**: Complete. Gate `node --test`: 84 passed, 0 failed, 0 skipped.

---

### Phase 4: Popup

```
T5 -> T6
T6 -> T7
```

#### T5: Add the popup document

**What**: Portuguese popup structure in `popup/popup.html` and `test/popup-markup.test.js`.
**Where**: `popup/popup.html`
**Depends on**: None
**Reuses**: status copy from the spec
**Requirement**: LIKE-06

**Tools**:

- MCP: NONE
- Skill: `frontend-design`

**Done when**:

- [x] `lang` is `pt-BR`
- [x] Interval, cap, and original-post controls have associated labels
- [x] Start and stop are `button` elements
- [x] The status region is `aria-live="polite"`
- [x] The count prefix "Curtidas nesta sessão:" is present
- [x] `node --test` passes
- [x] Test count is higher than before this task and none are skipped

**Tests**: unit
**Gate**: quick

**Commit**: `feat(popup): add the portuguese control document`

**Status**: Complete. Gate `node --test`: 89 passed, 0 failed, 0 skipped.

---

#### T6: Add the popup stylesheet

**What**: Dark accessible styles in `popup/popup.css` and `test/popup-css.test.js`.
**Where**: `popup/popup.css`
**Depends on**: T5
**Reuses**: none
**Requirement**: LIKE-06

**Tools**:

- MCP: NONE
- Skill: `frontend-design`

**Done when**:

- [x] Background color `#12141a` and text color `#f4f1ea` are declared
- [x] A `:focus-visible` outline is declared
- [x] `node --test` passes
- [x] Test count is higher than before this task and none are skipped

**Tests**: unit
**Gate**: quick

**Commit**: `feat(popup): add the dark accessible stylesheet`

**Status**: Complete. Gate `node --test`: 91 passed, 0 failed, 0 skipped.

---

#### T7: Wire popup settings and live status

**What**: `popup/popup.js` exports `createController` and `test/popup-controller.test.js` covers save, start, and status text.
**Where**: `popup/popup.js`
**Depends on**: T1, T6
**Reuses**: `lib/policy.js`
**Requirement**: LIKE-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] An invalid interval does not call `storage.set` and shows the spec sentence
- [x] A valid form saves the validated settings object
- [x] Start on a non-X tab sends no start message
- [x] Start on an X tab sends start to that tab
- [x] The status node shows the spec sentence and the count prefix
- [x] `node --test` passes
- [x] Test count is higher than before this task and none are skipped

**Tests**: unit
**Gate**: build

**Commit**: `feat(popup): wire settings and live status`

**Status**: Complete. Gate `node --test`: 96 passed, 0 failed, 0 skipped.

---

### Phase 5: Docs

```
T8
```

#### T8: Explain install, settings, and limits

**What**: Bilingual `README.md`, root `LICENSE` (MIT), and `test/readme.test.js`. GitHub URL included once the public repo exists.
**Where**: `README.md`
**Depends on**: T4, T7
**Reuses**: none
**Requirement**: LIKE-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] README has a Portuguese section and an English section
- [x] README explains the open logged-in tab, unpacked load in Chrome, unpacked load in Brave, interval, cap, reply-original toggle, author Fernando Paladini, MIT, and the X rules note
- [x] LICENSE is MIT and names Fernando Paladini
- [x] `node --test` passes
- [x] Test count is higher than before this task and none are skipped

**Tests**: unit
**Gate**: build

**Commit**: `docs(readme): explain install, settings, and limits`

**Status**: Complete. Gate `node --test`: 100 passed, 0 failed, 0 skipped.

---

## Task Breakdown

The task bodies are the phase sections above. This section is the pre-execute check.

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Add the session policy module | 1 module | Granular |
| T2: Register the Manifest V3 extension | 1 manifest | Granular |
| T3: Add the original icon | 1 icon family | Granular |
| T4: Run the like loop in the open tab | 1 adapter | Granular |
| T5: Add the popup document | 1 document | Granular |
| T6: Add the popup stylesheet | 1 stylesheet | Granular |
| T7: Wire popup settings and live status | 1 controller | Granular |
| T8: Explain install, settings, and limits | 1 README | Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | no incoming arrow | Match |
| T2 | None | no incoming arrow | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T1, T2 | both are earlier phases, not in the phase fence | Match |
| T5 | None | no incoming arrow | Match |
| T6 | T5 | T5 -> T6 | Match |
| T7 | T1, T6 | T6 -> T7 in phase. T1 is an earlier phase | Match |
| T8 | T4, T7 | both are earlier phases, not in the phase fence | Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Add the session policy module | Domain policy | unit | unit | OK |
| T2: Register the Manifest V3 extension | Manifest contract | unit | unit | OK |
| T3: Add the original icon | Icon | unit | unit | OK |
| T4: Run the like loop in the open tab | Content adapter | unit | unit | OK |
| T5: Add the popup document | Popup document | unit | unit | OK |
| T6: Add the popup stylesheet | Popup stylesheet | unit | unit | OK |
| T7: Wire popup settings and live status | Popup controller | unit | unit | OK |
| T8: Explain install, settings, and limits | README | unit | unit | OK |

## Phase Execution Map

```
Phase 1: T1
Phase 2: T2 -> T3
Phase 3: T4
Phase 4: T5 -> T6 -> T7
Phase 5: T8
```
