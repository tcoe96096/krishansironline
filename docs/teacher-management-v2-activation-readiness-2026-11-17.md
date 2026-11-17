# KSOL Teacher Management v2 — Preview SQL Activation Preflight (2026-11-17)

**Status: HOLD — read-only preflight completed; SQL NOT executed.**
**Target:** Supabase Preview `krishan-sir-lms-preview` (`zgpkmfqioqvincmgyfpi`).
**Forbidden target:** Production `vsqwlkqqsxcehvdsdbna`.
**Code:** isolated Draft PR #111, branch `feature/teacher-core-beta-isolated-20261117`.

## Current read-only evidence

- The Preview project reports `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- `public.teacher_profiles` and `public.teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer)` are **absent**, so the v2 registration service is **not live**.
- A Preview migrations listing contains only pre-v2 database changes through the result-card publisher migration (2026-11-15); no Teacher v2 migration appears.
- Current `public.user_roles` privileges, checked by `has_table_privilege`: **both** `anon` and `authenticated` have `TRUNCATE`, `TRIGGER`, and `REFERENCES` privileges. This is a critical authorization review finding. The role-grants hardening proposal remains `REVIEW_ONLY` and has **not** been run.
- Supabase Security Advisor reported 18 warnings for authenticated-executable SECURITY DEFINER RPCs and one leaked-password-protection warning. These are **existing observations**, not necessarily defects in all warned functions; each must be reviewed in context.
- Supabase project branches listing is empty. That is **not** backup verification.
- Supabase organization reports **Free tier**. The current [Supabase Database Backups documentation](https://supabase.com/docs/guides/platform/backups) states automatic daily backups are for Pro/Team/Enterprise projects; Free tier projects should regularly export database dumps with the Supabase CLI and store copies off-site. **Do not assume Supabase-managed automatic/PITR recovery exists on this Preview project.**
- The Library currently contains restore scripts and failed restore logs, not a verified complete successful restore of the current Preview database. The restore source's table/data state may also be older than the database's present state.
- Local recovery evidence supplied earlier: a backup archive's TOC was readable (860 entries, created 2026-11-17 12:23:32), but no successful isolated restore has been verified. `ksol-restore-verification-summary.txt` recorded restore exit code **1** and local password authentication failures. The latest available dependency restore log `dependency-ksol_app_check_8570_6464.log` stopped at `function auth.uid() does not exist` while reconstructing `public.result_staff_grants`. Such a partial local restore does **not** certify recovery. None of these files establishes a recent restorable backup of the current Preview state.

## Non-negotiable prerequisites before any Preview SQL write

1. Verify a current **Preview-specific** restorable backup or an independently tested complete recovery method, with evidence of a successful restore and application-level checks. A valid archive TOC alone is insufficient. Confirm the restore source matches the present Preview state.
2. Resolve or explicitly review the `user_roles` direct `TRUNCATE`, `TRIGGER`, and `REFERENCES` grants and confirm there is no authorization bypass. Review the separate hardening proposal without broadening role-mutation access.
3. Review migration dependency order, object/constraint collisions, function ownership, `SECURITY DEFINER` search paths, `PUBLIC` / `anon` / `authenticated` EXECUTE, RLS policies, legacy staff grant transition and feature flag defaults.
4. Validate rollback/recovery with realistic auth, table and RPC dependencies; **never** disable or delete student/production data as a shortcut.
5. Require a separate target-specific owner release decision **after** the verified recovery and security gates.

## Candidate staged Preview activation sequence (NOT AUTHORIZATION TO RUN)

1. Freeze and inventory current Preview schema/privileges and record a successful recovery point.
2. Independently review `teacher_management_v2_schema_REVIEW_ONLY.sql`, `teacher_management_v2_beta_flags_REVIEW_ONLY.sql`, `teacher_management_v2_profile_rpc_REVIEW_ONLY.sql`, `teacher_management_v2_functions_REVIEW_ONLY.sql`, `teacher_management_v2_lifecycle_REVIEW_ONLY.sql`; evaluate the role-grants hardening script separately. Installation order: schema → beta_flags → profile_rpc → functions → lifecycle.
3. Review `teacher_management_v2_integration_REVIEW_ONLY.sql` separately: it changes five existing material RLS policies and is **not** needed for a registration-only launch. Do not replace existing authoring policies as part of a minimal beta by default.
4. Verify privileged/anonymous/ordinary teacher identity tests, staff legacy migration, Employee ID issuance, scope authorization, duplicate requests, withdraw/re-review/suspend/restore and negative RLS tests **before** enabling registration.
5. Enable only the approved server-side `registration` feature flag after successful Preview-only activation and runtime tests. Keep materials, resume uploads, result analytics and advanced assignments **OFF**.
6. Do not deploy the public site, merge Draft PR #111 or make Production changes without a separate verified release decision.

## Automated checks versus reality

GitHub Website Build, Preview Build and isolated Teacher Core Beta synthetic browser tests pass on code at `a51590532bbd7bde2e616a9f37a6bcf558b806d8`. These validate compiled code, static SQL and mock API behavior; **they do not establish a successful database migration, real Supabase permission acceptance, or disaster recovery**.

**Current action:** preserve the Draft PR and work on code-only readiness, not SQL execution or a claim that activation succeeded.

## Follow-up read-only ACL investigation (2026-11-17)

- A read-only `pg_catalog.aclexplode` query on **Preview only** confirms the `public.user_roles` `TRUNCATE`, `TRIGGER`, and `REFERENCES` grants are **direct grants** to each of `anon` and `authenticated` (not inherited from `PUBLIC` in this table ACL). `postgres` and `service_role` also carry those privileges.
- The separate draft `REVOKE TRUNCATE, TRIGGER, REFERENCES ... FROM anon, authenticated` is therefore directed at the observed grant sources. Its built-in post-REVOKE `has_table_privilege` checks remain mandatory to detect other effective inherited privileges. **No SQL was executed to modify privileges.**
- Supplied a simplified single-file Windows `.cmd` local test kit (`KSOL-Recovery-OneFile.zip`) with no separate PowerShell script. It restores the authentic archived `auth.uid()` into a new standalone local test database before the limited application-schema restore. This still cannot verify all Supabase-managed services and is not authorization to run a Preview migration.
