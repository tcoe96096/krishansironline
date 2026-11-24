# PR #122 vs main — path overlap review (READ ONLY)

Date: 2026-11-19. Scope: GitHub comparison metadata only; no database inspection or deployment.

## Verified refs
- Main at review: `a464cd4ae7b0c892220687feba4a49f9a19c6652`.
- Draft head before this note: `d1f5dcc9da6ea55ee775411207845de5fe346f05`.
- Merge base: `e9686f35aaeda9bbfa2d36190d528331f82dd019`.
- Draft is 28 commits ahead and 13 behind main; comparison status: diverged.

## Main-only changed paths (merge base → main)
1. `scripts/visual-studio-smoke.mjs`
2. `src/components/AdminSiteWideLiveEditor.tsx`
3. `src/components/AdminVisualStudio.tsx`

## Draft changed paths (main → draft diff)
- `src/components/AdminTestResults.tsx`
- `src/components/MockResultCardDesigner.tsx`
- `src/components/MockResultInbox.tsx`
- `src/lib/resultsCsvSafety.ts`
- `tests/mockResultCardDesigner.test.ts`
- `tests/mockResultInbox.test.ts`
- `tests/resultsCsvSafety.test.ts`
- Seven result/review documents under `docs/`.

**Exact changed-path intersection: empty.** This lowers the risk of direct same-file conflict, but does not establish semantic compatibility, clean merging, or production readiness. Do not automatically reconcile branches while other contributors may be editing main.

## CI evidence
For draft head `d1f5dcc9da6e`, GitHub reports four completed successful PR workflow runs: Teacher Core Beta isolated checks (44528266523), Preview build (44528266485), Hosting compliance (44528266490), Validate website build (44528266499). CI is not a live deployment or proof of Result Card RPC availability.

## Gate / next bounded task
Recheck both branch heads immediately before any reconciliation; review Studio-to-Results route contracts and mock UI navigation without changing shared files. Recovery verification, Preview/Production RPC/RLS/storage inventory, and separate owner approval remain mandatory before database writes, merge, publishing, or delivery.

No changes to Teacher v2, PR #109, Student/Exam, ADVANCE Studio, credentials, active Studio data, DNS, or live services.
