-- Harden student identity fields: students may read their own profile but
-- cannot change class, roll number, school, or name through the browser API.
-- Profile provisioning is performed by the auth.users trigger (migration 0002).
drop policy if exists "student inserts own profile" on public.student_profiles;
drop policy if exists "student updates own profile" on public.student_profiles;

revoke insert, update on public.student_profiles from anon, authenticated;
grant select, insert, update, delete on public.student_profiles to authenticated;

-- Only admins may manage student profile records after registration.
drop policy if exists "admins manage profiles" on public.student_profiles;
create policy "admins manage profiles"
  on public.student_profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Students must not directly insert or modify attempt records or their scores.
revoke insert, update, delete on public.test_attempts from anon, authenticated;
grant select on public.test_attempts to authenticated;

-- Ensure only published tests can be read by unauthenticated visitors.
drop policy if exists "published tests are readable" on public.tests;
create policy "published tests are readable"
  on public.tests for select to anon, authenticated
  using (is_published = true or (auth.uid() is not null and public.is_admin()));

-- Answer keys remain inaccessible to browser roles; server-side RPCs own grading.
revoke all on public.test_answer_keys from anon, authenticated;
