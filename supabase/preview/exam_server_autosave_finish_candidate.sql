-- Finalization RPC for the opt-in server draft client. An automatic request
-- cannot submit early; a manual request must identify the acknowledged revision.
create or replace function public.finish_test_attempt_draft(p_attempt_id uuid, p_expected_revision bigint default null)
returns public.test_attempts language plpgsql security definer set search_path=''
as $fn$
declare a public.test_attempts%rowtype; d ksol_exam_private.attempt_drafts%rowtype;
  v_score numeric; v_correct integer; v_attempted integer; v_now timestamptz;
begin
  if auth.uid() is null or not public.student_account_is_eligible(auth.uid()) then raise exception 'Not eligible'; end if;
  select * into a from public.test_attempts where id=p_attempt_id and student_id=auth.uid() for update;
  if not found then raise exception 'Attempt not found'; end if;
  if a.status<>'in_progress' then return a; end if;
  v_now:=clock_timestamp();
  if v_now>=a.expires_at then
    update public.test_attempts set status='expired' where id=a.id returning * into a;
    return a;
  end if;
  if p_expected_revision is null then raise exception 'Deadline not reached'; end if;
  select * into d from ksol_exam_private.attempt_drafts where attempt_id=a.id;
  if not found or d.revision<>p_expected_revision then raise exception 'Draft revision conflict'; end if;
  select count(*) filter(where jsonb_typeof(d.answers->(q.ordinal-1)::text)='number'),
    count(*) filter(where jsonb_typeof(d.answers->(q.ordinal-1)::text)='number' and d.answers->(q.ordinal-1)::text=d.answer_key->(q.ordinal-1)::integer),
    coalesce(sum(coalesce((q.value->>'marks')::numeric,1)) filter(where jsonb_typeof(d.answers->(q.ordinal-1)::text)='number' and d.answers->(q.ordinal-1)::text=d.answer_key->(q.ordinal-1)::integer),0)
    into v_attempted,v_correct,v_score
  from jsonb_array_elements(d.questions) with ordinality q(value,ordinal);
  update public.test_attempts set status='submitted',submitted_at=v_now,answers=d.answers,score=round(v_score,2),total_marks=d.total_marks,
    percentage=round(v_score/d.total_marks*100,2),correct_count=v_correct,attempted_count=v_attempted where id=a.id returning * into a;
  return a;
end;
$fn$;
revoke all on function public.finish_test_attempt_draft(uuid,bigint) from public, anon, authenticated;
grant execute on function public.finish_test_attempt_draft(uuid,bigint) to authenticated;
