-- Admin-controlled homepage announcement visibility, scheduling and live refresh.
-- Applied to the dedicated Preview Supabase project first.

alter table public.site_notices
  add column if not exists show_on_homepage boolean not null default true,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists starts_at timestamptz,
  add column if not exists expires_at timestamptz;

alter table public.site_notices
  drop constraint if exists site_notices_valid_schedule;

alter table public.site_notices
  add constraint site_notices_valid_schedule
  check (starts_at is null or expires_at is null or expires_at > starts_at);

create index if not exists site_notices_homepage_feed_idx
  on public.site_notices
  (is_published, show_on_homepage, is_pinned desc, display_order asc, published_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_notices'
  ) then
    execute 'alter publication supabase_realtime add table public.site_notices';
  end if;
end
$$;
