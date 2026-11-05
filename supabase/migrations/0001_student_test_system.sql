-- Krishan Sir Online Learning Portal
-- Student authentication, private test keys, controlled attempts and results.
-- Apply in Supabase SQL Editor or through Supabase CLI migrations.

create extension if not exists pgcrypto;

create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  student_name text not null,
  class_level text not null check (class_level in ('6','7','8','9','10','11','12')),
  roll_no text not null,
  school_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_level, roll_no, school_name)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.tests (
  id text primary key,
  title jsonb not null,
  class_level text not null check (class_level in ('6','7','8','9','10','11','12')),
  subject text not null,
  chapter text not null default '',
  duration_minutes integer not null check (duration_minutes > 0),
  total_marks numeric(8,2) not null check (total_marks > 0),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  attempt_limit integer not null check (attempt_limit >= 1),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Answer keys are deliberately isolated from all student-readable tables.
create table if not exists public.test_answer_keys (
  test_id text primary key references public.tests(id) on delete cascade,
  answer_key jsonb not null check (jsonb_typeof(answer_key) = 'array'),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null references public.tests(id) on delete restrict,
  attempt_number integer not null check (attempt_number >= 1),
  status text not null default 'in_progress'
    check (status in ('in_progress','submitted','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  answers jsonb,
  score numeric(8,2),
  total_marks numeric(8,2),
  percentage numeric(6,2),
  correct_count integer,
  attempted_count integer,
  unique (student_id, test_id, attempt_number)
);

create index if not exists test_attempts_student_idx
  on public.test_attempts(student_id, started_at desc);
create index if not exists test_attempts_test_idx
  on public.test_attempts(test_id, started_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

alter table public.student_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.tests enable row level security;
alter table public.test_answer_keys enable row level security;
alter table public.test_attempts enable row level security;

drop policy if exists "student reads own profile" on public.student_profiles;
create policy "student reads own profile"
  on public.student_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "student inserts own profile" on public.student_profiles;
create policy "student inserts own profile"
  on public.student_profiles for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "student updates own profile" on public.student_profiles;
create policy "student updates own profile"
  on public.student_profiles for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "admins manage profiles" on public.student_profiles;
create policy "admins manage profiles"
  on public.student_profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users read own role" on public.user_roles;
create policy "users read own role"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "published tests are readable" on public.tests;
create policy "published tests are readable"
  on public.tests for select to anon, authenticated
  using (is_published = true or (auth.uid() is not null and public.is_admin()));

drop policy if exists "admins manage tests" on public.tests;
create policy "admins manage tests"
  on public.tests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- No student SELECT/INSERT/UPDATE/DELETE policy is intentionally defined
-- for test_answer_keys. Only trusted security-definer RPCs can read it.
drop policy if exists "students read own attempts" on public.test_attempts;
create policy "students read own attempts"
  on public.test_attempts for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists "admins manage attempts" on public.test_attempts;
create policy "admins manage attempts"
  on public.test_attempts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Start an attempt atomically and enforce the admin-configured attempt limit.
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
  from public.student_profiles where user_id = auth.uid();
  if not found then raise exception 'Complete your student profile first'; end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || ':' || p_test_id));

  select * into v_test from public.tests
  where id = p_test_id and is_published = true;
  if not found then raise exception 'Test is not available'; end if;

  if v_profile.class_level <> v_test.class_level then
    raise exception 'This test is not assigned to your class';
  end if;

  select * into v_attempt from public.test_attempts
  where student_id = auth.uid() and test_id = p_test_id
    and status = 'in_progress' and expires_at > now()
  order by attempt_number desc limit 1;
  if found then return v_attempt; end if;

  select count(*) into v_count from public.test_attempts
  where student_id = auth.uid() and test_id = p_test_id;

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

-- Grade on the server. The browser submits selected option indexes only.
create or replace function public.submit_test_attempt(
  p_attempt_id uuid,
  p_answers jsonb
)
returns public.test_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.test_attempts%rowtype;
  v_test public.tests%rowtype;
  v_key jsonb;
  v_count integer;
  v_correct integer := 0;
  v_attempted integer := 0;
  v_score numeric(8,2);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers must be a JSON object';
  end if;

  select * into v_attempt from public.test_attempts
  where id = p_attempt_id and student_id = auth.uid()
  for update;
  if not found then raise exception 'Attempt not found'; end if;
  if v_attempt.status <> 'in_progress' then raise exception 'Attempt already submitted'; end if;
  if now() > v_attempt.expires_at then
    update public.test_attempts set status = 'expired'
    where id = p_attempt_id returning * into v_attempt;
    return v_attempt;
  end if;

  select * into v_test from public.tests where id = v_attempt.test_id;
  select answer_key into v_key from public.test_answer_keys where test_id = v_attempt.test_id;
  if v_key is null then raise exception 'Answer key is not configured'; end if;

  v_count := jsonb_array_length(v_key);
  select count(*) into v_attempted
  from jsonb_each(p_answers) a
  where a.value is not null and a.value <> 'null'::jsonb;

  select count(*) into v_correct
  from jsonb_each(p_answers) a
  where a.key ~ '^[0-9]+$'
    and (a.key::integer) >= 0 and (a.key::integer) < v_count
    and jsonb_typeof(a.value) = 'number'
    and (v_key -> (a.key::integer)) = a.value;

  v_score := case when v_count > 0
    then round((v_test.total_marks * v_correct::numeric) / v_count, 2)
    else 0 end;

  update public.test_attempts set
    status = 'submitted',
    submitted_at = now(),
    answers = p_answers,
    score = v_score,
    total_marks = v_test.total_marks,
    percentage = round((v_score / v_test.total_marks) * 100, 2),
    correct_count = v_correct,
    attempted_count = least(v_attempted, v_count)
  where id = p_attempt_id
  returning * into v_attempt;

  return v_attempt;
end;
$$;

revoke all on function public.start_test_attempt(text) from public;
revoke all on function public.submit_test_attempt(uuid, jsonb) from public;
grant execute on function public.start_test_attempt(text) to authenticated;
grant execute on function public.submit_test_attempt(uuid, jsonb) to authenticated;

grant select, insert, update on public.student_profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.tests to anon, authenticated;
grant select on public.test_attempts to authenticated;
grant insert, update, delete on public.tests to authenticated;
grant all on public.test_answer_keys to service_role;
