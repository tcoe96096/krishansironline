# KSOL Teacher Management v2 — Core Beta deployment plan (REVIEW ONLY)

Status: planning artifact, **not an authorization or deployment record**. The active isolated Teacher Core Beta implementation is PR #111 (Draft); PR #109 is a separate earlier workstream. Production changes require a distinct, explicit owner approval after review of this plan.

## Scope of the first public beta

Enable only after end-to-end verification:
- Google-authenticated teacher registration, profile and qualifications.
- Teacher application submission/withdrawal and Super Admin identity review.
- Unique Employee ID issuance **only after** approved review.
- Multiple class, subject and work-scope assignments with explicit grants/revocation.
- Basic teacher dashboard, server-authorized own profile and assignments.
- Existing Study Materials functionality only where effective permissions have been validated against both legacy and v2 users.

Keep disabled:
- Resume upload/download, private document storage and scanner service.
- Teacher-facing sensitive result analytics (including scoped averages/counts) pending fixed-cohort privacy review and inference testing.
- Assessment/test authoring through the new teacher work preference; it is not an authorization grant.
- Unfinished advanced features, notifications and digital ID card until separately verified.

## Gate A — Recovery and isolation (Preview only)

1. Confirm project identity is isolated Preview `zgpkmfqioqvincmgyfpi`; do not run SQL against Production.
2. Inventory current schema, auth configuration, existing study-material RLS policies, grants, migrations and affected data counts. Capture non-sensitive baseline and checksum/manifest.
3. Verify managed backup/PITR and an actual recoverable restore point **or** an owner-accepted logical backup with a successfully tested restore into a separate disposable database. Do not confuse a backup file with verified recovery.
4. Document backup location, scope (schema, data, roles, auth/storage dependencies), restore command/procedure, tested recovery time, exclusions and named responsible operator. Keep secrets out of Git.
5. If recovery cannot be verified, hold database mutation only; continue independent code review, tests and UI work.

## Gate B — Independent migration/security review

1. Review the six `docs/proposed-migrations/teacher_management_v2_*_REVIEW_ONLY.sql` implementation files in documented order, plus rollback-only acceptance SQL. Ensure each statement's transaction boundary, dependencies, grants and rollback behavior are understood.
2. Diff five existing Study Materials RLS policies before/after; prove legacy teachers retain only intended scopes and approved/suspended v2 teachers cannot fall back to legacy grants.
3. Review SECURITY DEFINER search paths, owner/execute privileges, default-deny RLS, cross-user access, audit immutability, and employee-ID generation.
4. Ensure result summary RPC is not exposed in Core Beta: minimum-five suppression by itself does **not** rule out overlapping-cohort inference. Require fixed reporting cohorts and privacy tests before later enablement.
5. Require explicit approval for isolated Preview execution (previously given only subject to recovery/security preflight). No automatic production migration.

## Gate C — Preview activation and real acceptance

1. Apply reviewed implementation migrations to isolated Preview, not production, with recorded operator, timestamp, ordered migration hashes and results.
2. Execute rollback-only acceptance suite; verify its fixtures do not persist. Run additional direct RLS checks for anonymous, applicant, two teachers, ordinary Admin and Super Admin.
3. Test Google OAuth and callback/origin configuration in real browser; no privilege escalation via client role flags.
4. Test profile revision races, duplicate approval/Employee ID collisions, multi-class and multi-subject assignment grants/revocations, suspension, restoration without revived grants, audit trail and cross-tenant isolation.
5. Verify existing student Results are private and teacher result analytics are unavailable; verify resume endpoints/feature flag are disabled.
6. Verify existing Study Materials publishing permissions are not widened and regression test student/admin journeys.
7. Record pass/fail evidence and exact SHA. Any essential failure blocks beta, not unrelated development.

## Gate D — Production readiness and separate owner decision

Before asking for approval, provide:
- Production project identity, baseline and backup/restore evidence; never assume Preview recovery covers Production.
- Exact reviewed migration files and SHA, migration order, RLS/grant diffs, feature flag defaults and service/deployment targets.
- Release checklist, expected user-facing changes, smoke tests, rollback owner and tested rollback steps.
- Evidence for GitHub checks, Preview live DB acceptance, OAuth, security and browser UAT.
- Explicit list of excluded features and known limitations.

**Stop for owner approval here.** Do not merge PR #111 or PR #109, run Production SQL, enable storage/services, change live feature flags or publish without it.

## Gate E — If and only if approved

1. Take and verify a Production restore point; confirm maintenance window and incident contacts.
2. Apply only owner-approved migrations with audit logs, then deploy the pinned approved frontend SHA and enable minimal beta flags.
3. Run production smoke tests with authorized test accounts (teacher registration, approval, employee ID, multi-assignments, teacher dashboard, material scope, admin boundary and student privacy).
4. If a critical test fails, disable beta entry points immediately and execute the documented recovery/rollback procedure. A code rollback alone does not reverse DB schema/RLS changes.
5. Report deployment SHA, checks, remaining limitations and whether public teacher registration is actually operational.

## Parallel work that must not be blocked

- Review and improve UI accessibility/mobile behavior, error handling, test fixtures and non-deploy CI.
- Prepare fixed-cohort privacy design and tests independently, with result analytics still off.
- Prepare optional resume scanner/retention architecture in draft only.
- Continue Advanced Studio development independently; do not confuse its deployment with KSOL teacher beta.

## Current evidence and unknowns

As of 2026-11-17, isolated PR #111 is Draft. All three PR #111 GitHub checks passed at SHA `08b7fa0510658b782c29a9221a6d6bc19ffe7e82` (website validation, preview build without deployment, and isolated Teacher Core Beta checks). Earlier PR #109 is a separate draft and its historical check results do not establish PR #111 release readiness. Static and mocked tests are **not** real database acceptance. Preview migration and Production deployment are not verified as executed. Managed backup/PITR or tested logical restore evidence is missing. This document does not claim those gates passed.
