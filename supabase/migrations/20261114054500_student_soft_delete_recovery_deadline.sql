alter table public.student_profiles
  add column if not exists purge_after timestamptz;

create or replace function public.set_student_deletion_deadline()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.account_status = 'deleted' and old.account_status is distinct from 'deleted' then
    new.deleted_at := now();
    new.purge_after := now() + interval '30 days';
  elsif old.account_status = 'deleted' and new.account_status <> 'deleted' then
    new.deleted_at := null;
    new.purge_after := null;
  elsif new.account_status = 'deleted' and new.deleted_at is not null and new.purge_after is null then
    new.purge_after := new.deleted_at + interval '30 days';
  end if;
  return new;
end;
$$;

drop trigger if exists student_profile_deletion_deadline on public.student_profiles;
create trigger student_profile_deletion_deadline
before update of account_status on public.student_profiles
for each row execute function public.set_student_deletion_deadline();

create index if not exists student_profiles_purge_due_idx
  on public.student_profiles(purge_after)
  where account_status = 'deleted' and purge_after is not null;

comment on column public.student_profiles.purge_after is
  'Server-calculated 30-day soft-delete recovery deadline; null when not deleted.';