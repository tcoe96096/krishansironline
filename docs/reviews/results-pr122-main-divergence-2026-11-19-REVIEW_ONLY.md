# Results PR #122 — main divergence review (REVIEW ONLY)

Checked 2026-11-19. No merge, deployment, SQL execution or production activation is authorized by this document.

## Verified refs
- Main: `a464cd4ae7b0c892220687feba4a49f9a19c6652` at inspection.
- PR #122 checked head: `2ce6dc59b3bcda3344dbd82007e0976ceef02741`.
- Merge base: `e9686f35aaeda9bbfa2d36190d528331f82dd019`.
- GitHub compare `main...head`: diverged, 27 commits ahead and 13 behind.
- Four pull-request CI runs for checked head completed successfully: Hosting compliance, Validate website build, Teacher Core Beta isolated checks, Preview build.

## Changed paths in scoped PR compared to merge base
- Results CSV: `src/components/AdminTestResults.tsx`, `src/lib/resultsCsvSafety.ts`, `tests/resultsCsvSafety.test.ts`.
- Mock-only Results: `src/components/MockResultCardDesigner.tsx`, `src/components/MockResultInbox.tsx`, related tests.
- Review-only docs: results RPC/RLS, private delivery, evidence gaps and CSV acceptance.

## Reconciliation gates before any owner-approved merge
1. Compare latest main changes touching `AdminTestResults.tsx`, build config and shared contracts; resolve only in a scoped branch after source review. Do not overwrite concurrent Student/Exam, Teacher or Studio changes.
2. Re-run CSV security tests, lint/build and all PR CI on the reconciled exact SHA. Do not interpret historical green CI as approval for a new head.
3. Obtain independent recovery verification, Preview/Production RPC/RLS/storage inventory and owner approval separately before any database or result-delivery activation.
4. Treat MockResultCardDesigner and MockResultInbox as mock UI only; Production Result Card backend is not established.

## Explicit exclusions
No Teacher v2 / PR #109 edits; no ADVANCE Studio edits; no production or Preview writes, deploys, merges, publication or cross-user result sends.
