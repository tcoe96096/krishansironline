# Teacher v2 Preview activation gate — 2026-11-22

Status: **BLOCKED — do not deploy or publish**.

## Verified in connected Supabase Preview
- Project: `zgpkmfqioqvincmgyfpi` (`krishan-sir-lms-preview`), ACTIVE_HEALTHY.
- Public teacher tables found: `teacher_enrollment_requests`, `teacher_enrollment_audit` (legacy).
- No `public.teacher_profiles`, `public.teacher_qualifications`, `public.teacher_assignments`, `public.teacher_resume_documents`, or `public.teacher_audit_events` found.
- No `public.teacher_v2_%` routines found.
- Supabase migration history ends with 2026-11-15 preview migrations; no Teacher v2 migration.
- Security advisor returned existing warnings for executable SECURITY DEFINER functions and RLS-enabled tables without policies. Investigate individual findings; do not blindly revoke existing app permissions.

## Proposed migration dependency chain (repository, REVIEW ONLY)
1. `teacher_management_v2_schema_REVIEW_ONLY.sql`
2. `teacher_management_v2_profile_rpc_REVIEW_ONLY.sql`
3. `teacher_management_v2_functions_REVIEW_ONLY.sql`
4. `teacher_management_v2_lifecycle_REVIEW_ONLY.sql`
5. `teacher_management_v2_integration_REVIEW_ONLY.sql`
6. Other feature-specific proposals (resume, acceptance) require separate review.

## Activation checklist
- [ ] Verify managed Preview backup and independent restore test; record timestamps and evidence.
- [ ] Review SQL diffs against live Preview schema; verify dependent tables, policies, and function signatures.
- [ ] Review SECURITY DEFINER auth.uid(), fixed search_path, execute grants, privilege escalation, legacy grant compatibility.
- [ ] Apply reviewed migration bundle **only to Preview** after the above gates are satisfied.
- [ ] Verify SQL functions and RLS with distinct teacher, applicant, admin, super-admin, and anonymous sessions.
- [ ] Test cross-account read/write denial, concurrent approval/revision, multi-scope assignments, employee ID uniqueness, suspension and legacy-grant denial.
- [ ] Verify UI build and automated tests; inspect Preview deployment and end-to-end registration/login/review.
- [ ] Request separate production release authorization after Preview acceptance and rollback readiness.

No SQL was executed to change Preview or Production as part of this audit. PR #109 remains read-only.

## Independent role acceptance matrix (planning only; no database writes)

Execute **only after** a verified full restore rehearsal, reviewed migrations and a distinct owner approval for Preview. Use independently authenticated sessions; never emulate roles by editing client-side flags or JWT claims. Capture sanitized evidence (request ID, expected/actual status, role, timestamp) without tokens, private file URLs or PII.

| Actor | Positive case | Mandatory denial case |
| --- | --- | --- |
| Anonymous | Public site remains readable | Teacher snapshot, registration save, review, resume/photo access and scan summary all denied |
| Applicant A | Save and retrieve own draft; upload only when independently approved | Read/alter applicant B, assign self an employee ID, approve own application, fetch B media |
| Approved Teacher A | Own verified profile and authorized class/subject/work scopes | Alter B profile, grant own scopes, review applications, use revoked/suspended permissions |
| Reviewer/Admin | View only server-authorized review queue; record independent review decision | Escalate to Super Admin, bypass second-party approval, open unscanned resumes |
| Super Admin | Authorized review and scope assignment, with audit trail | Bypass private-media quarantine or read data outside explicit server policy |

**SQL permission evidence:** Inspect effective grants for `anon`, `authenticated` and inherited roles. Confirm `has_table_privilege(...,'TRUNCATE')=false` for both on `public.user_roles` after separately approved remediation; never issue an actual TRUNCATE. Test RLS cross-user reads and writes with distinct real auth identities, not only unit-test mocks. For SECURITY DEFINER functions verify `auth.uid()` identity, fixed `search_path`, least-privilege EXECUTE grants and audit logging.

**Private media acceptance:** Verify owner-specific object paths, Storage RLS, MIME/header/size validation, denied public listing and signed URL issuance, denial after suspension, and no cross-account reads. Resume bytes remain quarantined until a trusted independent scanner attests a clean hash; browser-side PDF/DOCX preflight is not malware scanning. Keep resume and private-photo feature flags OFF until these checks pass.

**Release boundary:** GitHub Pages CI success proves only code checks, not Supabase acceptance. Teacher-only Vite beta entry points are not proof of deployment to `krishansir.online`. Production migration, flag activation and publication each require their own explicit authorization; no billable services or additional spend are permitted (₹0).
