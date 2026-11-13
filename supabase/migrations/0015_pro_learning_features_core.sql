-- Pro Learning Platform core data model (additive only).
-- Does not modify or delete existing student profiles, tests, attempts, answers or notices.
-- Apply through the normal reviewed migration pipeline; do not run against Production yet.

-- 1) Student bookmarks: snapshot contains only student-visible content.
create table if not exists public.student_bookmarks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('question','material','test')),
  item_id text not null,
  title text not null,
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique(student_id, item_type, item_id)
);
create index if not exists student_bookmarks_student_recent_idx
  on public.student_bookmarks(student_id, created_at desc);
alter table public.student_bookmarks enable row level security;
drop policy if exists "Students manage own bookmarks" on public.student_bookmarks;
create policy "Students manage own bookmarks"
  on public.student_bookmarks for all to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
drop policy if exists "Admins read student bookmarks" on public.student_bookmarks;
create policy "Admins read student bookmarks"
  on public.student_bookmarks for select to authenticated
  using (public.is_admin());
revoke all on public.student_bookmarks from anon;
grant select, insert, update, delete on public.student_bookmarks to authenticated;

-- 2) Daily activity ledger: streak is derived from distinct activity_date rows.
create table if not exists public.student_daily_activity (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default (timezone('Asia/Kolkata', now()))::date,
  study_minutes integer not null default 0 check (study_minutes between 0 and 1440),
  lessons_opened integer not null default 0 check (lessons_opened >= 0),
  lessons_completed integer not null default 0 check (lessons_completed >= 0),
  tests_completed integer not null default 0 check (tests_completed >= 0),
  questions_reviewed integer not null default 0 check (questions_reviewed >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, activity_date)
);
create index if not exists student_daily_activity_student_date_idx
  on public.student_daily_activity(student_id, activity_date desc);
alter table public.student_daily_activity enable row level security;
drop policy if exists "Students read own daily activity" on public.student_daily_activity;
create policy "Students read own daily activity"
  on public.student_daily_activity for select to authenticated
  using (student_id = (select auth.uid()));
drop policy if exists "Students write own daily activity" on public.student_daily_activity;
create policy "Students write own daily activity"
  on public.student_daily_activity for all to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
drop policy if exists "Admins read daily activity" on public.student_daily_activity;
create policy "Admins read daily activity"
  on public.student_daily_activity for select to authenticated
  using (public.is_admin());
revoke all on public.student_daily_activity from anon;
grant select, insert, update on public.student_daily_activity to authenticated;

-- 3) Mistake notebook. Incorrect answers are captured server-side at submission;
-- the answer key is never exposed through the tests catalogue or browser API.
create table if not exists public.student_mistake_notebook (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  test_id text not null references public.tests(id) on delete cascade,
  question_index integer not null check (question_index >= 0),
  question_snapshot jsonb not null check (jsonb_typeof(question_snapshot) = 'object'),
  selected_option integer,
  correct_option integer not null check (correct_option >= 0),
  explanation jsonb not null default '{}'::jsonb check (jsonb_typeof(explanation) = 'object'),
  mastered boolean not null default false,
  created_at timestamptz not null default now(),
  mastered_at timestamptz,
  unique(attempt_id, question_index)
);
create index if not exists student_mistakes_student_recent_idx
  on public.student_mistake_notebook(student_id, created_at desc);
alter table public.student_mistake_notebook enable row level security;
drop policy if exists "Students read own mistakes" on public.student_mistake_notebook;
create policy "Students read own mistakes"
  on public.student_mistake_notebook for select to authenticated
  using (student_id = (select auth.uid()));
drop policy if exists "Students update own mistake mastery" on public.student_mistake_notebook;
create policy "Students update own mistake mastery"
  on public.student_mistake_notebook for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
drop policy if exists "Admins read all student mistakes" on public.student_mistake_notebook;
create policy "Admins read all student mistakes"
  on public.student_mistake_notebook for select to authenticated
  using (public.is_admin());
revoke all on public.student_mistake_notebook from anon;
grant select on public.student_mistake_notebook to authenticated;
grant update (mastered, mastered_at) on public.student_mistake_notebook to authenticated;

create or replace function public.capture_student_mistakes_after_submit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_key jsonb;
  v_questions jsonb;
  v_question jsonb;
  v_answer jsonb;
  v_index integer;
  v_selected integer;
  v_correct integer;
