-- Preview-only student automatic purge foundation.
-- This migration installs the two scheduler dependencies but creates NO cron job.
-- Auth deletion remains disabled until the owner reviews and enables the final gate.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

alter table public.student_profiles
  add column if not exists purge_claim_token uuid,
  add column if not exists purge_claimed_at timestamptz,
  add column if not exists purge_attempts integer not null default 0,
  add column if not exists purge_completed_at timestamptz,
  add column if not exists purge_last_error_code text;

create table if not exists private.student_purge_events (
  id bigint generated always as identity primary key,
  student_id uuid,
  student_name text,
  event_type text not null check (event_type in
    ('claimed','blocked_review','auth_deleted','already_absent','completed','failed','restore_blocked')),
  reason_code text,
  created_at timestamptz not null default now()
);
revoke all on private.student_purge_events from public, anon, authenticated;
grant select, insert on private.student_purge_events to service_role;
grant usage, select on sequence private.student_purge_events_id_seq to service_role;

create index if not exists student_profiles_purge_claim_lease_idx
  on public.student_profiles(purge_claimed_at)
  where purge_claim_token is not null;

create or replace function private.student_name_needs_review(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    nullif(btrim(coalesce(p_name, '')), '') is null
    or btrim(p_name) ~ '^[0-9]{6,15}$'
    or btrim(p_name) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or lower(btrim(p_name)) = any(array[
      'err','error','test','unknown','student','name','n/a','na','null','none','anonymous'
    ]);
$$;
revoke all on function private.student_name_needs_review(text) from public, anon, authenticated;
grant execute on function private.student_name_needs_review(text) to service_role;

-- Claim due records atomically. SKIP LOCKED prevents overlapping scheduler runs.
-- Invalid/incomplete records are logged for Admin Review and never claimed.
create or replace function private.claim_student_purge_batch(p_batch_size integer default 10)
returns table (
  student_id uuid,
  student_name text,
  claim_token uuid,
  purge_after timestamptz,
  class_level text,
  roll_no text,
  school_name text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_batch_size < 1 or p_batch_size > 25 then
    raise exception 'Invalid batch size';
  end if;

  insert into private.student_purge_events(student_id, student_name, event_type, reason_code)
  select sp.user_id, sp.student_name, 'blocked_review',
    case
      when private.student_name_needs_review(sp.student_name) then 'student_name_needs_review'
      when nullif(btrim(coalesce(sp.class_level,'')), '') is null then 'class_missing'
      when nullif(btrim(coalesce(sp.roll_no,'')), '') is null then 'roll_missing'
      when nullif(btrim(coalesce(sp.school_name,'')), '') is null then 'school_missing'
      when exists (select 1 from public.user_roles ur where ur.user_id=sp.user_id) then 'role_assigned'
      when exists (select 1 from public.visual_studio_drafts vd where vd.user_id=sp.user_id) then 'visual_studio_owner'
      else 'manual_review'
    end
  from public.student_profiles sp
  where sp.account_status='deleted'
    and sp.purge_after <= now()
    and sp.purge_completed_at is null
    and sp.purge_claim_token is null
    and (
      private.student_name_needs_review(sp.student_name)
      or nullif(btrim(coalesce(sp.class_level,'')), '') is null
      or nullif(btrim(coalesce(sp.roll_no,'')), '') is null
      or nullif(btrim(coalesce(sp.school_name,'')), '') is null
      or exists (select 1 from public.user_roles ur where ur.user_id=sp.user_id)
      or exists (select 1 from public.visual_studio_drafts vd where vd.user_id=sp.user_id)
    );

  return query
  with candidates as (
    select sp.user_id
    from public.student_profiles sp
    where sp.account_status='deleted'
      and sp.deleted_at is not null
      and sp.purge_after <= now()
      and sp.purge_completed_at is null
      and sp.purge_claim_token is null
      and not private.student_name_needs_review(sp.student_name)
      and nullif(btrim(coalesce(sp.class_level,'')), '') is not null
      and nullif(btrim(coalesce(sp.roll_no,'')), '') is not null
      and nullif(btrim(coalesce(sp.school_name,'')), '') is not null
      and not exists (select 1 from public.user_roles ur where ur.user_id=sp.user_id)
      and not exists (select 1 from public.visual_studio_drafts vd where vd.user_id=sp.user_id)
    order by sp.purge_after, sp.user_id
    for update skip locked
    limit p_batch_size
  ),
  claimed as (
    update public.student_profiles sp
    set purge_claim_token=gen_random_uuid(),
        purge_claimed_at=now(),
        purge_attempts=sp.purge_attempts+1,
        purge_last_error_code=null
    from candidates c
    where sp.user_id=c.user_id
    returning sp.user_id, sp.student_name, sp.purge_claim_token,
      sp.purge_after, sp.class_level, sp.roll_no, sp.school_name
  )
  select c.user_id, c.student_name, c.purge_claim_token,
    c.purge_after, c.class_level, c.roll_no, c.school_name
  from claimed c;

  insert into private.student_purge_events(student_id, student_name, event_type)
  select sp.user_id, sp.student_name, 'claimed'
  from public.student_profiles sp
  where sp.purge_claimed_at >= now() - interval '2 seconds'
    and sp.purge_claim_token is not null;
end;
$$;
revoke all on function private.claim_student_purge_batch(integer) from public, anon, authenticated;
grant execute on function private.claim_student_purge_batch(integer) to service_role;

-- Re-check immediately before Auth Admin deletion. A live claim lease prevents
-- the Restore UI from winning a race between this check and the external Auth call.
create or replace function private.authorize_student_purge(p_student_id uuid, p_claim_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  select (
    sp.account_status='deleted'
    and sp.deleted_at is not null
    and sp.purge_after <= now()
    and sp.purge_completed_at is null
    and sp.purge_claim_token=p_claim_token
    and sp.purge_claimed_at > now() - interval '10 minutes'
    and not private.student_name_needs_review(sp.student_name)
    and nullif(btrim(coalesce(sp.class_level,'')), '') is not null
    and nullif(btrim(coalesce(sp.roll_no,'')), '') is not null
    and nullif(btrim(coalesce(sp.school_name,'')), '') is not null
    and not exists (select 1 from public.user_roles ur where ur.user_id=sp.user_id)
    and not exists (select 1 from public.visual_studio_drafts vd where vd.user_id=sp.user_id)
  ) into v_ok
  from public.student_profiles sp
  where sp.user_id=p_student_id
  for update;

  return coalesce(v_ok,false);
end;
$$;
revoke all on function private.authorize_student_purge(uuid,uuid) from public, anon, authenticated;
grant execute on function private.authorize_student_purge(uuid,uuid) to service_role;

create or replace function private.complete_student_purge(p_student_id uuid, p_claim_token uuid, p_auth_user_absent boolean default false)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.student_profiles sp
  set country=null,
      state=null,
      district=null,
      area_type=null,
      locality_name=null,
      pin_code=null,
      purge_completed_at=now(),
      purge_claim_token=null,
      purge_claimed_at=null,
      purge_last_error_code=null
  where sp.user_id=p_student_id
    and sp.account_status='deleted'
    and sp.purge_after <= now()
    and sp.purge_claim_token=p_claim_token
    and sp.purge_claimed_at > now() - interval '10 minutes'
    and sp.purge_completed_at is null
    and not private.student_name_needs_review(sp.student_name)
    and not exists (select 1 from public.user_roles ur where ur.user_id=sp.user_id)
    and not exists (select 1 from public.visual_studio_drafts vd where vd.user_id=sp.user_id);

  get diagnostics v_count = row_count;
  if v_count=1 then
    insert into private.student_purge_events(student_id, student_name, event_type, reason_code)
    select user_id, student_name, case when p_auth_user_absent then 'already_absent' else 'completed' end,
      'location_fields_cleared'
    from public.student_profiles where user_id=p_student_id;
    return true;
  end if;
  return false;
end;
$$;
revoke all on function private.complete_student_purge(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function private.complete_student_purge(uuid,uuid,boolean) to service_role;

create or replace function private.release_student_purge_claim(p_student_id uuid, p_claim_token uuid, p_error_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.student_profiles
  set purge_claim_token=null,
      purge_claimed_at=null,
      purge_last_error_code=left(regexp_replace(coalesce(p_error_code,'worker_error'),'[^a-zA-Z0-9_:-]','','g'),80)
  where user_id=p_student_id
    and purge_claim_token=p_claim_token
    and purge_completed_at is null;

  insert into private.student_purge_events(student_id, event_type, reason_code)
  values(p_student_id,'failed',
    left(regexp_replace(coalesce(p_error_code,'worker_error'),'[^a-zA-Z0-9_:-]','','g'),80));
end;
$$;
revoke all on function private.release_student_purge_claim(uuid,uuid,text) from public, anon, authenticated;
grant execute on function private.release_student_purge_claim(uuid,uuid,text) to service_role;

-- Block Restore only during a short active purge lease. If the worker crashes,
-- the lease expires after 10 minutes and an Admin can restore normally.
create or replace function private.guard_student_restore_during_purge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.account_status='deleted'
     and new.account_status <> 'deleted'
     and old.purge_claim_token is not null
     and old.purge_claimed_at > now() - interval '10 minutes'
     and old.purge_completed_at is null then
    raise exception 'Purge is currently processing this record. Retry restore after the short processing lock expires.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_student_restore_during_purge() from public, anon, authenticated;
drop trigger if exists student_restore_purge_guard on public.student_profiles;
create trigger student_restore_purge_guard
before update of account_status on public.student_profiles
for each row execute function private.guard_student_restore_during_purge();

comment on table private.student_purge_events is
  'Private operational audit for Preview student Auth purge. Contains academic identity only; no geographic data or free-text reasons.';
comment on column public.student_profiles.purge_completed_at is
  'Marks completion of Auth identity purge and location-field cleanup; academic profile and named results remain retained.';
