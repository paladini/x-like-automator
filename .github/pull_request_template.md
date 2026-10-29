# Summary

One or two sentences: what does this PR change and why?

Closes #<!-- issue number, if any -->

## Verification

- [ ] `npm test` (i.e. `node --test`) is **green** locally before requesting review
- [ ] Every behavior change adds or updates a test (no behavior ships without a lock)
- [ ] Safety invariants hold by test: never unlike / never undo a repost / never
      quote / never reply / never follow / never DM / unknown state never clicked
- [ ] Cadence contract preserved: like-to-like delay stays within
      85–100 % of `intervalSeconds` (`test/policy.test.js` jitter grid unchanged
      or extended)
- [ ] DOM-selector changes state the X UI language + variant they were verified
      against (or mark the new labels best-effort for UAT)
- [ ] Docs updated in the same PR when a user-facing claim moved: both READMEs and
      `docs/` as needed; `test/readme.test.js` / `test/docs.test.js` reflect it
- [ ] Shipped files stay dependency-free and network-free (`test/manifest.test.js`
      green without weakening it)

## Commits

- [ ] Conventional Commits (`feat(scope): …`, `fix(scope): …`, `docs: …`, `test: …`)
- [ ] One behavior per commit; PR title summarizes the whole change

## Screenshots / recordings

For popup or behavioral changes: before/after, with the status line readable.
