# KSOL Teacher v2 — launch readiness evidence (22 November 2026)

**Release state: NO-GO. This document is not approval to merge, apply SQL, or publish.**

## Verified implementation and non-production tests

- Draft PR #128: https://github.com/tcoe96096/krishansironline/pull/128
- Verified green CI #14: https://github.com/tcoe96096/krishansironline/actions/runs/45003996108
- CI #14: 118/118 Teacher tests passed; TypeScript, main website build, Teacher SQL parse-only checks, disabled isolated Teacher portal build, and unified-preview artifact assembly passed.
- Review-only (not hosted) artifact: https://github.com/tcoe96096/krishansironline/actions/runs/45003996108/artifacts/14746679426
- Artifact was built with synthetic Supabase URL/key and ALL Teacher capabilities disabled; it does not demonstrate live login, SQL installation, OAuth or RLS.
- Separate browser smoke testing is being added to PR #128; verify its final GitHub Actions result before release consideration.

## Database targets — externally checked, no mutations

- Preview: `zgpkmfqioqvincmgyfpi` (`krishan-sir-lms-preview`) is ACTIVE_HEALTHY.
- Production: `vsqwlkqqsxcehvdsdbna` (`krishan-sir-lms`) is ACTIVE_HEALTHY. Verify that GitHub Pages deployment variables really point to the intended target before **any** production operation; repository variables are not attested by this report.
- Both targets currently lack the v2 `teacher_profiles`, `teacher_assignments` and `teacher_identity_verifications` tables.
- Preview contains legacy `teacher_enrollment_requests`, `study_material_items`, `result_staff_grants`, and `user_roles`.
- Preview `anon` and `authenticated` have effective TRUNCATE, TRIGGER and REFERENCES on `public.user_roles`, granted directly by `postgres`; this is a security blocker. Production `anon`/`authenticated` TRUNCATE was observed **false**.
- A proposed minimum-privilege REVOKE is in `docs/proposed-migrations/teacher_management_v2_role_grants_hardening_REVIEW_ONLY.sql`; not executed.
- Read-only Preview activation catalog preflight found missing v2 tables/RPCs and unsafe TRUNCATE grants. Some optional photo/resume checks are also blocked, but **optional media is not part of Core Beta**.

## Core Beta preconditions — ALL required before live release

1. **Recovery:** record independently confirmed managed restore point, or a logical backup successfully restored into a separate disposable database with row-count, schema, role, auth and storage reconciliation. Synthetic manifest tests are not recovery proof.
2. **Security preflight:** verify SQL against current Preview catalog and evaluate security-definer owner, PUBLIC/anon/authenticated EXECUTE grants, overloads, effective table privileges, legacy grant transitions and full Study Materials policy effects. Review and separately authorize Preview `user_roles` hardening.
3. **Preview migration:** apply only reviewed and approved files to the **isolated Preview** project after (1) and (2), record migration hashes, operator, migration order and rollback evidence. No automatic migration of legacy/demo teachers; no student/admin deletion.
4. **Real role tests:** run positive/negative RLS/RPC tests using independent anon, applicant, other teacher, Admin and Super Admin sessions. Verify cross-account privacy, revision races, independent identity evidence, unique Employee ID, multiple assignments, suspension/revocation, and legacy fallback denial.
5. **Preview user journey:** verify Google login/callback, teacher registration, submit/withdraw, independent Admin review, approved dashboard, multiple class/subject assignment, and student/admin regressions. Use safe synthetic identities. Keep resume, photos, analytics and advanced assessment disabled unless individually verified and approved.
6. **Release isolation:** PR #128 targets a feature branch, not `main`. A read-only comparison found 113 commits / 51 changed files between `main` and PR head at the time checked. Review the complete deployment diff and select an independently reviewed minimal Teacher release; **do not blindly merge the accumulated feature branch**.
7. **Production release:** verify exact GitHub Pages `main` release SHA, Supabase production project binding, scoped DB recovery and rollback procedure, GitHub Actions checks, and explicit owner approval for the specific production migration + merge/deployment. GitHub Pages is the deployment host; Cloudflare is DNS only. Keep PR #109 independent and read-only.

**Current blockers:** verified Preview restore is missing, Preview v2 SQL is not installed, effective privilege hardening is pending, real RLS/OAuth/UAT acceptance is absent, and a production-specific GitHub Pages release has not been approved. CI/mock browser tests alone are not proof of database safety.

**No SQL migration, security REVOKE, merge, production feature activation, or website deployment was executed as part of this readiness review.**
