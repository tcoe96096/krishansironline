# Preview legacy teacher RPC authorization audit — 2026-11-22

Project `zgpkmfqioqvincmgyfpi`. Read-only inspection of `pg_get_functiondef` and function privileges; **no SQL changes**.

| Existing RPC | Authenticated EXECUTE | SECURITY DEFINER | Server-side gate observed |
|---|---|---|---|
| `public.is_super_admin()` | yes | yes | Requires `auth.uid()` and a matching `public.user_roles` row with `role='super_admin'` |
| `public.review_teacher_enrollment(...)` | yes | yes | Requires authenticated caller and `public.is_super_admin()`; review reason length 12–1000 |
| `public.submit_teacher_enrollment(...)` | yes | yes | Requires `auth.uid()`; blocks existing platform role or active delegated grant; requires reason length 12–1000 |

## Compatibility concern
The **legacy** teacher enrollment RPC requires a 12–1000 character application reason, whereas the **new Teacher v2** frontend/client permits an empty reason. These are **different RPC contracts**. Do not route the new UI to `submit_teacher_enrollment` as a fallback. Keep Teacher v2 registration disabled until `teacher_v2_save_application` is deployed, independently tested, and permissioned.

## Remaining review
- Verify `public.user_roles` writes are independently protected against privilege escalation.
- Verify every `SECURITY DEFINER` RPC's authorization logic with distinct authenticated sessions and anonymous access.
- Review legacy-to-v2 migration and privilege boundaries before switching routes.
- Check backup and restore readiness before activation.

No claim of full RLS security or production readiness is made by this static inspection.
