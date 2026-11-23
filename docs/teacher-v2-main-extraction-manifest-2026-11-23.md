# Teacher v2 extraction manifest — 2026-11-23

**REVIEW ONLY / CODE ONLY.** This manifest describes a safe path from PR #128's stacked feature base to a future narrowly scoped candidate based on current `main`. It is not authorization to merge, migrate, publish or enable flags.

## Verified comparison baseline
- Main: `ed7481c2682aafc0d61706689df853e7eaedc4a9`
- PR #128 head at inspection: `2f184d8d5301acb0769f47dbeab4a11607c507b2`; base: `feature/teacher-dashboard-verified-details-20261121`; draft and mergeable **only against that base**.
- Compare `main...feature/teacher-v2-backend-completion-20261122`: 146 ahead / 17 behind; 71 changed paths. Counts are snapshot-specific and must be refreshed before extraction.
- Isolated CI for this head succeeded; this does **not** establish deployed website, authenticated Preview acceptance, or Production readiness.

## Staged extraction into a clean main-based candidate
1. **Pure model/policy and corresponding tests:** inspect `src/lib/teacherManagementValidation.ts`, `teacherBetaFlags.ts`, `teacherBetaPolicy.ts`, `teacherDashboardModel.ts`, `teacherSnapshotValidation.ts`, `teacherPhotoContentValidation.ts`, `teacherPhotoStoragePolicy.ts`, `teacherResumePolicy.ts`, `teacherResumeContentPreflight.ts`, `teacherResumeScanSummary.ts`, `teacherQueueSummary.ts` and their matching `tests/teacher*.test.ts`. Check each file against main; copy only missing or materially changed teacher-owned logic, not unrelated historical commits.
2. **Teacher-only services/components:** review `src/services/teacherPrivatePhoto.ts`, `teacherPrivateResume.ts`, `src/components/TeacherManagementV2.tsx`, `TeacherPrivatePhotoV2.tsx`, `TeacherPrivateResumeV2.tsx`, `TeacherReviewPrivatePhoto.tsx`, `TeacherResumeScanSummary.tsx`, `AdminTeacherDirectoryV2.tsx`, `TeacherSiteWorkspace.tsx` against the current main API. No real storage access until server-side ownership checks are proven.
3. **Backend proposals only:** preserve `docs/proposed-migrations/teacher_*REVIEW_ONLY.sql` as non-executable artifacts. Audit auth.uid(), SECURITY DEFINER search_path, grants, employee ID uniqueness, independent reviewer identity, cross-account access, resume quarantine, and the reported `public.user_roles` TRUNCATE exposure. Do not run SQL.
4. **Shared files are blocked for unilateral edits:** `src/App.tsx`, `src/components/Header.tsx`, `src/components/AdminDashboard.tsx`, `vite.config.ts`, and `scripts/teacher-integrated-website-smoke.mjs` require targeted interface proposals and owner review. PR #116/#117 are already merged; no duplicate portal or Studio replacement. PR #109 stays read-only; #110/#114/#130 and Student/Results/Study Materials/Studio remain separately owned.
5. **Release gate:** verify GitHub Pages entry and actual main build path; passing `teacher-beta` Vite checks alone does not prove deployment. Run TypeScript/build, teacher regression and cross-module smoke on free verified CI quota; retain flags OFF.

## Independent security and recovery gates
Do not mutate Preview or Production until an actual full-backup restore has been independently verified (TOC or synthetic test is insufficient), the owner separately authorizes Preview changes, and authenticated positive **and negative** tests cover anonymous, applicant A/B, approved/suspended teacher, reviewer and admin. Test RPC EXECUTE/RLS grants, unauthorized role escalation, photo/resume access across users, failed scan/quarantine and reviewer self-approval denial. Production requires a distinct later owner authorization after Preview acceptance. Additional budget ceiling: ₹0; no billable services, storage or Actions usage.

## Refreshed integration audit — 2026-11-24 (read-only GitHub evidence)
- Current main SHA: `c26f3ce15755617b0cd07b4c05e087cf46a2d1a1`; branch head before this documentation update: `6dd59a9cb38d7a12e073a20d4a70469ce28da3d1`.
- GitHub compare: **152 ahead / 33 behind**, diverged; 72 changed paths. The branch is NOT a main-based release candidate.
- Last verified Teacher v2 isolated checks for `6dd59a9`: workflow run [45217584760](https://github.com/tcoe96096/krishansironline/actions/runs/45217584760), completed/success. No claim about this documentation commit's CI until separately verified.
- Shared-file conflicts to isolate before any extraction: `src/App.tsx`, `src/components/Header.tsx`, `src/components/AdminDashboard.tsx`, `vite.config.ts`. Treat these as interface proposals, not cherry-pick targets. Compare overlapping Teacher-owned paths with PR #126 first; PR #109 remains strictly read-only.
- Acceptance remains **NO_GO**: a successful isolated CI does not establish GitHub Pages integration, persistent Supabase RPCs, authenticated cross-account RLS/storage tests, or independently verified full backup restore. A limited application-data salvage is not full Supabase recovery.
- Next safe extraction: start from the then-current main; inspect exact teacher-owned source/test deltas one by one; keep SQL as REVIEW ONLY and flags OFF; do not duplicate existing #116/#117 UI or #126 changes. No Preview/Production writes, deployment, merge, DNS changes or paid services. Budget ceiling ₹0.
