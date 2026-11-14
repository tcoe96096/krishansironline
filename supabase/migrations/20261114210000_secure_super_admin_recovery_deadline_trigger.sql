-- Ensure the deletion-deadline trigger can read the authoritative role
-- and policy settings despite RLS on user_roles and student_purge_settings.
-- The function uses auth.uid() as the actor and only reads the actor's role.
create or replace function public.set_student_deletion_deadline()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_recovery_days integer := 30;
begin
  if new.account_status = 'deleted' and old.account_status is distinct from 'deleted' then
    if exists (
      select 1
      from public.user_roles
      where user_id = auth.uid()
        and lower(role) = 'super_admin'
    ) then
      select recovery_days
      into v_recovery_days
      from public.student_purge_settings
      where singleton = true;
    else
      v_recovery_days := 30;
    end if;

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
$function$;

comment on function public.set_student_deletion_deadline() is
  'Server-side deletion deadline; Super Admin uses configured recovery_days, all other actors use fixed 30 days.';
