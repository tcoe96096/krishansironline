# Preview role-related privileged function and trigger audit — 2026-11-22

Project `zgpkmfqioqvincmgyfpi`. Read-only queries against `pg_trigger` and `pg_get_functiondef`.

- `public.user_roles` has **no non-internal triggers**.
- `public.is_admin()` is SECURITY DEFINER and requires `auth.uid()` plus the caller's `admin` or `super_admin` role from `user_roles`.
- `public.is_super_admin()` likewise checks the caller's `super_admin` role.
- `public.set_student_deletion_deadline()` is a SECURITY DEFINER trigger function; it references `user_roles` to select recovery period for a super admin, and does **not** write `user_roles`.
- Legacy teacher review and submission functions read `user_roles` to protect role boundaries; their detailed code was inspected in the preceding legacy RPC audit.

## Conclusion and limits
The inspected role-related functions do not expose an obvious direct `user_roles` write path. This is **not** a proof that all indirect privilege-escalation paths are absent. Additional checks of grants, auth session behavior, other schemas, and independent-role runtime tests are needed before activation. No Preview or Production SQL mutation occurred.
