-- Mark timed-out in-progress attempts as expired before checking whether
-- a student can resume or start another attempt.
-- This keeps dashboard status accurate while preserving the configured
-- attempt limit: expired attempts still count toward the limit.

create or replace function public.start_test_attempt(p_test_id text)
returns public.test_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_test public.tests%rowtype;
  v_profile public.student_profiles%rowtype;
  v_count integer;
  v_attempt public.test_attempts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile
  from public.student_profiles
  where user_id = auth.uid();
  if not found then
    raise exception 'Complete your student profile first';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || ':' || p_test_id));

  select * into v_test
  from public.tests
  where id = p_test_id and is_published = true;
  if not found then
    raise exception 'Test is not available';
  end if;

  if v_profile.class_level <> v_test.class_level then
    raise exception 'This test is not assigned to your class';
  end if;

  -- Expire any timed-out attempt before checking for a resumable attempt.
  update public.test_attempts
  set status = 'expired'
  where student_id = auth.uid()
    and test_id = p_test_id
    and status = 'in_progress'
    and expires_at <= now();

  select * into v_attempt
  from public.test_attempts
  where student_id = auth.uid()
    and test_id = p_test_id
    and status = 'in_progress'
    and expires_at > now()
  order by attempt_number desc
  limit 1;
  if found then
    return v_attempt;
  end if;

  select count(*) into v_count
  from public.test_attempts
  where student_id = auth.uid()
    and test_id = p_test_id;

  if v_count >= v_test.attempt_limit then
    raise exception 'Attempt limit reached';
  end if;

  insert into public.test_attempts (
    student_id, test_id, attempt_number, expires_at, total_marks
  ) values (
    auth.uid(), p_test_id, v_count + 1,
    now() + make_interval(mins => v_test.duration_minutes),
    v_test.total_marks
  ) returning * into v_attempt;

  return v_attempt;
end;
$$;

revoke all on function public.start_test_attempt(text) from public, anon;
grant execute on function public.start_test_attempt(text) to authenticated;
