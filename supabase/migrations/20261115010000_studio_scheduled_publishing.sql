-- Server-side scheduled publishing for Visual Studio.
-- Review this migration before any production rollout.
-- A schedule captures the EXACT saved draft config, not later unsaved edits.
create table if not exists public.studio_publish_schedules (
  id uuid primary key default gen_random_uuid(),
  source_version_id uuid references public.site_config_versions(id) on delete set null,
  config_snapshot jsonb not null check (jsonb_typeof(config_snapshot) = 'object'),
  scheduled_for timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  published_version_number bigint
);
create unique index if not exists studio_publish_one_pending_idx
  on public.studio_publish_schedules((status)) where status = 'pending';
create index if not exists studio_publish_due_idx
  on public.studio_publish_schedules(scheduled_for) where status = 'pending';

alter table public.studio_publish_schedules enable row level security;
drop policy if exists "Admins view studio publish schedules" on public.studio_publish_schedules;
create policy "Admins view studio publish schedules"
  on public.studio_publish_schedules for select to authenticated
  using ((select auth.uid()) is not null and (select public.is_admin()));
revoke all on public.studio_publish_schedules from public, anon, authenticated;
grant select on public.studio_publish_schedules to authenticated;

create or replace function public.admin_schedule_studio_publish(p_draft_id uuid, p_publish_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_config jsonb; v_id uuid;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required';
  end if;
  if p_publish_at is null or p_publish_at < now() + interval '2 minutes'
     or p_publish_at > now() + interval '365 days' then
    raise exception 'Scheduled publication must be 2 minutes to 365 days from now';
  end if;
  select config into v_config
    from public.site_config_versions
    where id = p_draft_id and status = 'draft' for share;
  if v_config is null then raise exception 'Save a current draft before scheduling'; end if;
  -- Replace any existing pending plan to avoid competing scheduled publishes.
  update public.studio_publish_schedules
    set status = 'cancelled'
    where status = 'pending';
  insert into public.studio_publish_schedules
    (source_version_id, config_snapshot, scheduled_for, created_by)
    values (p_draft_id, v_config, p_publish_at, (select auth.uid()))
    returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.admin_schedule_studio_publish(uuid,timestamptz) from public, anon;
grant execute on function public.admin_schedule_studio_publish(uuid,timestamptz) to authenticated;

create or replace function public.admin_cancel_studio_publish(p_schedule_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required';
  end if;
  update public.studio_publish_schedules
    set status = 'cancelled'
    where id = p_schedule_id and status = 'pending';
  return found;
end;
$$;
revoke all on function public.admin_cancel_studio_publish(uuid) from public, anon;
grant execute on function public.admin_cancel_studio_publish(uuid) to authenticated;

create schema if not exists studio_private;
revoke all on schema studio_private from public, anon, authenticated;

-- Cron calls this internal function as the DB owner, not as a browser user.
create or replace function studio_private.publish_due_studio_schedules()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare item record; v_number bigint;
begin
  for item in
    select id, source_version_id, config_snapshot, created_by
    from public.studio_publish_schedules
    where status = 'pending' and scheduled_for <= now()
    order by scheduled_for
    for update skip locked
  loop
    -- If an Admin manually published or removed this draft, don't override it.
    if not exists (
      select 1 from public.site_config_versions
      where id = item.source_version_id and status = 'draft'
    ) then
      update public.studio_publish_schedules set status = 'cancelled' where id = item.id;
      continue;
    end if;

    update public.site_config_versions set status = 'archived'
      where status = 'published';
    -- Create a new published version using the immutable schedule snapshot.
    -- The editable draft stays a draft; this is not the current unsaved UI state.
    insert into public.site_config_versions(config, status, created_by, published_at)
      values(item.config_snapshot, 'published', item.created_by, now())
      returning version_number into v_number;
    update public.studio_publish_schedules
      set status = 'completed', completed_at = now(), published_version_number = v_number
      where id = item.id;
  end loop;
end;
$$;
revoke all on function studio_private.publish_due_studio_schedules() from public, anon, authenticated;
-- Run the lightweight due-publish check once each minute; no browser required.
select cron.schedule(
  'studio-publish-due-preview',
  '* * * * *',
  'select studio_private.publish_due_studio_schedules()'
);
