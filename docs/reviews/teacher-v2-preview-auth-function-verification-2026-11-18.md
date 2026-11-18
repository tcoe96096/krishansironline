# Verified Preview function authorization — 2026-11-18

Read-only `pg_proc` / `pg_get_functiondef` audit on Preview `zgpkmfqioqvincmgyfpi`. No writes.

## public.is_super_admin()
- Owner `postgres`; SECURITY DEFINER; `anon` EXECUTE false; `authenticated` EXECUTE true.
- SQL requires `auth.uid() IS NOT NULL` and an exact `public.user_roles` row with matching `user_id=auth.uid()` and `lower(role)='super_admin'`.
- No user-editable JWT metadata is used for this check.
- `search_path='public'` is less restrictive than an empty path; review qualification of all references and default privileges before changes.

## public.review_teacher_enrollment(uuid,text,text)
- Owner `postgres`; SECURITY DEFINER; `anon` EXECUTE false; `authenticated` EXECUTE true; `search_path=''`.
- Rejects missing actor or non-Super-Admin; validates approve/reject, reason length 12–1000; locks pending request; checks for existing platform role and conflicting delegated role.
- Approving writes a `result_staff_grants` teacher grant with **one** `requested_class` mapped to `scope_class` and bounded material permissions; writes request status and audit event.
- This is the legacy scalar-class flow, not the v2 multi-class/multi-subject assignment flow. Do not modify it as part of initial v2 activation without independent compatibility testing.

## Residual risks / tests
- Static checks do not establish that all authenticated users are correctly denied at runtime. Test anonymous, ordinary teacher, another user's account, and Super Admin with actual authenticated sessions.
- Independently validate `user_roles` table grants (notably TRUNCATE), role-write pathways and database-owner trust.
- Do not revoke authenticated EXECUTE from `is_super_admin` or `review_teacher_enrollment` indiscriminately: existing application workflows may rely on them.
- New v2 functions must be separately scoped, reviewed, and granted. Registration remains OFF.

No migration, activation, deployment, or changes to the two existing Class-10 teacher grants.
