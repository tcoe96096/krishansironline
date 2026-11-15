# Isolated Preview Backend Activation and Acceptance — 15 November 2026

## Environment boundary
- **Applied ONLY to Supabase project `krishan-sir-lms-preview` (`zgpkmfqioqvincmgyfpi`).**
- Production `krishan-sir-lms` (`vsqwlkqqsxcehvdsdbna`) was NOT modified.
- The site `main` branch was NOT pushed or merged.
- Five new backend migrations are not installed on Production.
- This work was authorized by the owner for necessary Preview-only registration, permissions, material and report integration testing.
- All acceptance-test data writes below ran in `BEGIN ... ROLLBACK` transactions: no dummy Teacher, Student, Material, Score, Notification or Report Template was left in the database.

## Applied migration sequence (Preview ONLY)

1. `preview_result_staff_scoped_grants_20261115`: scoped grants, server-verified Super Admin-only assignment and audit.
2. `preview_study_material_scoped_authoring_20261115`: class-limited materials, drafts, review, approved public library and audit.
3. `preview_teacher_enrollment_audited_requests_20261115`: teacher self-application, status, withdrawal and server-only Super Admin approve/reject RPC.
4. `preview_student_private_result_delivery_20261115`: recipient-only result inbox, verified Super Admin send RPC, read receipt and audit.
5. `preview_global_result_card_publisher_v2_20261115`: central branded Card Template with published-only read, Super Admin publishing reason, version and audit.

The first attempt to apply global publisher SQL was rejected due to a PL/pgSQL syntax issue. The migration transaction did not complete. Its reviewed SQL was simplified and the successful **v2** migration was then applied; see current `docs/proposed-migrations/result_card_central_template_review_only.sql`.

The original proposal files remain in `docs/proposed-migrations/` (outside `supabase/migrations/`) because they are **NOT authorization to automatically migrate Production**. They are the source design and revision record. Migration history exists for the Preview project only.

## Rollback-only acceptance tests performed
- Baseline: authenticated role with no JWT saw **zero** staff, teacher request and delivery rows; Super Admin capability false.
- Ordinary Admin with no Super Admin row: Super Admin capability false; globally publishing unavailable.
- Student without delegated role cannot directly call **publish_result_card_template**, **review_teacher_enrollment**, or **send_result_to_student**: all three return permission errors.
- A signed-in unprivileged student submits Teacher application: row visible as pending, **no staff grant created**.
- Preview Super Admin approves a pending Teacher: a **class 10**, teacher-only grant appears, with exactly the required Material Draft, Read and Review Request capabilities. Teacher is not a Super Admin.
- Teacher creates a class 10 Material Draft: success. Attempt to create a class 9 Draft: denied. Teacher sends own draft for approval: success. Attempt to self-publish: denied. Super Admin publishes with review reason: success. Three Material audit events recorded in rolled-back test.
- Super Admin publishes a safe, design-only Global Card Template with reason and version: student can see the published style, **not** the private template audit.
- Super Admin sends a submitted, eligible result to the corresponding student: student sees one private notification and marks it read successfully. Neither result scores nor student identity are included in a shareable URL.
- Final database read verified **zero** durable Teacher Applications, Grants, Materials, Result Inbox Notices, and Global Card Templates. Existing eight Preview student profiles and eight test attempts remained in place.
- Real Preview role revocation was simulated: after Super Admin changed the grant to inactive, Teacher class-scoped INSERT was denied immediately, with no surviving active grant.
- Two-student isolation was simulated using separate signed-in JWT claims in a rolled-back transaction: the recipient could see their own submitted attempt and private inbox; another student could not.
- Direct API privileges checked: authenticated users may call Teacher application and review RPCs but unauthenticated `anon` may not; authenticated clients cannot INSERT teacher requests directly. These endpoints still independently enforce their own actor/role rules.
- PostgREST schema cache reload was requested after the reviewed Preview migrations to expose the new RPCs/tables to the Data API.

## Frontend integration
Draft PR #109 contains:
- Teacher `/staff-workspace/` Google sign-in, self-application, status, withdrawal, class-scoped authoring and request-review controls.
- Admin `Staff & Permissions` pending teacher approval/rejection, audited role management, revocation controls.
- `Study Materials` approval workflow, controlled publication, links with tests/results.
- `Results & Reports` global design publishing, student-specific digital delivery and read receipts.
- Single Admin **Website Studio** navigation entry, Page Builder and legacy branding tabs, grouped academics/results/people modules, collapsed Planned modules, module search.
- Preview Dashboard uses real database-based Student, Pending Student, Published Test, Material and Pending Teacher counts (no fabricated data).

The newer frontend **is not automatically deployed to Unified Preview** by this database migration. A manual owner-directed Unified Preview workflow deploy of the **exact latest CI-green PR commit** is still needed. Automated browser smoke currently tests an unauthenticated/demo environment; it is not a substitute for authenticating a real Teacher and Super Admin.

## Remaining authenticated acceptance before Production
- Confirm Google Auth redirect allowlist includes the **actual isolated Preview URL** and `/staff-workspace/`; test new Teacher Google login in the browser.
- With test Google Teacher identity: Submit → Admin sees pending → Approve (independently verify identity) → Teacher material draft → review request → publish → student can read.
- Test rejection, withdrawal, permission narrowing, revoked permissions and stale sessions with real JWTs.
- Test Student 1 cannot read Student 2's Results, Inbox or Drafts; test ordinary Admin cannot approve roles or global template.
- Test printable A4 Card and its centrally published design on mobile/desktop; uploaded images are **not globally published** until secure asset storage exists.
- Verify existing Studio Config Publish RPCs and Results permissions after main Admin navigation consolidation.
- Audit preview Auth leaked-password protection and other existing Supabase security advisor notices before Production. The authenticated callable definer RPC warnings must be individually reviewed against server-side Super Admin/ownership guards; never blindly revoke essential public RPCs.
- Final Production migration requires a separate tested rollout plan, backup, explicit approval and rollback rehearsal.

## Advisor guidance
Security and performance advisor outputs reviewed. Relevant official remediation:
- [Authenticated SECURITY DEFINER callable functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Foreign-key indexes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
- [RLS init-plan optimization](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)

**Status:** PREVIEW BACKEND ACTIVATED AND ROLE/ROW TESTED; REAL LOGIN BROWSER UAT AND PRODUCTION APPROVAL OUTSTANDING.
