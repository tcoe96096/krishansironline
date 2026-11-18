# Teacher v2 RPC authorization review — 18 November 2026

Status: **REVIEW ONLY; NO DATABASE CHANGES OR DEPLOYMENT.**

## Inspected code
- `src/components/TeacherManagementV2.tsx`: UI loads `teacher_v2_beta_capabilities`, `teacher_v2_snapshot`; submits through `saveTeacherApplication`.
- `src/services/teacherManagement.ts`: calls Supabase `.rpc(name,args)` through the teacher client.
- `docs/proposed-migrations/teacher_v2_independent_verification_REVIEW_ONLY.sql`: proposed revision-bound verification table, RLS enabled, no direct public/authenticated table privileges.
- `docs/proposed-migrations/teacher_v2_verification_writer_REVIEW_ONLY.sql`: SECURITY DEFINER writer checks `auth.uid()`, independent Super Admin and matching pending profile revision; revokes general EXECUTE.
- `docs/proposed-migrations/teacher_v2_review_independent_evidence_OVERRIDE_REVIEW_ONLY.sql`: review RPC ignores caller-supplied `p_verified`, checks unrevoked evidence for exact teacher and revision under advisory lock and profile row lock; revokes general EXECUTE.

## Confirmed interpretation
The **legacy** `teacher_enrollment_requests` SELECT-only RLS policy does not prove a defect in the **v2** RPC registration flow. Do not add blanket INSERT grants to legacy enrollment. The local standalone RLS test covers legacy objects, not the proposed v2 RPCs.

## Critical checks before activation
1. Verify complete migration dependency order: schema, feature flags, profile RPC, assignment/employee functions, lifecycle, independent verification table, writer and review override. Review each signature and ensure all referenced relations/functions exist.
2. The review override keeps `p_verified boolean` for call compatibility but deliberately ignores it; verify the frontend and all callers still use the exact signature and cannot call an older overload. Enumerate `pg_proc` overloads and effective EXECUTE privileges.
3. Writer and reviewer functions both use `SECURITY DEFINER SET search_path=''`; verify function owners, schema-qualified references, effective grants and privilege boundaries. No default `PUBLIC` EXECUTE should survive for privileged RPCs.
4. `teacher_identity_verifications` has RLS and direct grants revoked; ensure only the audited writer can record evidence, and ensure the reviewer cannot approve with stale, revoked, cross-user or self-recorded evidence.
5. Ensure reviewer approval cannot be forged by client `p_verified=true`; require real verification evidence and audit accountability. A caller-provided evidence reference alone does not prove real identity checking.
6. Validate legacy grants remain unchanged for existing teachers unless an explicit, approved v2 transition targets that account. The review override deactivates legacy grants for an explicitly approved teacher.
7. Test negative cases: anonymous RPC, ordinary teacher self-approval, ordinary admin approval, stale revision, duplicate concurrent approval, cross-account snapshot, suspended assignment access, unauthorized subject/class/work, and unauthorized material write.
8. Reconcile Preview `user_roles` TRUNCATE exposure before release; never test by executing TRUNCATE.
9. Verify actual Preview recovery/disposable restore and real OAuth/authenticated role tests. The local 61-policy RLS pass is not proof of these gates.

## Release decision
**HOLD**. No Preview SQL, feature activation, legacy policy change, merge or Production deployment. Preserve PR #109 read-only monitoring and PR #113 Draft.
