-- Restrict direct API execution of trigger-only functions.
-- PostgreSQL invokes trigger functions through their registered triggers; API roles
-- do not need EXECUTE privileges to cause the owning table operation to fire a trigger.
-- Keep public.is_admin() unchanged because RLS policies call it directly.
--
-- This migration intentionally does not alter Supabase-managed event-trigger
-- functions such as public.rls_auto_enable().

do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'revoke all on function public.handle_new_user() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.prevent_role_escalation()') is not null then
    execute 'revoke all on function public.prevent_role_escalation() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.set_student_profile_updated_at()') is not null then
    execute 'revoke all on function public.set_student_profile_updated_at() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;
