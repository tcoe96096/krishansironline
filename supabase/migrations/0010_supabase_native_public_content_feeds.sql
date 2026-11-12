-- Supabase-native replacement for legacy Apps Script public feeds.
create table if not exists public.site_notices (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null default '{}'::jsonb check (jsonb_typeof(title) = 'object'),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  category text not null default 'Notice',
  link text,
  is_published boolean not null default false,
  display_order integer not null default 0,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_notices_public_order_idx on public.site_notices (is_published, display_order, published_at desc);

create table if not exists public.admin_content_items (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('questions','materials')),
  title jsonb not null default '{}'::jsonb check (jsonb_typeof(title) = 'object'),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  class_level text,
  subject text,
  chapter text,
  category text,
  question jsonb,
  options jsonb,
  explanation jsonb,
  file_url text,
  external_url text,
  is_published boolean not null default false,
  display_order integer not null default 0,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_content_public_order_idx on public.admin_content_items (section, is_published, display_order, published_at desc);

alter table public.site_notices enable row level security;
alter table public.admin_content_items enable row level security;

drop policy if exists "Public reads published notices" on public.site_notices;
create policy "Public reads published notices" on public.site_notices for select to anon, authenticated
  using (is_published = true or (auth.uid() is not null and public.is_admin()));
drop policy if exists "Admins manage notices" on public.site_notices;
create policy "Admins manage notices" on public.site_notices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public reads published admin content" on public.admin_content_items;
create policy "Public reads published admin content" on public.admin_content_items for select to anon, authenticated
  using (is_published = true or (auth.uid() is not null and public.is_admin()));
drop policy if exists "Admins manage admin content" on public.admin_content_items;
create policy "Admins manage admin content" on public.admin_content_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.site_notices, public.admin_content_items to anon, authenticated;
grant insert, update, delete on public.site_notices, public.admin_content_items to authenticated;