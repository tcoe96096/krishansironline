create table if not exists public.student_learning_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  material_id text not null,
  class_level text not null check (class_level in ('6','7','8','9','10','11','12')),
  subject text not null,
  chapter_title text not null,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  last_position jsonb not null default '{}'::jsonb check (jsonb_typeof(last_position) = 'object'),
  last_opened_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, material_id)
);
create index if not exists student_learning_progress_student_recent_idx
  on public.student_learning_progress (student_id, last_opened_at desc);
alter table public.student_learning_progress enable row level security;
drop policy if exists "Students read own learning progress" on public.student_learning_progress;
create policy "Students read own learning progress" on public.student_learning_progress
  for select to authenticated using (student_id = (select auth.uid()));
drop policy if exists "Students insert own learning progress" on public.student_learning_progress;
create policy "Students insert own learning progress" on public.student_learning_progress
  for insert to authenticated with check (student_id = (select auth.uid()));
drop policy if exists "Students update own learning progress" on public.student_learning_progress;
create policy "Students update own learning progress" on public.student_learning_progress
  for update to authenticated using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
drop policy if exists "Admins read learning progress" on public.student_learning_progress;
create policy "Admins read learning progress" on public.student_learning_progress
  for select to authenticated using (public.is_admin());
create or replace function public.set_learning_progress_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  new.last_opened_at = now();
  if new.progress_percent = 100 and new.completed_at is null then
    new.completed_at = now();
  elsif new.progress_percent < 100 then
    new.completed_at = null;
  end if;
  return new;
end;
$$;
drop trigger if exists set_learning_progress_updated_at on public.student_learning_progress;
create trigger set_learning_progress_updated_at before update on public.student_learning_progress
for each row execute function public.set_learning_progress_updated_at();
revoke all on public.student_learning_progress from anon;
grant select, insert, update on public.student_learning_progress to authenticated;
