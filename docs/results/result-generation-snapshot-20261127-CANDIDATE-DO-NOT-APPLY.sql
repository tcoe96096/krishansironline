-- REVIEW ONLY. Trusted server input for automatic PDF rendering.
-- Requires current Production-compatible tests, test_attempts, student_profiles,
-- user_roles and student_account_is_eligible(uuid). Never apply automatically.
BEGIN;
CREATE FUNCTION public.ksol_result_generation_snapshot(p_actor_id uuid,p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_snapshot jsonb;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id=p_actor_id AND lower(ur.role)='super_admin'
  ) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF p_attempt_id IS NULL THEN RAISE EXCEPTION 'Invalid attempt' USING ERRCODE='22023'; END IF;
  -- Use only the joined server records, never a browser-supplied student or score.
  SELECT pg_catalog.jsonb_build_object(
    'attemptId',a.id,'studentId',a.student_id,'studentName',s.student_name,
    'rollNo',s.roll_no,'classLevel',s.class_level,'schoolName',s.school_name,
    'testId',a.test_id,'testTitle',t.title,'subject',t.subject,'testClass',t.class_level,
    'score',a.score,'totalMarks',a.total_marks,'percentage',a.percentage,
    'correctCount',a.correct_count,'submittedAt',a.submitted_at
  ) INTO STRICT v_snapshot
  FROM public.test_attempts a
  JOIN public.student_profiles s ON s.user_id=a.student_id
  JOIN public.tests t ON t.id=a.test_id
  WHERE a.id=p_attempt_id AND a.status='submitted'
    AND public.student_account_is_eligible(a.student_id) IS TRUE
    AND a.submitted_at IS NOT NULL
    AND a.total_marks>0 AND a.score IS NOT NULL AND a.percentage IS NOT NULL
    AND a.percentage BETWEEN 0 AND 100
    AND nullif(btrim(s.student_name),'') IS NOT NULL
    AND nullif(btrim(s.roll_no),'') IS NOT NULL
    AND nullif(btrim(s.class_level),'') IS NOT NULL;
  RETURN v_snapshot;
EXCEPTION WHEN no_data_found OR too_many_rows THEN
  RAISE EXCEPTION 'Result generation requires one eligible complete submitted record' USING ERRCODE='22023';
END;
$$;
REVOKE ALL ON FUNCTION public.ksol_result_generation_snapshot(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ksol_result_generation_snapshot(uuid,uuid) TO service_role;
COMMIT;
-- The server must validate the actual caller JWT before passing p_actor_id.
-- This is a current-record snapshot, NOT a frozen historical identity or approval.
-- A later renderer must bind the snapshot and approved template version to PDF bytes,
-- recheck the attempt before approval, and store the exact immutable artifact.
