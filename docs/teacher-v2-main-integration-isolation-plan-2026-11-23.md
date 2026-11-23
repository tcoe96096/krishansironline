# Teacher v2 main integration boundary (2026-11-23)

**REVIEW ONLY — do not merge, deploy, mutate databases or enable flags.**

Verified: main `ed7481c2682aafc0d61706689df853e7eaedc4a9`; PR #128 head `21fe7b8ee839bf8fea8edc8f540e210bb4717f33`, draft, clean **only against** feature base `feature/teacher-dashboard-verified-details-20261121`. Comparing head to main: 145 ahead, 17 behind, 70 changed paths. Isolated teacher CI run 45084340209 succeeded; this is not Preview or Production acceptance.

## Extraction and ownership
1. Start a new integration candidate from current main, recheck head, inspect effective diff against merge-base. Never replay 145 commits indiscriminately.
2. Extract teacher-owned validation/model and tests first, skipping identical main files. Then review teacher private photo/resume services and server RPC contracts. Private media requires server-side owner authorization and fail-closed flags; browser content preflight is not malware scanning.
3. Review TeacherManagementV2, TeacherReviewPrivatePhoto, TeacherResumeScanSummary and AdminTeacherDirectoryV2 only against current main interfaces. PR #116 and #117 already merged: do not duplicate registration/login/dashboard or Studio consolidation.
4. Shared App.tsx, Header.tsx, AdminDashboard.tsx, vite.config.ts and website integration scripts are coordination surfaces. Propose minimal diffs to their owners, not broad overwrites. PR #109 remains strictly read-only; #110/#114/#130 independently owned.
5. Keep all teacher SQL proposals as REVIEW ONLY and out of executable CI. Test free CI build, TypeScript, teacher regression and hosting compliance on a narrowly scoped candidate.

## Preview and production gates
Full independently verified restore rehearsal required; TOC/synthetic restore does not suffice. Audit Preview's effective anon/authenticated TRUNCATE grant on public.user_roles without executing TRUNCATE. Validate teacher RPC signatures, SECURITY DEFINER search_path/auth.uid(), EXECUTE grants, RLS and private Storage policies. After separate authorization for Preview changes, run independently authenticated positive and negative sessions (anonymous, applicant A/B, teacher, suspended teacher, reviewer, admin), including cross-account media denials, approval separation, employee ID uniqueness, quarantine/independent scan and audit trail. Only after successful Preview acceptance and distinct Production authorization consider any migration, flags or live publication. GitHub Pages hosting, Cloudflare DNS only, Supabase Cloud, additional budget ₹0.

This document is a code-only planning artifact; no backend activation is implied.
