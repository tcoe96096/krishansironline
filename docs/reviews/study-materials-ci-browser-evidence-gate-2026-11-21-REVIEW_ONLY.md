# Study Materials security tests — execution and evidence gate (REVIEW ONLY)

Date: 2026-11-21. Scope: existing isolated `test/study-video-url-mock-20261121` branch only. No production authorization claim.

## Verified repository facts
- `package.json` has `lint` and `build`, but no `test` script. `tsx` is a dev dependency.
- `tests/studyMaterialsDownloadExpiryMock.test.ts` contains eight Node test groups. It is a synthetic eligibility oracle; its `objectKey` and `downloadUrl` remain null even when `allowed` is true.
- The latest checked commit `b1b5ed90d963495ad02976c6c977d3a98ae25bd8` has no PR-triggered workflow runs in the queried first-page workflow endpoint. Absence is **not** a failed test or proof of no other CI.
- Branch differs from `main`; do not rebase/merge or modify shared workflows in this review-only step.

## Reproducible test commands (NOT EXECUTED by this document)
Run only from a clean checkout of the exact branch/commit, using the existing lockfile and Node 22:
```sh
npm ci
npx tsx --test tests/studyMaterialsVideoEmbedMock.test.ts tests/studyMaterialsDownloadExpiryMock.test.ts tests/studyMaterialsMockAccess.test.ts
npm run lint
npm run build
```
Capture exit code, actual test totals, SHA, Node/npm versions, UTC timestamp, and redacted logs. Do not mark PASS until observed. Do not attach personal student data, tokens, private storage URLs or credentials.

## CI wiring proposal (owner review required)
Add a scoped PR-only job that installs dependencies with `npm ci`, runs the three synthetic tests with `npx tsx --test`, and uploads redacted test output; it must have read-only repository permissions, no Supabase secrets, no deployment environment, no database connection and no publishing steps. Existing shared workflows are owned elsewhere; **propose this job rather than editing shared workflow files concurrently**.

## Browser acceptance — still NOT RUN
At viewport widths 320, 375, 768 and 1280 px, use synthetic materials only. Inspect horizontal overflow, long Hindi/English titles, keyboard focus order, accessible link names, video fallback, PDF loading/error states, draft material invisibility, withdrawn-enrollment denial and expired download denial. Save screenshot/video evidence with browser/version, viewport, commit SHA, timestamp and synthetic fixture ID. Screenshots alone do not establish server authorization.

## Release gate
Production Result Card RPC/RLS/storage, Preview parity, backup recovery, authenticated negative tests and owner approval are unverified. No live delivery, merge, deployment or database write is authorized by these synthetic tests.
