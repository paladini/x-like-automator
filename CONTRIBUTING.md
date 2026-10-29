# Contributing

[README (English)](README.md) · [README (Português)](README.pt-BR.md) ·
[CHANGELOG](CHANGELOG.md) · [Security](SECURITY.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

Contributions are welcome. This is a small, deliberately scoped project — please read
the ground rules before investing effort.

## Development environment

- **Node.js 20+** (the CI matrix runs Node 20.x and 22.x on Ubuntu and Windows).
- **No install step.** The package has zero dependencies; tests run on Node's built-in
  test runner:

  ```bash
  git clone https://github.com/paladini/x-likes-automator.git
  cd x-likes-automator
  npm test          # same as: node --test
  ```

- To try changes in a browser: load the repository folder unpacked at
  `chrome://extensions` (Developer mode), then reload the X tab. After editing
  extension files, press **Reload** on the extension card **and** reload the X tab —
  already-open tabs keep the old script otherwise.

### Repository layout

No build step, no runtime dependencies — the whole repository is the extension:

```
x-likes-automator/
├── manifest.json             # Manifest V3: permissions, content scripts, popup
├── lib/
│   ├── ui-languages.js       # 49 X locale label packs + the NEVER_QUOTE blacklist
│   └── policy.js             # Pure decision engine (settings, ladder, statuses, cadence)
├── content/
│   └── content.js            # DOM adapter: reads the page, clicks, scrolls, reloads
├── popup/
│   ├── popup.html / .css     # Popup UI (labels in Brazilian Portuguese)
│   └── popup.js              # Controller: settings I/O, messaging, live counter
├── icons/                    # 16 / 32 / 48 / 128 px toolbar icons + source SVG
├── docs/                     # getting-started · configuration · architecture ·
│                             # behavior-and-limits · localization · faq · troubleshooting
├── test/                     # node:test suites: policy, adapter, popup, manifest,
│   │                         # README/docs contracts, icon
│   └── fixtures/
│       └── repost-menu.html  # redacted excerpt of X's real repost popover
├── .github/                  # ISSUE_TEMPLATE/, pull_request_template.md, workflows/test.yml
├── CONTRIBUTING.md · CHANGELOG.md · SECURITY.md · CODE_OF_CONDUCT.md · LICENSE
├── README.md                 # lean end-user entry (English)
└── README.pt-BR.md           # Brazilian Portuguese mirror
```

> **Architecture rule:** `lib/policy.js` owns every decision (a pure `planTick` →
> `applyPlan` loop, no DOM, no `chrome.*`); `content/content.js` owns every DOM
> interaction behind small injected functions (`readSnapshot`, `clickLike`,
> `openRepost`, `confirmRepost`, `scrollBy`, `publish`, `schedule`, `reload`);
> `popup/popup.js` owns only settings I/O and messaging. Keep DOM logic out of policy
> and policy logic out of the adapter — that seam is what makes the engine testable in
> plain Node with fake-DOM harnesses.

> **Fixture note:** `test/fixtures/repost-menu.html` is a redacted excerpt of X's real
> repost popover (Portuguese interface), keeping the `data-testid='retweetConfirm'`
> anchor and the localized item labels verbatim. If X changes this markup, update the
> fixture and the adapter tests together.

## Test discipline

**Every behavior change adds or updates a test.** The suites are file-as-contract:

| Suite | Guards |
|---|---|
| `test/policy.test.js` | The pure decision ladder, `applyPlan` transitions, settings validation, cadence and jitter math, surface classification, thread roles, repost menu choice. |
| `test/content-adapter.test.js` | DOM adapter against fully injected fakes: click gating, retry ladder, scroll arming, visibility pauses, reload-and-resume. |
| `test/popup-controller.test.js`, `popup-markup`, `popup-css` | Popup ids/labels/behaviors, live-region semantics, tone styling. |
| `test/manifest.test.js` | Shipped-file purity: MV3, storage-only permissions, the two X hosts, no background, no `import`/`export`, PNG-only icons. |
| `test/readme.test.js`, `test/docs.test.js` | The documentation set is a contract — claims that ship are claims that are tested. |
| `test/icon.test.js` | The shipped icon set renders at all four sizes. |

The gate is `node --test` from the repository root, **green before opening a PR** —
CI runs the same command on every push and pull request to `main`.

## Ground rules (what will not change)

- **Single logged-in tab.** No multi-tab orchestration, no background service worker —
  presence is the switch. A hidden or unfocused X tab must always pause.
- **Human-like pacing stays inside the interval you choose.** The delay is randomized
  to 85–100 % of `intervalSeconds`; proposals to remove the jitter, to go below 1 s,
  or to like at machine-gun pace will be declined — this project is explicitly not a
  bot farm toolkit.
- **Safety invariants.** Never unlike, never undo a repost, never quote, never open a
  composer, never reply, never follow, never DM, never touch credentials or cookies;
  an unknown button state is never clicked. Any PR that could weaken these must carry
  overwhelming evidence.
- **Zero dependencies, zero network from the extension.** No `fetch`, no XHR, no
  analytics, no build step. Keep it that way.
- **Plain repost only.** The one extra click allowed is the menu item that shares a
  post with no phrase (`[data-testid='retweetConfirm']`); missing menu → close and
  skip, never type.

## Pull request process

1. Fork and branch from `main` — one behavior per PR, small and focused.
2. Follow **Conventional Commits** (`feat(policy): …`, `fix(content): …`,
   `docs: …`, `test: …`, `chore: …`). Scope names the component you touched.
3. Add/adjust tests for every behavior change; update both READMEs and the doc
   contracts if any user-facing claim moved.
4. Run `npm test` until green.
5. Fill in the PR template — for selector changes, state which X UI language/variant
   you verified against (or mark new labels best-effort for UAT).

Open an issue first for anything larger than a fix — the refusal list and the
"open tab only" scope are deliberate and unlikely to change.

## Documentation

User-facing docs are bilingual: `README.md` (English) and `README.pt-BR.md` mirror each
other section-for-section and stay small enough to read in one sitting. Deep technical
content lives in `docs/` (English only): getting-started, configuration, architecture,
behavior-and-limits, localization, faq, troubleshooting. The docs set is contract-tested
(`test/readme.test.js`, `test/docs.test.js`): when a user-facing claim moves, its
assertion moves **with it** to the file that now owns the content — never weakened. Keep
all of it in sync in the same PR that changes behavior.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
