-- Validate every submitted answer against the published question/options shape
-- before grading. This migration replaces submit_test_attempt atomically.
-- Safe to run after 0001, 0002 and 0003; it does not alter existing records.

begin;

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
  v_question jsonb;
  v_key_item jsonb;
  v_answer record;
  v_question_count integer;
  v_correct integer := 0;
  v_attempted integer := 0;
  v_score numeric(8,2);
  v_option_count integer;
  v_answer_index integer;
  v_question_index integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers must be a JSON object';
  end if;

  select * into v_attempt
  from public.test_attempts
  where id = p_attempt_id and student_id = auth.uid()
  for update;

  if not found then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'Attempt already submitted';
  end if;

  if now() > v_attempt.expires_at then
    update public.test_attempts
      set status = 'expired'
      where id = p_attempt_id
      returning * into v_attempt;
    return v_attempt;
  end if;

  select * into v_test
  from public.tests
  where id = v_attempt.test_id and is_published = true;

  if not found then
    raise exception 'Published test not found';
  end if;

  if jsonb_typeof(v_test.questions) is distinct from 'array' then
    raise exception 'Test question catalogue is invalid';
  end if;

  select answer_key into v_key
  from public.test_answer_keys
  where test_id = v_attempt.test_id;

  if v_key is null or jsonb_typeof(v_key) is distinct from 'array' then
    raise exception 'Answer key is not configured correctly';
  end if;

  v_question_count := jsonb_array_length(v_test.questions);

  if v_question_count = 0
     or jsonb_array_length(v_key) <> v_question_count
     or v_test.total_marks <= 0 then
    raise exception 'Question and answer key configuration mismatch';
  end if;

  -- Validate the stored answer key against each question's option count.
  for v_question_index in 0..(v_question_count - 1) loop
    v_question := v_test.questions -> v_question_index;
    v_key_item := v_key -> v_question_index;

    if jsonb_typeof(v_key_item) is distinct from 'number'
       or jsonb_typeof(v_question -> 'options') is distinct from 'object'
       or jsonb_typeof(v_question -> 'options' -> 'en') is distinct from 'array'
       or jsonb_typeof(v_question -> 'options' -> 'hi') is distinct from 'array'
       or (v_key_item #>> '{}') !~ '^(0|[1-9][0-9]*) then
      raise exception 'Question or answer key format is invalid at index %', v_question_index;
    end if;

    v_option_count := jsonb_array_length(v_question -> 'options' -> 'en');

    if v_option_count < 2
       or jsonb_array_length(v_question -> 'options' -> 'hi') <> v_option_count then
      raise exception 'Bilingual option count mismatch at question %', v_question_index;
    end if;

    v_answer_index := (v_key_item #>> '{}')::integer;

    if v_answer_index < 0 or v_answer_index >= v_option_count then
      raise exception 'Stored answer key index is invalid at question %', v_question_index;
    end if;
  end loop;

  -- Reject unknown question indexes, non-integer values and out-of-range choices.
  for v_answer in
    select key, value from jsonb_each(p_answers)
  loop
    if v_answer.key !~ '^(0|[1-9][0-9]*)$' then
      raise exception 'Invalid question index: %', v_answer.key;
    end if;

    v_question_index := v_answer.key::integer;

    if v_question_index < 0 or v_question_index >= v_question_count then
      raise exception 'Question index out of range: %', v_question_index;
    end if;

    if v_answer.value <> 'null'::jsonb then
      if jsonb_typeof(v_answer.value) is distinct from 'number' then
        raise exception 'Answer must be an integer option index';
      end if;

      if (v_answer.value #>> '{}') !~ '^(0|[1-9][0-9]*)$' then
        raise exception 'Answer must be a non-negative integer option index';
      end if;

      v_answer_index := (v_answer.value #>> '{}')::integer;
      v_option_count := jsonb_array_length(
        v_test.questions -> v_question_index -> 'options' -> 'en'
      );

      if v_answer_index < 0 or v_answer_index >= v_option_count then
        raise exception 'Option index out of range for question %', v_question_index;
      end if;

      v_attempted := v_attempted + 1;
    end if;
  end loop;

  select count(*) into v_correct
  from jsonb_each(p_answers) a
  where a.value <> 'null'::jsonb
    and (v_key -> (a.key::integer)) = a.value;

  v_score := round(
    (v_test.total_marks * v_correct::numeric) / v_question_count,
    2
  );

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

commit;
 then
      raise exception 'Question or answer key format is invalid at index %', v_question_index;
    end if;

    v_option_count := jsonb_array_length(v_question -> 'options' -> 'en');

    if v_option_count < 2
       or jsonb_array_length(v_question -> 'options' -> 'hi') <> v_option_count then
      raise exception 'Bilingual option count mismatch at question %', v_question_index;
    end if;

    v_answer_index := (v_key_item #>> '{}')::integer;

    if v_answer_index < 0 or v_answer_index >= v_option_count then
      raise exception 'Stored answer key index is invalid at question %', v_question_index;
    end if;
  end loop;

  -- Reject unknown question indexes, non-integer values and out-of-range choices.
  for v_answer in
    select key, value from jsonb_each(p_answers)
  loop
    if v_answer.key !~ '^(0|[1-9][0-9]*)$' then
      raise exception 'Invalid question index: %', v_answer.key;
    end if;

    v_question_index := v_answer.key::integer;

    if v_question_index < 0 or v_question_index >= v_question_count then
      raise exception 'Question index out of range: %', v_question_index;
    end if;

    if v_answer.value <> 'null'::jsonb then
      if jsonb_typeof(v_answer.value) <> 'number' then
        raise exception 'Answer must be an integer option index';
      end if;

      if (v_answer.value #>> '{}') !~ '^(0|[1-9][0-9]*)$' then
        raise exception 'Answer must be a non-negative integer option index';
      end if;

      v_answer_index := (v_answer.value #>> '{}')::integer;
      v_option_count := jsonb_array_length(
        v_test.questions -> v_question_index -> 'options' -> 'en'
      );

      if v_answer_index < 0 or v_answer_index >= v_option_count then
        raise exception 'Option index out of range for question %', v_question_index;
      end if;

      v_attempted := v_attempted + 1;
    end if;
  end loop;

  select count(*) into v_correct
  from jsonb_each(p_answers) a
  where a.value <> 'null'::jsonb
    and (v_key -> (a.key::integer)) = a.value;

  v_score := round(
    (v_test.total_marks * v_correct::numeric) / v_question_count,
    2
  );

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

commit;
