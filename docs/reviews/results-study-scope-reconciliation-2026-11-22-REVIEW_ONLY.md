# Results / Study Materials scope reconciliation — REVIEW ONLY (2026-11-22)

Source: GitHub compare `main...test/study-video-url-mock-20261121` inspected 2026-11-22. Base main `a464cd4ae7b0c892220687feba4a49f9a19c6652`, merge base `e9686f35aaeda9bbfa2d36190d528331f82dd019`. Source branch diverged: 70 ahead, 13 behind; 27 changed paths. This document is a review proposal, NOT an authorization to cherry-pick or merge.

## Bounded scope groups (proposed, not executed)

1. **Study Materials synthetic security:** `.github/workflows/study-materials-synthetic-review.yml`, `tests/studyMaterialsDownloadExpiryMock.test.ts`, `tests/studyMaterialsMockAccess.test.ts`, `tests/studyMaterialsVideoEmbedMock.test.ts`, `docs/reviews/study-materials-*.md`. Run tests and inspect push-triggered Actions evidence; absence of PR checks does not prove a pass. This is mock-only, not live RLS/Storage proof.
2. **Results mock UI and isolated tests:** `src/components/MockResultCardDesigner.tsx`, `src/components/MockResultInbox.tsx`, `src/lib/resultsCsvSafety.ts`, `tests/mockResultCardDesigner.test.ts`, `tests/mockResultInbox.test.ts`, `tests/resultsCsvSafety.test.ts`, results-specific review documents. Ensure no real send/download or private data; design preview only.
3. **Shared/overlap hold:** `src/components/AdminTestResults.tsx` (modified) must NOT be copied into a new branch until Student/Exam ownership and diff are reviewed. `docs/reviews/results-studio-navigation-contract-2026-11-19-REVIEW_ONLY.md` is a proposal only; do not overwrite active Studio sources or publishing controls.
4. **Result RPC/RLS evidence:** `docs/result-card-rpc-rls-reconciliation-REVIEW_ONLY.md`, `docs/results-preview-rpc-evidence-gap-20261119-REVIEW_ONLY.md`, `docs/results-rpc-inventory-protocol-20261119-REVIEW_ONLY.md`, `docs/results-private-delivery-acceptance-REVIEW_ONLY.md`. Review-only inventory; Preview migrations/RPC do not establish Production capability.

## Acceptance before any integration

- Rebase or selectively recreate bounded scopes from current `main`, never blindly merge the diverged 70-commit branch.
- Verify synthetic tests with actual logs and workflow run ID; collect 320px browser mock evidence separately.
- Confirm role contracts and Student/Exam ownership before shared-path changes; keep Teacher v2, PR #109 and ADVANCE Studio untouched.
- Production Result Card remains blocked pending verified recovery, deployed RPC/RLS and private storage evidence, authenticated student/admin QA, and separate explicit owner approval.
- No SQL execution, database writes/migrations, credential access, publishing, deployment, DNS changes, cross-user sends, or merge permitted by this document.
