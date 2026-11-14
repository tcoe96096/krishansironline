drop policy if exists "students read own attempts" on public.test_attempts;
revoke all on function public.audit_student_profile_admin_change() from public, anon, authenticated;