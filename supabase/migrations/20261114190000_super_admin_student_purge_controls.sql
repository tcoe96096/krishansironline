-- Super Admin controls for student purge retention and daily schedule.
-- Preview branch migration. Execution remains fail-closed in the Edge Function
-- until its independent owner-approved execution gates are configured.

create table if not exists public.student_purge_settings (
  singleton boolean primary key default true check (singleton),
  auto_purge_enabled boolean not null default false,
  recovery_days integer not null default 30 check (recovery_days between 30 and 365),
  run_time_local time not null default time '02:30',
  timezone_name text not null default 'Asia/Kolkata' check (timezone_name = 'Asia/Kolkata'),
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into public.student_purge_settings(singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.student_purge_settings enable row level security;
revoke all on public.student_purge_settings from anon, authenticated, public;

create table if not exists public.student_purge_settings_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  old_auto_purge_enabled boolean not null,
  new_auto_purge_enabled boolean not null,
  old_recovery_days integer not null,
  new_recovery_days integer not null,
  old_run_time_local time not null,
  new_run_time_local time not null,
  created_at timestamptz not null default now()
);
alter table public.student_purge_settings_audit enable row level security;
revoke all on public.student_purge_settings_audit from anon, authenticated, public;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and lower(role) = 'super_admin'
  );
$$;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

create or replace function public.get_student_purge_settings()
returns table (
  auto_purge_enabled boolean,
  recovery_days integer,
  run_time_local text,
  timezone_name text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query
    select s.auto_purge_enabled, s.recovery_days,
      to_char(s.run_time_local, 'HH24:MI'), s.timezone_name, s.updated_at
    from public.student_purge_settings s where s.singleton = true;
end;
$$;
revoke all on function public.get_student_purge_settings() from public, anon;
grant execute on function public.get_student_purge_settings() to authenticated;

create or replace function public.save_student_purge_settings(
  p_auto_purge_enabled boolean,
  p_recovery_days integer,
  p_run_time_local text
)
returns table (
  auto_purge_enabled boolean,
  recovery_days integer,
  run_time_local text,
  timezone_name text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, vault, cron
as $$
declare
  v_old public.student_purge_settings%rowtype;
  v_new_time time;
  v_run_utc timestamptz;
  v_cron_expression text;
begin
  if not public.is_super_admin() then
    raise exception 'Super Admin permission required';
  end if;
  if p_recovery_days < 30 or p_recovery_days > 365 then
    raise exception 'Recovery period must be between 30 and 365 days';
  end if;
  if p_run_time_local !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'Schedule time must use HH:MM (24-hour) format';
  end if;
  v_new_time := p_run_time_local::time;

  select * into v_old from public.student_purge_settings
  where singleton = true for update;

  update public.student_purge_settings
  set auto_purge_enabled = p_auto_purge_enabled,
      recovery_days = p_recovery_days,
      run_time_local = v_new_time,
      updated_by = auth.uid(),
      updated_at = now()
  where singleton = true;

  insert into public.student_purge_settings_audit(
    actor_id, old_auto_purge_enabled, new_auto_purge_enabled,
    old_recovery_days, new_recovery_days,
    old_run_time_local, new_run_time_local
  ) values (
    auth.uid(), v_old.auto_purge_enabled, p_auto_purge_enabled,
    v_old.recovery_days, p_recovery_days,
    v_old.run_time_local, v_new_time
  );

  -- Install/update the daily Preview scheduler only when enabled and the two
  -- required Vault credentials exist. Worker execution still has independent
  -- environment gates and will refuse to delete while those gates are closed.
  if p_auto_purge_enabled then
    if not exists (select 1 from vault.decrypted_secrets where name='student_purge_project_url')
       or not exists (select 1 from vault.decrypted_secrets where name='student_purge_service_role_jwt') then
      raise exception 'Scheduler credentials are not configured in Preview Vault; settings were not enabled';
    end if;
    v_run_utc := (current_date + v_new_time) at time zone 'Asia/Kolkata';
    v_cron_expression := extract(minute from v_run_utc)::int::text || ' '
      || extract(hour from v_run_utc)::int::text || ' * * *';
    if exists (select 1 from cron.job where jobname='student-auto-purge-daily') then
      perform cron.unschedule('student-auto-purge-daily');
    end if;
    perform cron.schedule(
      'student-auto-purge-daily',
      v_cron_expression,
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name='student_purge_project_url')
            || '/functions/v1/student-auto-purge',
          headers := jsonb_build_object(
            'Content-Type','application/json',
            'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='student_purge_service_role_jwt')
          ),
          body := jsonb_build_object('trigger','daily_scheduler')
        );
      $job$
    );
  else
    if exists (select 1 from cron.job where jobname='student-auto-purge-daily') then
      perform cron.unschedule('student-auto-purge-daily');
    end if;
  end if;

  return query select s.auto_purge_enabled, s.recovery_days,
    to_char(s.run_time_local, 'HH24:MI'), s.timezone_name, s.updated_at
  from public.student_purge_settings s where s.singleton = true;
end;
$$;
revoke all on function public.save_student_purge_settings(boolean,integer,text) from public, anon;
grant execute on function public.save_student_purge_settings(boolean,integer,text) to authenticated;

-- Newly soft-deleted records use the Super Admin-configured period. Existing
-- deleted records retain their already-stamped purge_after deadline.
create or replace function public.set_student_deletion_deadline()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_recovery_days integer := 30;
begin
  if new.account_status = 'deleted' and old.account_status is distinct from 'deleted' then
    select recovery_days into v_recovery_days
    from public.student_purge_settings where singleton = true;
    new.deleted_at := now();
    new.purge_after := now() + make_interval(days => coalesce(v_recovery_days, 30));
  elsif old.account_status = 'deleted' and new.account_status <> 'deleted' then
    new.deleted_at := null;
    new.purge_after := null;
  elsif new.account_status = 'deleted' and new.deleted_at is not null and new.purge_after is null then
    new.purge_after := new.deleted_at + interval '30 days';
  end if;
  return new;
end;
$$;

comment on table public.student_purge_settings is
  'Super Admin-only controls. Standard Admin and Staff are fixed to 30-day retention.';
