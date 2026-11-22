# Preview user_roles privilege audit — 2026-11-22

Read-only inspection of Supabase Preview `zgpkmfqioqvincmgyfpi`.

- `public.user_roles`: RLS enabled.
- Authenticated direct INSERT: **denied**.
- Authenticated direct UPDATE: **denied**.
- Authenticated direct DELETE: **denied**.
- The only visible `user_roles` RLS policy is SELECT: `users read own role`, constrained to `user_id=auth.uid()` or `is_admin()`.
- Existing `public.is_super_admin()` reads `public.user_roles` and checks `auth.uid()` plus the `super_admin` role.
- Existing SECURITY DEFINER functions mentioning `user_roles`: `is_admin`, `is_super_admin`, `review_teacher_enrollment`, `set_student_deletion_deadline`, `submit_teacher_enrollment`. The query only identifies references; it does not prove all authorization paths safe.

**Finding:** Direct authenticated table writes cannot self-assign a privileged role. Privileged RPC/trigger and service-role paths remain separate review gates. No database changes were made.
