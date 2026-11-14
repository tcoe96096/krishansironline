-- Sanitize historical Preview audit snapshots as well as future trigger writes.
-- Keep durable student name and lifecycle evidence; remove arbitrary profile JSON
-- and free-text reasons that could contain unnecessary personal details.

update public.student_admin_audit
set before_state = jsonb_strip_nulls(jsonb_build_object(
      'student_name', student_name,
      'class_level', before_state->'class_level',
      'roll_no', before_state->'roll_no',
      'school_name', before_state->'school_name',
      'approval_status', before_state->'approval_status',
      'account_status', before_state->'account_status',
      'created_at', before_state->'created_at',
      'approved_at', before_state->'approved_at',
      'suspended_at', before_state->'suspended_at',
      'deleted_at', before_state->'deleted_at',
      'purge_after', before_state->'purge_after'
    )),
    after_state = jsonb_strip_nulls(jsonb_build_object(
      'student_name', student_name,
      'class_level', after_state->'class_level',
      'roll_no', after_state->'roll_no',
      'school_name', after_state->'school_name',
      'approval_status', after_state->'approval_status',
      'account_status', after_state->'account_status',
      'created_at', after_state->'created_at',
      'approved_at', after_state->'approved_at',
      'suspended_at', after_state->'suspended_at',
      'deleted_at', after_state->'deleted_at',
      'purge_after', after_state->'purge_after'
    )),
    reason = null;
