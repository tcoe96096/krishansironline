# Study Materials CI command drift — REVIEW ONLY

Date: 2026-11-22. Evidence: `test/study-video-url-mock-20261121` workflow `.github/workflows/study-materials-synthetic-review.yml` at blob `020e64e2bda3ec72a6e0ba0307b7ce522cb83a73`; prior review note `docs/reviews/study-materials-ci-browser-evidence-gate-2026-11-21-REVIEW_ONLY.md` at blob `e362dfe078a3b2db431aba576b5f864e53363680`.

## Confirmed discrepancy
The older review note proposes `npm ci` and `npx tsx --test`, but the current isolated workflow explicitly avoids dependency installation because the repository lacks a root lockfile. It uses Node 22 with `node --experimental-strip-types --test` for the three synthetic tests. Treat the older reproduction instructions as **stale**, not as proof of a passing run.

## Exact current synthetic-only reproduction (not executed in this review)
```sh
node --version # require Node 22
node --experimental-strip-types --test tests/studyMaterialsVideoEmbedMock.test.ts tests/studyMaterialsDownloadExpiryMock.test.ts tests/studyMaterialsMockAccess.test.ts
```

Capture actual exit status, test totals, branch SHA and redacted GitHub Actions logs before claiming PASS. GitHub combined commit statuses are not equivalent to Actions check runs; an empty status list does not establish CI success or failure. A push must match both the branch and path filters to trigger this workflow. The workflow has `workflow_dispatch` but no `pull_request` trigger.

## Scope and safety
This is documentation only on the isolated reconciliation branch; no tests were executed here and no backend authorization was proven. No shared workflow, Student/Exam or Teacher source, database, deployment, publishing, live result delivery or ADVANCE Studio changes. Production result-card RPC/RLS and recovery evidence remain separate release gates.
