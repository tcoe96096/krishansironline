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
