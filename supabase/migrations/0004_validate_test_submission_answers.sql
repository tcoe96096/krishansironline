-- Validate answer indexes before grading. This migration is additive and safe to run
-- after migrations 0001-0003; it replaces only the trusted submission RPC.
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
  v_entry record;
  v_question jsonb;
  v_option_count integer;
  v_question_index integer;
  v_answer_index integer;
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
  if v_key is null or jsonb_typeof(v_key) <> 'array' then
    raise exception 'Answer key is not configured correctly';
  end if;

  v_count := jsonb_array_length(v_key);
  if jsonb_typeof(v_test.questions) <> 'array'
     or jsonb_array_length(v_test.questions) <> v_count then
    raise exception 'Test questions and answer key do not match';
  end if;

  -- Reject malformed/out-of-range question and option indexes instead of
  -- silently counting arbitrary client-supplied keys as attempted answers.
  for v_entry in select key, value from jsonb_each(p_answers)
  loop
    if v_entry.key !~ '^(0|[1-9][0-9]*)$' then
      raise exception 'Invalid question index';
    end if;
    v_question_index := v_entry.key::integer;
    if v_question_index < 0 or v_question_index >= v_count then
      raise exception 'Question index is out of range';
    end if;

    if v_entry.value is not null and v_entry.value <> 'null'::jsonb then
      if jsonb_typeof(v_entry.value) <> 'number'
         or (v_entry.value::text !~ '^(0|[1-9][0-9]*)$') then
        raise exception 'Answer option must be a non-negative integer';
      end if;
      v_answer_index := (v_entry.value::text)::integer;
      v_question := v_test.questions -> v_question_index;
      v_option_count := jsonb_array_length(v_question -> 'options' -> 'en');
      if v_answer_index < 0 or v_answer_index >= v_option_count then
        raise exception 'Answer option is out of range';
      end if;
      v_attempted := v_attempted + 1;
    end if;
  end loop;

  select count(*) into v_correct
  from jsonb_each(p_answers) a
  where a.key ~ '^(0|[1-9][0-9]*)$'
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
    attempted_count = v_attempted
  where id = p_attempt_id
  returning * into v_attempt;

  return v_attempt;
end;
$$;

revoke all on function public.submit_test_attempt(uuid, jsonb) from public;
grant execute on function public.submit_test_attempt(uuid, jsonb) to authenticated;
