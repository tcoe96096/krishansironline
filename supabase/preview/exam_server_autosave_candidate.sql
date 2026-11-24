-- Preview candidate. Apply only after review of the deployed exam schema.
-- Opt-in drafts: legacy attempts without a draft keep their existing expiry behavior.
create schema if not exists ksol_exam_private;
revoke all on schema ksol_exam_private from public, anon, authenticated;
alter table public.tests alter column attempt_limit set default 1;

create table if not exists ksol_exam_private.attempt_drafts (
  attempt_id uuid primary key references public.test_attempts(id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  revision bigint not null check (revision > 0),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  answer_key jsonb not null check (jsonb_typeof(answer_key) = 'array'),
  total_marks numeric not null check (total_marks > 0),
  saved_at timestamptz not null
);
alter table ksol_exam_private.attempt_drafts enable row level security;
revoke all on table ksol_exam_private.attempt_drafts from public, anon, authenticated;

create or replace function public.read_test_attempt_draft(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare a public.test_attempts%rowtype; d ksol_exam_private.attempt_drafts%rowtype;
begin
  if auth.uid() is null or not public.student_account_is_eligible(auth.uid()) then raise exception 'Not eligible'; end if;
  select * into a from public.test_attempts where id=p_attempt_id and student_id=auth.uid();
  if not found or a.status <> 'in_progress' or a.expires_at <= clock_timestamp() then raise exception 'No active attempt'; end if;
  select * into d from ksol_exam_private.attempt_drafts where attempt_id=a.id;
  return jsonb_build_object('answers',coalesce(d.answers,'{}'::jsonb),'revision',coalesce(d.revision,0),'saved_at',d.saved_at,'expires_at',a.expires_at,'server_now',clock_timestamp());
end;
$fn$;
revoke all on function public.read_test_attempt_draft(uuid) from public, anon, authenticated;
grant execute on function public.read_test_attempt_draft(uuid) to authenticated;

create or replace function public.save_test_attempt_draft(p_attempt_id uuid, p_answers jsonb, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
  a public.test_attempts%rowtype;
  d ksol_exam_private.attempt_drafts%rowtype;
  t public.tests%rowtype;
  k jsonb; q jsonb; marks numeric; entry record; qi integer; ai integer;
  v_now timestamptz;
begin
  if auth.uid() is null or not public.student_account_is_eligible(auth.uid()) then raise exception 'Not eligible'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers)>1048576 or p_expected_revision is null or p_expected_revision<0 then raise exception 'Invalid draft'; end if;
  select * into a from public.test_attempts where id=p_attempt_id and student_id=auth.uid() for update;
  if not found or a.status <> 'in_progress' or a.expires_at <= clock_timestamp() then raise exception 'No active attempt'; end if;
  select * into d from ksol_exam_private.attempt_drafts where attempt_id=a.id;
  if coalesce(d.revision,0) <> p_expected_revision then
    return jsonb_build_object('conflict',true,'revision',coalesce(d.revision,0),'saved_at',d.saved_at);
  end if;
  if d.revision is null then
    select * into t from public.tests where id=a.test_id;
    select answer_key into k from public.test_answer_keys where test_id=a.test_id;
    q:=t.questions; marks:=t.total_marks;
  else
    q:=d.questions; k:=d.answer_key; marks:=d.total_marks;
  end if;
  if q is null or k is null or jsonb_typeof(q)<>'array' or jsonb_typeof(k)<>'array' or jsonb_array_length(q)<>jsonb_array_length(k) or marks is null or marks<=0 then raise exception 'Test configuration invalid'; end if;
  for entry in select key,value from jsonb_each(p_answers) loop
    if entry.key !~ '^(0|[1-9][0-9]{0,8})$' then raise exception 'Invalid question index'; end if;
    qi:=entry.key::integer;
    if qi>=jsonb_array_length(q) then raise exception 'Invalid question index'; end if;
    if entry.value='null'::jsonb then continue; end if;
    if jsonb_typeof(entry.value)<>'number' or entry.value::text !~ '^(0|[1-9][0-9]{0,8})$' then raise exception 'Invalid option'; end if;
    ai:=entry.value::text::integer;
    if jsonb_typeof(q->qi->'options'->'en') is distinct from 'array' or ai>=jsonb_array_length(q->qi->'options'->'en') then raise exception 'Invalid option'; end if;
  end loop;
  v_now:=clock_timestamp();
  if v_now>=a.expires_at then raise exception 'No active attempt'; end if;
  insert into ksol_exam_private.attempt_drafts(attempt_id,answers,revision,questions,answer_key,total_marks,saved_at)
  values(a.id,p_answers,p_expected_revision+1,q,k,marks,v_now)
  on conflict(attempt_id) do update set answers=excluded.answers,revision=excluded.revision,saved_at=excluded.saved_at
  returning * into d;
  return jsonb_build_object('conflict',false,'revision',d.revision,'saved_at',d.saved_at,'expires_at',a.expires_at,'server_now',clock_timestamp());
end;
$fn$;
revoke all on function public.save_test_attempt_draft(uuid,jsonb,bigint) from public, anon, authenticated;
grant execute on function public.save_test_attempt_draft(uuid,jsonb,bigint) to authenticated;

-- Existing expiry paths (including start and submit RPCs) share the same locked
-- transition. Only server-acknowledged, pre-deadline drafts are eligible.
create or replace function ksol_exam_private.finalize_expiring_attempt()
returns trigger language plpgsql security definer set search_path = ''
as $fn$
declare d ksol_exam_private.attempt_drafts%rowtype;
  v_score numeric; v_correct integer; v_attempted integer;
begin
  if old.status<>'in_progress' or new.status<>'expired' or old.expires_at>clock_timestamp() then return new; end if;
  select * into d from ksol_exam_private.attempt_drafts where attempt_id=old.id;
  if not found or d.saved_at>=old.expires_at or not public.student_account_is_eligible(old.student_id) then return new; end if;
  select count(*) filter(where jsonb_typeof(d.answers->(q.ordinal-1)::text)='number'),
    count(*) filter(where jsonb_typeof(d.answers->(q.ordinal-1)::text)='number' and d.answers->(q.ordinal-1)::text=d.answer_key->(q.ordinal-1)::integer),
    coalesce(sum(coalesce((q.value->>'marks')::numeric,1)) filter(where jsonb_typeof(d.answers->(q.ordinal-1)::text)='number' and d.answers->(q.ordinal-1)::text=d.answer_key->(q.ordinal-1)::integer),0)
    into v_attempted,v_correct,v_score
  from jsonb_array_elements(d.questions) with ordinality q(value,ordinal);
  new.status:='submitted'; new.submitted_at:=old.expires_at;
  new.answers:=d.answers; new.score:=round(v_score,2); new.total_marks:=d.total_marks;
  new.percentage:=round(v_score/d.total_marks*100,2); new.correct_count:=v_correct; new.attempted_count:=v_attempted;
  return new;
end;
$fn$;
revoke all on function ksol_exam_private.finalize_expiring_attempt() from public, anon, authenticated;
drop trigger if exists ksol_exam_finalize_expiring_draft on public.test_attempts;
create trigger ksol_exam_finalize_expiring_draft before update of status on public.test_attempts
for each row when (old.status='in_progress' and new.status='expired')
execute function ksol_exam_private.finalize_expiring_attempt();

create or replace function ksol_exam_private.finalize_due_attempts()
returns integer language plpgsql security definer set search_path = ''
as $fn$
declare v_count integer;
begin
  with due as (
    select a.id from public.test_attempts a
    join ksol_exam_private.attempt_drafts d on d.attempt_id=a.id
    where a.status='in_progress' and a.expires_at<=clock_timestamp()
    order by a.expires_at limit 100 for update of a skip locked
  )
  update public.test_attempts a set status='expired' from due where a.id=due.id;
  get diagnostics v_count=row_count;
  return v_count;
end;
$fn$;
revoke all on function ksol_exam_private.finalize_due_attempts() from public, anon, authenticated;
-- Install the schedule separately after synthetic verification and client rollout.
