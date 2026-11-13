-- Mock test series: curated sequences of already-published tests.
create table if not exists public.mock_test_series (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null check (jsonb_typeof(title)='object'),
  description jsonb not null default '{}'::jsonb check (jsonb_typeof(description)='object'),
  class_level text not null check (class_level in ('6','7','8','9','10','11','12')),
  subject text not null,
  test_ids text[] not null check (cardinality(test_ids) > 0),
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mock_test_series_class_published_idx on public.mock_test_series(class_level,is_published,updated_at desc);
alter table public.mock_test_series enable row level security;
drop policy if exists "Students read published mock series" on public.mock_test_series;
create policy "Students read published mock series" on public.mock_test_series for select to authenticated
using (is_published = true and exists(select 1 from public.student_profiles sp where sp.user_id=auth.uid() and sp.class_level=mock_test_series.class_level));
drop policy if exists "Admins manage mock series" on public.mock_test_series;
create policy "Admins manage mock series" on public.mock_test_series for all to authenticated
using (public.is_admin()) with check (public.is_admin());
grant select on public.mock_test_series to authenticated;
grant insert,update,delete on public.mock_test_series to authenticated;
