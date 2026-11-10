-- Restrict public API execution of test-system SECURITY DEFINER functions.
-- Trigger-only functions are invoked by PostgreSQL triggers and must not be
-- directly callable through PostgREST. is_admin remains callable by signed-in
-- users because RLS policies use it, but must not be callable by anon/public.

begin;

do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'revoke all on function public.handle_new_user() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.handle_new_student_profile()') is not null then
    execute 'revoke all on function public.handle_new_student_profile() from public, anon, authenticated';
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

  if to_regprocedure('public.is_admin()') is not null then
    execute 'revoke all on function public.is_admin() from public, anon';
    execute 'grant execute on function public.is_admin() to authenticated';
  end if;

  if to_regprocedure('public.start_test_attempt(text)') is not null then
    execute 'revoke all on function public.start_test_attempt(text) from public, anon';
    execute 'grant execute on function public.start_test_attempt(text) to authenticated';
  end if;

  if to_regprocedure('public.submit_test_attempt(uuid,jsonb)') is not null then
    execute 'revoke all on function public.submit_test_attempt(uuid,jsonb) from public, anon';
    execute 'grant execute on function public.submit_test_attempt(uuid,jsonb) to authenticated';
  end if;
end
$$;

commit;
