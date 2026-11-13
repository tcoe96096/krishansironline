-- Admin-only reusable question bank. Correct answers remain in the same admin-only RLS table.
create table if not exists public.question_bank_sets (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null check (jsonb_typeof(title) = 'object'),
  class_level text not null check (class_level in ('6','7','8','9','10','11','12')),
  subject text not null,
  chapter text not null,
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) > 0),
  answer_key jsonb not null check (jsonb_typeof(answer_key) = 'array'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_bank_answer_count check (jsonb_array_length(questions) = jsonb_array_length(answer_key))
);
create index if not exists question_bank_sets_filter_idx
  on public.question_bank_sets (class_level, subject, chapter, updated_at desc);
alter table public.question_bank_sets enable row level security;
drop policy if exists "Admins manage question bank sets" on public.question_bank_sets;
create policy "Admins manage question bank sets"
  on public.question_bank_sets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.question_bank_sets to authenticated;
