-- Production parity: secure Admin test authoring RPCs.
-- These functions are SECURITY DEFINER, so they explicitly require a signed-in
-- user whose database role is admin. Answer keys remain inaccessible through
-- direct table grants; only the authenticated Admin RPC can read/write them.

create or replace function public.admin_save_test(p_test jsonb, p_answer_key jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id text;
  v_questions jsonb;
  v_key jsonb;
  v_question jsonb;
  v_index integer := 0;
  v_option_count integer;
  v_total_marks numeric;
  v_calculated_marks numeric := 0;
  v_marks numeric;
  v_answer_text text;
  v_option text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if jsonb_typeof(p_test) <> 'object' or jsonb_typeof(p_answer_key) <> 'array' then
    raise exception 'Invalid test payload';
  end if;

  v_id := nullif(trim(p_test->>'id'), '');
  if v_id is null or length(v_id) > 120 then raise exception 'A valid test ID is required'; end if;
  if exists (select 1 from public.tests where id = v_id and is_published = true) then
    raise exception 'Published tests cannot be overwritten as drafts. Unpublish first.';
  end if;
  if jsonb_typeof(p_test->'title') <> 'object'
     or coalesce(trim(p_test->'title'->>'en'),'') = ''
     or coalesce(trim(p_test->'title'->>'hi'),'') = '' then
    raise exception 'Bilingual test title is required';
  end if;
  if (p_test->>'class_level') not in ('6','7','8','9','10','11','12') then
    raise exception 'Invalid class level';
  end if;
  if coalesce(trim(p_test->>'subject'),'') = '' then raise exception 'Subject is required'; end if;
  if coalesce(trim(p_test->>'chapter'),'') = '' then raise exception 'Chapter is required'; end if;
  if coalesce((p_test->>'duration_minutes')::integer,0) not between 1 and 600 then
    raise exception 'Duration must be between 1 and 600 minutes';
  end if;
  if coalesce((p_test->>'attempt_limit')::integer,0) not between 1 and 20 then
    raise exception 'Attempt limit must be between 1 and 20';
  end if;
  v_total_marks := (p_test->>'total_marks')::numeric;
  if v_total_marks is null or v_total_marks <= 0 then raise exception 'Total marks must be positive'; end if;
  if jsonb_typeof(p_test->'questions') <> 'array'
     or jsonb_array_length(p_test->'questions') = 0
     or jsonb_array_length(p_test->'questions') <> jsonb_array_length(p_answer_key) then
    raise exception 'Questions and answer key must have the same non-zero length';
  end if;

  v_key := p_answer_key;
  for v_question in select value from jsonb_array_elements(p_test->'questions')
  loop
    if jsonb_typeof(v_question->'question') <> 'object'
       or coalesce(trim(v_question->'question'->>'hi'),'') = ''
       or coalesce(trim(v_question->'question'->>'en'),'') = '' then
      raise exception 'Question % needs Hindi and English text', v_index + 1;
    end if;
    if jsonb_typeof(v_question->'options') <> 'object'
       or jsonb_typeof(v_question->'options'->'hi') <> 'array'
       or jsonb_typeof(v_question->'options'->'en') <> 'array' then
      raise exception 'Question % needs bilingual options', v_index + 1;
    end if;
    v_option_count := jsonb_array_length(v_question->'options'->'en');
    if v_option_count < 2 or jsonb_array_length(v_question->'options'->'hi') <> v_option_count then
      raise exception 'Question % has invalid bilingual options', v_index + 1;
    end if;
    for v_option in
      select value #>> '{}' from jsonb_array_elements(v_question->'options'->'en')
      union all
      select value #>> '{}' from jsonb_array_elements(v_question->'options'->'hi')
    loop
      if coalesce(trim(v_option),'') = '' then
        raise exception 'Question % contains a blank option', v_index + 1;
      end if;
    end loop;
    if v_question ? 'explanation' then
      if jsonb_typeof(v_question->'explanation') <> 'object'
         or coalesce(trim(v_question->'explanation'->>'en'),'') = ''
         or coalesce(trim(v_question->'explanation'->>'hi'),'') = '' then
        raise exception 'Question % explanation must be complete in both languages', v_index + 1;
      end if;
    end if;
    v_marks := coalesce((v_question->>'marks')::numeric, 1);
    if v_marks <= 0 then raise exception 'Question % marks must be positive', v_index + 1; end if;
    v_calculated_marks := v_calculated_marks + v_marks;
    if jsonb_typeof(v_key->v_index) <> 'number' then
      raise exception 'Question % answer must be a numeric option index', v_index + 1;
    end if;
    v_answer_text := v_key->>v_index;
    if v_answer_text !~ '^(0|[1-9][0-9]*)$' then
      raise exception 'Question % has an invalid answer index', v_index + 1;
    end if;
    if v_answer_text::numeric >= v_option_count then
      raise exception 'Question % answer index is outside the option range', v_index + 1;
    end if;
    v_index := v_index + 1;
  end loop;
  if v_calculated_marks <> v_total_marks then
    raise exception 'Total marks must equal the sum of question marks';
  end if;

  select jsonb_agg(value - array['correctAnswer','correct_answer','answer','answerKey','modelAnswer','model_answer'])
    into v_questions
  from jsonb_array_elements(p_test->'questions');

  insert into public.tests (
    id, title, class_level, subject, chapter, duration_minutes,
    total_marks, questions, attempt_limit, is_published, updated_at
  ) values (
    v_id, p_test->'title', p_test->>'class_level', trim(p_test->>'subject'),
    trim(p_test->>'chapter'), (p_test->>'duration_minutes')::integer,
    v_total_marks, v_questions, (p_test->>'attempt_limit')::integer,
    false, now()
  )
  on conflict (id) do update set
    title = excluded.title, class_level = excluded.class_level,
    subject = excluded.subject, chapter = excluded.chapter,
    duration_minutes = excluded.duration_minutes, total_marks = excluded.total_marks,
    questions = excluded.questions, attempt_limit = excluded.attempt_limit,
    is_published = false, updated_at = now();

  insert into public.test_answer_keys(test_id, answer_key, updated_at)
  values (v_id, v_key, now())
  on conflict (test_id) do update set answer_key = excluded.answer_key, updated_at = excluded.updated_at;
  return v_id;
end;
$function$;

create or replace function public.admin_get_test_for_edit(p_test_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_test jsonb;
  v_key jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select to_jsonb(t) into v_test
  from public.tests t
  where t.id = p_test_id;

  if v_test is null then
    raise exception 'Test not found';
  end if;

  select answer_key into v_key
  from public.test_answer_keys
  where test_id = p_test_id;

  if v_key is null or jsonb_typeof(v_key) <> 'array' then
    raise exception 'Private answer key is unavailable';
  end if;

  return jsonb_build_object('test', v_test, 'answer_key', v_key);
end;
$function$;

create or replace function public.admin_set_test_published(p_test_id text, p_publish boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_test public.tests%rowtype;
  v_key jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  select * into v_test from public.tests where id = p_test_id for update;
  if not found then raise exception 'Test not found'; end if;
  if p_publish then
    select answer_key into v_key from public.test_answer_keys where test_id = p_test_id;
    if v_key is null or jsonb_array_length(v_key) <> jsonb_array_length(v_test.questions) then
      raise exception 'A complete answer key is required before publishing';
    end if;
  end if;
  update public.tests set is_published = p_publish, updated_at = now() where id = p_test_id;
  return p_publish;
end;
$function$;

revoke all on function public.admin_save_test(jsonb,jsonb) from public, anon;
revoke all on function public.admin_get_test_for_edit(text) from public, anon;
revoke all on function public.admin_set_test_published(text,boolean) from public, anon;
grant execute on function public.admin_save_test(jsonb,jsonb) to authenticated;
grant execute on function public.admin_get_test_for_edit(text) to authenticated;
grant execute on function public.admin_set_test_published(text,boolean) to authenticated;
