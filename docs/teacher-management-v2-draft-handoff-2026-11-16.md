# Teacher Management v2 draft handoff — 16 November 2026

PR: https://github.com/tcoe96096/krishansironline/pull/109
Branch: `feature/smart-result-hub-stage-a-20261115`

This is a code-complete draft for the implemented paths below, **not an activated or fully accepted v2 service**. No SQL migration, storage activation, service deployment, frontend deployment, publication or merge was performed. PR remains Draft. Live security/concurrency acceptance is blocked by the owner's explicit activation restriction.

## What exists and what works

| Area | Current Preview | New draft code |
| --- | --- | --- |
| Registration | Existing primary class/subject enrollment remains active | Atomic profile + multiple qualifications + requested scopes, save/submit/withdraw; reviewed and submitted profiles locked |
| Employee identity | Legacy enrollment has no v2 Employee ID | Super Admin review checks revision and independent identity verification; approval atomically issues unique ID and explicit assignments |
| Teacher dashboard | Existing account and material workspace retained | Server profile, verified status, qualifications, Employee ID, assignments and read-only aggregate results |
| Super Admin | Existing enrollment review retained | Searchable directory, 25 records/page, review, independent verification, assignment grant/revoke, suspension and last 100 audit events |
| Study Materials | Existing scoped authoring and publication boundary retained | Review-only policy replacement enforces fresh class + subject + work scope for v2 profiles, with legacy fallback only for users without v2 profiles |
| Results | Existing private student Results remain unchanged | Scoped aggregate count/average review; no student identity, answer keys, result editing, delivery or publication grant |
| Resume | No v2 storage activated | Private upload/download service code, bounded body, filename/type validation, cooldown, scanner receipt, revision-locked attachment; UI flag defaults off |
| Audits/revocation | Existing legacy audit remains | Default-deny tables; server-only audit writes; assignment revocation and profile suspension; suspension also disables legacy grant |

`assessment.draft` is a recorded assignment preference only; it does not grant existing test authoring APIs. A separate secure assessment adapter would be needed to make that work type executable. Previously approved legacy teachers are not silently backfilled or assigned employee IDs.

## Inspected before implementation

Only isolated Preview `krishan-sir-lms-preview` (`zgpkmfqioqvincmgyfpi`) was read. Public table inventory confirmed no v2 profile/qualification/assignment/resume tables. Read-only catalog queries inspected the existing database-backed `is_super_admin()` and study-material policies. Existing code and SQL proposals were reviewed. A duplicated schema tail after `COMMIT` and over-escaped email/path checks were corrected. Production was not queried or changed.

No migration was executed, even locally. SQL parser checks do not establish database runtime correctness.

## Validation completed

- `npm test`: **48 passed**, zero failed (legacy unit tests, validation, RPC contract tests and static security checks).
- `npm run lint`: passed.
- `npm run build`: passed; existing Vite config/chunk-size warnings remain.
- `deno test --node-modules-dir=auto --allow-env supabase/functions/teacher-resume/index.test.ts`: **6 passed**, zero failed. Mocked API tests cover origin/auth, oversized body, executable extension, absent scanner, verified scanner receipt and denied download. No live storage writes.
- `scripts/teacher-management-smoke.mjs`: passed with synthetic session and intercepted mock APIs. Covers mobile profile/qualifications/scopes, failed save, submission lock, withdrawal, inactive backend, upload gate, ordinary Admin boundary, Super Admin verification/approval and suspension.
- Existing `scripts/smart-result-smoke.mjs`: passed (14 reported checks).
- Existing `scripts/visual-studio-smoke.mjs`: passed (14 reported checks).
- `scripts/parse-teacher-sql.py` with `pglast==8.8`: all **7** review-only SQL files parse, including PL/pgSQL bodies; no database execution.
- `git diff --check`: passed.
- New no-deploy CI workflow repeats unit, build, SQL parse, resume-service and mocked browser checks. Remote CI status is separate from local evidence.

## Review-only SQL bundle order

All files remain under `docs/proposed-migrations/`, outside automatic migrations:

1. `teacher_management_v2_schema_REVIEW_ONLY.sql`
2. `teacher_management_v2_profile_rpc_REVIEW_ONLY.sql`
3. `teacher_management_v2_functions_REVIEW_ONLY.sql`
4. `teacher_management_v2_lifecycle_REVIEW_ONLY.sql`
5. `teacher_management_v2_integration_REVIEW_ONLY.sql`
6. `teacher_management_v2_resume_REVIEW_ONLY.sql`
7. `teacher_management_v2_acceptance_REVIEW_ONLY.sql` — rollback-only fixture tests, **not executed**.

Do not execute any part without separate owner approval. Review bundle atomicity and rollback before activation. Helpers are intentionally not independently client-executable; only allowlisted user RPCs and the own-assignment boolean are granted. Resume reservation/finalization are service-role-only. Existing publisher and result-edit permissions are not widened.

## Remaining blockers and owner checklist

- [ ] Independent SQL/security review and explicit authorization to activate the complete bundle **in isolated Preview only**.
- [ ] Execute rollback-only acceptance tests and additional direct RLS tests for anonymous, two teachers, ordinary Admin and Super Admin; prove material writes and result/publication denials. Parser and mock tests are not substitutes.
- [ ] Run concurrent approval/edit/upload, employee-ID collision, audit immutability and revocation tests against the activated database.
- [ ] Approve private `teacher-resumes-private` bucket with no client read/write policies, size/MIME limits, retention cleanup, and an owner-approved scanner for personal documents. Configure the scanner contract documented in `supabase/functions/teacher-resume/README.md`; the scanner service itself is not included.
- [ ] Separately approve resume service deployment, configure exact CORS origin and server-only secrets, validate genuine PDF/DOCX, malformed/archive-bomb/encrypted/malware samples, stale uploads and cleanup. Enable `VITE_TEACHER_RESUME_ENABLED=true` only after these pass.
- [ ] Review legacy teacher transition/backfill and dual legacy/v2 enrollment behavior before enabling policies. No automatic backfill is supplied. Review account deletion and audit/document retention.
- [ ] Triage existing Preview security advisor findings: 18 authenticated SECURITY DEFINER entry points, 3 default-deny RLS tables with no policies, and leaked-password protection disabled. These are existing findings, not proof of exploitability. References: [SECURITY DEFINER advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- [ ] Review exact-head remote CI; separately authorize Preview frontend deployment and perform real Google OAuth and multi-account browser UAT, including private resume review and desktop/mobile behavior.
- [ ] Only after UAT, request distinct owner approval for Production migration/storage/deployment/publication and merge. Keep PR Draft until then.
