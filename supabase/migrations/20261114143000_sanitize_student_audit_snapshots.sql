-- Keep immutable student lifecycle audit useful without copying location
-- and other unnecessary profile attributes into JSON snapshots.
-- Applied only to the isolated Preview project.

create or replace function public.audit_student_profile_admin_change()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_action text := 'profile_update';
  v_reason text;
  v_before jsonb;
  v_after jsonb;
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

  -- Retain only the fields required to identify the academic record and
  -- explain the lifecycle transition. Never snapshot geographic fields.
  v_before := jsonb_build_object(
    'student_name', old.student_name,
    'class_level', old.class_level,
    'roll_no', old.roll_no,
    'school_name', old.school_name,
    'approval_status', old.approval_status,
    'account_status', old.account_status,
    'created_at', old.created_at,
    'approved_at', old.approved_at,
    'suspended_at', old.suspended_at,
    'deleted_at', old.deleted_at,
    'purge_after', old.purge_after
  );
  v_after := jsonb_build_object(
    'student_name', new.student_name,
    'class_level', new.class_level,
    'roll_no', new.roll_no,
    'school_name', new.school_name,
    'approval_status', new.approval_status,
    'account_status', new.account_status,
    'created_at', new.created_at,
    'approved_at', new.approved_at,
    'suspended_at', new.suspended_at,
    'deleted_at', new.deleted_at,
    'purge_after', new.purge_after
  );

  insert into public.student_admin_audit(
    student_id, student_name, actor_id, action, reason, before_state, after_state
  ) values (
    new.user_id, new.student_name, auth.uid(), v_action, v_reason, v_before, v_after
  );
  return new;
end;
$function$;

comment on function public.audit_student_profile_admin_change() is
  'Append-only admin lifecycle audit; JSON snapshots contain academic identity and lifecycle metadata only, excluding geographic/profile location fields.';
