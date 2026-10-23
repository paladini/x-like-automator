# STATE

## Decisions

### AD-001
- **Decision**: The extension is plain Manifest V3 with no build step, and every like, dedup, interval, cap, visibility, and scroll-stall decision lives in `lib/policy.js` as a pure function.
- **Reason**: Load unpacked has to work from source in Chrome and Brave, and the session rules have to be tested with `node --test` without an X account.
- **Trade-off**: No TypeScript, no bundler, and no UI framework. Adapters in the content script and the popup stay thin and repeat a little glue.
- **Scope**: All runtime code in this repository.
- **Date**: 2026-10-23
- **Status**: active

## Handoff

- **Feature**: likes-session (`.specs/features/likes-session`)
- **Phase / Task**: Design, before tasks
- **Completed**: specification
- **In-progress** (file:line): `.specs/features/likes-session/design.md:1` - architecture
- **Next step**: Write tasks.md and validate it, then execute T1.
- **Blockers**: none
- **Uncommitted files**: specification, design, and skill install are not committed yet
- **Branch**: not a git repository yet
