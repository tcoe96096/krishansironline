-- Teacher v2: Admin review queue counters without exposing applicant data.
-- Additive, isolated to existing Teacher tables. Read only; not a grant of Teacher permissions.
BEGIN;
DO $preflight$
BEGIN
 IF to_regclass('public.teacher_profiles') IS NULL
    OR to_regprocedure('public.is_super_admin()') IS NULL THEN
  RAISE EXCEPTION 'Teacher v2 profiles or Super Admin guard unavailable';
 END IF;
 IF to_regprocedure('public.teacher_v2_queue_summary()') IS NOT NULL THEN
  RAISE EXCEPTION 'Existing summary RPC requires an explicit review before replacement';
 END IF;
END $preflight$;

CREATE FUNCTION public.teacher_v2_queue_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=''
AS $queue$
DECLARE v_counts jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) THEN
   RAISE EXCEPTION 'Super Admin required' USING ERRCODE='42501';
 END IF;
 SELECT jsonb_build_object(
    'total', count(*),
    'pending', count(*) FILTER (WHERE status='pending' AND submitted_at IS NOT NULL),
    'drafts', count(*) FILTER (WHERE status='pending' AND submitted_at IS NULL),
    'approved', count(*) FILTER (WHERE status='approved'),
    'rejected', count(*) FILTER (WHERE status='rejected'),
    'suspended', count(*) FILTER (WHERE status='suspended')
 ) INTO v_counts FROM public.teacher_profiles;
 RETURN v_counts;
END $queue$;

REVOKE ALL ON FUNCTION public.teacher_v2_queue_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_v2_queue_summary() TO authenticated;
COMMIT;

-- Counts are authoritative for the whole Teacher directory (not just one page).
-- No teacher name, email, phone or identity evidence is returned.
-- Tests: anonymous and ordinary Admin denied; Super Admin count only;
-- an independent pending submission increments pending, not drafts.
