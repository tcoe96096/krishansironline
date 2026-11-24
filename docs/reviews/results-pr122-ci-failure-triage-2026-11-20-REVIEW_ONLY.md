# PR #122 CI triage — review only (2026-11-20)

Scope: results/study materials/website-admin review. No Teacher v2 changes are authorized by this note.

## Evidence
- Commit `3086202cdea63678ebb6b3fd411c704c0680d8b9` has four PR-triggered runs: Preview build #44739256233 **success**, Validate website build #44739256236 **success**, Hosting compliance #44739256471 **success**, Teacher Core Beta isolated checks #44739256230 **failure**.
- Failed job `isolated-core` (#136298411153): TypeScript, Teacher unit tests, static SQL parsing, website build and mock preview assembly passed. Step 19 `node scripts/teacher-management-smoke.mjs` timed out after 30 seconds at line 88 waiting for `getByRole('region', { name: 'Teacher Management v2', exact: true }).getByText(/awaiting owner-approved backend activation/)`.
- This is an **unresolved browser assertion failure**, not proof of a Results module regression or proof of a working Teacher backend. Possible stale assertion/copy change/portal render issue requires Teacher-owned investigation; do not alter Teacher source or tests from Results branch.
- Comparison `main...fix/results-csv-formula-guard-20261119`: 56 ahead, 13 behind; integration conflict/rebase review remains required. Existing PR #122 is draft; do not merge.

## Review-only handoff
1. Teacher owner: inspect the exact browser screenshot/DOM and smoke assertion for this run, then decide whether UI behavior or expectation is incorrect. Keep Teacher PR #109 untouched by Results work.
2. Results owner: validate synthetic Result Inbox browser matrix separately and record screenshots; a successful website build does not establish cross-student authorization.
3. Before any activation: verify managed recovery, compare Preview/Production RPC signatures/grants/RLS and private storage evidence with read-only access; production result-card backend is **not verified available**.

No database access, SQL execution, deployment, publishing, user delivery or merge performed in this checkpoint.