begin
  if old.status <> 'in_progress' or new.status <> 'submitted' then
    return new;
  end if;
  select t.questions into v_questions
    from public.tests t where t.id = new.test_id;
  select k.answer_key into v_key
    from public.test_answer_keys k where k.test_id = new.test_id;
  if v_questions is null or v_key is null
     or jsonb_typeof(v_questions) <> 'array'
     or jsonb_typeof(v_key) <> 'array' then
    return new;
  end if;

  for v_index in 0..least(jsonb_array_length(v_questions), jsonb_array_length(v_key)) - 1 loop
    v_question := v_questions -> v_index;
    v_answer := new.answers -> v_index::text;
    v_correct := (v_key ->> v_index)::integer;
    v_selected := case
      when v_answer is not null and v_answer <> 'null'::jsonb
       and jsonb_typeof(v_answer) = 'number'
      then (v_answer::text)::integer else null end;
    if v_selected is not null and v_selected <> v_correct then
      insert into public.student_mistake_notebook (
        student_id, attempt_id, test_id, question_index,
        question_snapshot, selected_option, correct_option, explanation
      ) values (
        new.student_id, new.id, new.test_id, v_index,
        v_question - array['correctAnswer','correct_answer','answer','answerKey','modelAnswer','model_answer'],
        v_selected, v_correct, coalesce(v_question->'explanation','{}'::jsonb)
      )
      on conflict (attempt_id, question_index) do nothing;
    end if;
  end loop;

  insert into public.student_daily_activity(student_id, activity_date, tests_completed)
  values (new.student_id, (timezone('Asia/Kolkata', coalesce(new.submitted_at, now())))::date, 1)
  on conflict (student_id, activity_date)
  do update set tests_completed = public.student_daily_activity.tests_completed + 1,
                updated_at = now();
  return new;
end;
$function$;

drop trigger if exists capture_student_mistakes_after_submit on public.test_attempts;
create trigger capture_student_mistakes_after_submit
  after update of status on public.test_attempts
  for each row execute function public.capture_student_mistakes_after_submit();
revoke all on function public.capture_student_mistakes_after_submit() from public, anon, authenticated;

-- 4) Flashcard decks are admin-authored. Students can only read published decks.
create table if not exists public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null check (jsonb_typeof(title) = 'object'),
  description jsonb not null default '{}'::jsonb check (jsonb_typeof(description) = 'object'),
  class_level text check (class_level is null or class_level in ('6','7','8','9','10','11','12')),
  subject text not null,
  chapter text,
  cards jsonb not null default '[]'::jsonb check (jsonb_typeof(cards) = 'array'),
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists flashcard_decks_published_idx
  on public.flashcard_decks(is_published, class_level, subject);
alter table public.flashcard_decks enable row level security;
drop policy if exists "Students read published flashcard decks" on public.flashcard_decks;
create policy "Students read published flashcard decks"
  on public.flashcard_decks for select to authenticated
  using (is_published = true or public.is_admin());
drop policy if exists "Admins manage flashcard decks" on public.flashcard_decks;
create policy "Admins manage flashcard decks"
  on public.flashcard_decks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.flashcard_decks from anon;
grant select, insert, update, delete on public.flashcard_decks to authenticated;

create table if not exists public.student_flashcard_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  card_id text not null,
  review_state text not null default 'learning' check (review_state in ('learning','known')),
  review_count integer not null default 0 check (review_count >= 0),
  last_reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(student_id, deck_id, card_id)
);
create index if not exists student_flashcard_progress_student_idx
  on public.student_flashcard_progress(student_id, updated_at desc);
alter table public.student_flashcard_progress enable row level security;
drop policy if exists "Students manage own flashcard progress" on public.student_flashcard_progress;
create policy "Students manage own flashcard progress"
  on public.student_flashcard_progress for all to authenticated
  using (student_id = (select auth.uid()))
  with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.flashcard_decks d where d.id = deck_id and d.is_published = true)
  );
drop policy if exists "Admins read flashcard progress" on public.student_flashcard_progress;
create policy "Admins read flashcard progress"
  on public.student_flashcard_progress for select to authenticated
  using (public.is_admin());
revoke all on public.student_flashcard_progress from anon;
grant select, insert, update, delete on public.student_flashcard_progress to authenticated;

-- 5) Record a student's first opening and completion of each learning material.
create or replace function public.record_learning_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    insert into public.student_daily_activity(student_id, activity_date, lessons_opened)
    values (new.student_id, (timezone('Asia/Kolkata', now()))::date, 1)
    on conflict (student_id, activity_date)
    do update set lessons_opened = public.student_daily_activity.lessons_opened + 1,
                  updated_at = now();
  elsif old.progress_percent < 100 and new.progress_percent = 100 then
    insert into public.student_daily_activity(student_id, activity_date, lessons_completed)
    values (new.student_id, (timezone('Asia/Kolkata', now()))::date, 1)
    on conflict (student_id, activity_date)
    do update set lessons_completed = public.student_daily_activity.lessons_completed + 1,
                  updated_at = now();
  end if;
  return new;
end;
$function$;
drop trigger if exists record_learning_activity on public.student_learning_progress;
create trigger record_learning_activity
  after insert or update of progress_percent on public.student_learning_progress
  for each row execute function public.record_learning_activity();
revoke all on function public.record_learning_activity() from public, anon, authenticated;
