-- REVIEW ONLY — NEVER EXECUTE without owner approval and Supabase security review.
-- Requires teacher_management_v2_schema_REVIEW_ONLY.sql and an existing verified
-- public.is_super_admin() RPC. Review its implementation and privileges first.
-- This file deliberately does NOT grant EXECUTE to authenticated/anon.
BEGIN;
CREATE OR REPLACE FUNCTION public.teacher_v2_issue_employee_id(p_teacher_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' AS $$
DECLARE v_id text; v_status text; v_attempt integer; v_constraint text;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(public.is_super_admin(),false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Super Admin authorization required' USING ERRCODE='42501';
  END IF;
  SELECT status,employee_id INTO v_status,v_id
    FROM public.teacher_profiles WHERE user_id=p_teacher_user_id FOR UPDATE;
  IF NOT FOUND OR v_status<>'approved' THEN
    RAISE EXCEPTION 'Only approved teacher profiles can receive an employee ID' USING ERRCODE='42501';
  END IF;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  FOR v_attempt IN 1..10 LOOP
    v_id := 'KSOL-T-' || upper(substring(replace(pg_catalog.gen_random_uuid()::text,'-','') from 1 for 12));
    BEGIN
      UPDATE public.teacher_profiles SET employee_id=v_id,updated_at=now()
        WHERE user_id=p_teacher_user_id AND employee_id IS NULL;
      INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason,details)
        VALUES(auth.uid(),p_teacher_user_id,'employee_id.issued',
          'Super Admin issued employee ID for approved teacher',
          jsonb_build_object('employee_id',v_id));
      RETURN v_id;
    EXCEPTION WHEN unique_violation THEN
      -- Never mask unrelated uniqueness failures in audit or future schema changes.
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
      IF v_constraint <> 'teacher_profiles_employee_id_key' THEN
        RAISE;
      END IF;
      -- Retry only an actual Employee ID collision; the subtransaction rolled back.
    END;
  END LOOP;
  RAISE EXCEPTION 'Could not allocate unique teacher employee ID';
END;
$$;
REVOKE ALL ON FUNCTION public.teacher_v2_issue_employee_id(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.teacher_v2_set_assignment(
 p_teacher_user_id uuid,p_class_level text,p_subject text,p_work_type text,
 p_action text,p_reason text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' AS $$
DECLARE v_assignment_id uuid; v_status text;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(public.is_super_admin(),false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Super Admin authorization required' USING ERRCODE='42501';
  END IF;
  IF p_reason IS NULL OR char_length(trim(p_reason)) NOT BETWEEN 12 AND 1000 THEN
    RAISE EXCEPTION 'A decision reason of 12–1000 characters is required';
  END IF;
  IF p_class_level IS NULL OR p_class_level NOT IN ('6','7','8','9','10','11','12')
    OR p_subject IS NULL OR p_subject NOT IN ('Political Science','History','Geography','Economics','Other')
    OR p_work_type IS NULL OR p_work_type NOT IN ('materials.draft','materials.review','assessment.draft','result.review')
    OR p_action IS NULL OR p_action NOT IN ('grant','revoke') THEN
    RAISE EXCEPTION 'Invalid assignment scope or action';
  END IF;
  SELECT status INTO v_status FROM public.teacher_profiles
    WHERE user_id=p_teacher_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teacher profile does not exist' USING ERRCODE='42501';
  END IF;
  -- Suspended or rejected teachers must never receive new grants, but their
  -- existing grants must remain revocable by Super Admin for incident response.
  IF p_action='grant' AND v_status<>'approved' THEN
    RAISE EXCEPTION 'Only approved teachers can receive assignments' USING ERRCODE='42501';
  END IF;
  IF p_action='grant' THEN
    SELECT id INTO v_assignment_id FROM public.teacher_assignments
      WHERE teacher_user_id=p_teacher_user_id AND class_level=p_class_level
      AND subject=p_subject AND work_type=p_work_type AND status='active' FOR UPDATE;
    IF v_assignment_id IS NOT NULL THEN
      RAISE EXCEPTION 'Active assignment already exists';
    END IF;
    INSERT INTO public.teacher_assignments
      (teacher_user_id,class_level,subject,work_type,assigned_by)
      VALUES(p_teacher_user_id,p_class_level,p_subject,p_work_type,auth.uid())
      RETURNING id INTO v_assignment_id;
  ELSE
    UPDATE public.teacher_assignments SET status='revoked',revoked_by=auth.uid(),revoked_at=now()
      WHERE teacher_user_id=p_teacher_user_id AND class_level=p_class_level
      AND subject=p_subject AND work_type=p_work_type AND status='active'
      RETURNING id INTO v_assignment_id;
    IF v_assignment_id IS NULL THEN RAISE EXCEPTION 'No active assignment to revoke'; END IF;
  END IF;
  INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason,details)
    VALUES(auth.uid(),p_teacher_user_id,'assignment.'||p_action,p_reason,
      jsonb_build_object('assignment_id',v_assignment_id,'class_level',p_class_level,
        'subject',p_subject,'work_type',p_work_type));
  RETURN v_assignment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.teacher_v2_set_assignment(uuid,text,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
-- Server-side scoped authorization primitive for future Study Material / Results RPCs.
-- The caller cannot choose another teacher's user ID. No EXECUTE grant is active.
-- Never use this boolean alone for a write: the consuming RPC must enforce the
-- same check inside its own transaction and validate the target resource scope.
CREATE OR REPLACE FUNCTION public.teacher_v2_has_active_assignment(
 p_class_level text,p_subject text,p_work_type text
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = '' AS $
DECLARE v_actor uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RETURN false; END IF;
  IF p_class_level IS NULL OR p_class_level NOT IN ('6','7','8','9','10','11','12')
     OR p_subject IS NULL OR p_subject NOT IN ('Political Science','History','Geography','Economics','Other')
     OR p_work_type IS NULL OR p_work_type NOT IN ('materials.draft','materials.review','assessment.draft','result.review')
  THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.teacher_profiles p
    JOIN public.teacher_assignments a ON a.teacher_user_id=p.user_id
    WHERE p.user_id=v_actor AND p.status='approved'
      AND a.status='active' AND a.revoked_at IS NULL
      AND a.class_level=p_class_level AND a.subject=p_subject
      AND a.work_type=p_work_type
  );
END;
$;
REVOKE ALL ON FUNCTION public.teacher_v2_has_active_assignment(text,text,text)
  FROM PUBLIC, anon, authenticated;
COMMIT;
-- SECURITY GATES BEFORE ANY EXECUTE GRANT:
-- Verify public.is_super_admin() uses auth.uid() and cannot be spoofed.
-- Add approved grant policies and negative RLS tests.
-- Explicitly grant EXECUTE to authenticated ONLY after independent security review.
-- Do not wire frontend RPC calls until that approval is complete.
