-- REVIEW ONLY. This proposal MUST NOT be run on Production.
-- Separate owner approval + isolated Preview RLS/authorization tests required.
-- Personalized result delivery for a single authenticated student.
-- Unlike class-wide student_notifications, these records never fan out to classmates.

begin;

create table if not exists public.result_delivery_notices (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  sent_by uuid not null references auth.users(id),
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  unique (attempt_id, student_id)
);
create index if not exists result_delivery_student_time
  on public.result_delivery_notices (student_id, sent_at desc);

create table if not exists public.result_delivery_audit (
  id bigint generated always as identity primary key,
  attempt_id uuid not null,
  student_id uuid not null,
  sent_by uuid not null,
  event text not null default 'SENT' check (event = 'SENT'),
  created_at timestamptz not null default now()
);

alter table public.result_delivery_notices enable row level security;
alter table public.result_delivery_audit enable row level security;

revoke all on table public.result_delivery_notices from public, anon, authenticated;
revoke all on table public.result_delivery_audit from public, anon, authenticated;
revoke all on sequence public.result_delivery_audit_id_seq from public, anon, authenticated;
grant select on table public.result_delivery_notices to authenticated;
grant update (read_at) on table public.result_delivery_notices to authenticated;
grant select on table public.result_delivery_audit to authenticated;

drop policy if exists "Result delivery visible only to recipient or super admin" on public.result_delivery_notices;
create policy "Result delivery visible only to recipient or super admin"
  on public.result_delivery_notices for select to authenticated
  using ((student_id = (select auth.uid()) and public.student_account_is_eligible((select auth.uid())))
    or (select public.is_super_admin()));

drop policy if exists "Students mark own result delivery read" on public.result_delivery_notices;
create policy "Students mark own result delivery read"
  on public.result_delivery_notices for update to authenticated
  using (student_id = (select auth.uid()) and public.student_account_is_eligible((select auth.uid())))
  with check (student_id = (select auth.uid()) and public.student_account_is_eligible((select auth.uid())));

drop policy if exists "Only super admin reads delivery audit" on public.result_delivery_audit;
create policy "Only super admin reads delivery audit"
  on public.result_delivery_audit for select to authenticated
  using ((select public.is_super_admin()));

-- Function is the ONLY sender. No direct INSERT/DELETE permissions for browsers.
-- A Super Admin approves recipient and submitted status inside the database.
create or replace function public.send_result_to_student(p_attempt_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_student uuid;
  v_status text;
  v_notice_id uuid;
begin
  if v_actor is null or not public.is_super_admin() then
    raise exception 'Super Admin approval required' using errcode = '42501';
  end if;
  select a.student_id, a.status into v_student,v_status
    from public.test_attempts a where a.id = p_attempt_id;
  if not found then raise exception 'Result attempt not found'; end if;
  if v_status is distinct from 'submitted' then
    raise exception 'An unfinished result cannot be delivered';
  end if;
  if not public.student_account_is_eligible(v_student) then
    raise exception 'Recipient account is inactive';
  end if;
  insert into public.result_delivery_notices (attempt_id,student_id,sent_by)
    values (p_attempt_id,v_student,v_actor)
    on conflict (attempt_id,student_id) do update
       set sent_by = excluded.sent_by, sent_at = now(), read_at = null
    returning id into v_notice_id;
  insert into public.result_delivery_audit (attempt_id,student_id,sent_by)
    values (p_attempt_id,v_student,v_actor);
  return v_notice_id;
end;
$function$;

revoke all on function public.send_result_to_student(uuid) from public, anon;
grant execute on function public.send_result_to_student(uuid) to authenticated;

commit;

-- REQUIRED preview test cases before migration activation:
-- A) Anonymous/student/teacher/ordinary admin cannot call send_result_to_student.
-- B) Verified Super Admin can send only submitted attempts to eligible students.
-- C) Student A can read only their notices, never B's result, even if UUID guessed.
-- D) Student can update read_at but not student_id, attempt_id, sent_by, or sent_at.
-- E) Duplicate sends are idempotent for inbox and logged append-only to audit.
-- F) Student notifications are not class-wide. No marks, student names or emails in links.
-- G) Pending release/embargo for formal exams must be enforced BEFORE activation.
-- H) Cleanup/purge and recovery rules must be integrated with student lifecycle.
