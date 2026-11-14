-- Preserve the student's name in immutable audit history while allowing
-- deletion of the student's Auth login identity. Admin actor identities remain
-- RESTRICTed so staff accountability cannot be silently erased.

alter table public.student_admin_audit
  add column if not exists student_name text;

update public.student_admin_audit a
set student_name = sp.student_name
from public.student_profiles sp
where sp.user_id = a.student_id
  and a.student_name is null;

alter table public.student_admin_audit
  alter column student_id drop not null;

alter table public.student_admin_audit
  drop constraint if exists student_admin_audit_student_id_fkey;

alter table public.student_admin_audit
  add constraint student_admin_audit_student_id_fkey
  foreign key (student_id) references auth.users(id) on delete set null;

create or replace function public.audit_student_profile_admin_change()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_action text := 'profile_update';
  v_reason text;
begin
  if not public.is_admin() then
    return new;
  end if;

  if old.approval_status is distinct from new.approval_status then
    v_action := case when new.approval_status = 'approved' then 'approve' else 'reject' end;
    v_reason := new.approval_note;
  elsif old.account_status is distinct from new.account_status then
    if new.account_status = 'suspended' then
      v_action := 'suspend';
      v_reason := new.suspension_reason;
    elsif new.account_status = 'deleted' then
      v_action := 'soft_delete';
      v_reason := new.deletion_reason;
    elsif old.account_status = 'deleted' and new.account_status = 'active' then
      v_action := 'restore';
    else
      v_action := 'activate';
    end if;
  end if;

  insert into public.student_admin_audit(
    student_id, student_name, actor_id, action, reason, before_state, after_state
  ) values (
    new.user_id, new.student_name, auth.uid(), v_action, v_reason, to_jsonb(old), to_jsonb(new)
  );
  return new;
end;
$function$;

comment on column public.student_admin_audit.student_name is
  'Durable student display-name snapshot retained for audit history after Auth identity deletion.';
