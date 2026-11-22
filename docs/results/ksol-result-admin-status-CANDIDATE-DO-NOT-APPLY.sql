-- REVIEW_ONLY / DO NOT APPLY. Admin-only read of current release state.
-- Does not include student data, PDF paths, signed URLs or file hashes.
BEGIN;
CREATE OR REPLACE FUNCTION public.ksol_result_admin_status(p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_info jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  IF p_attempt_id IS NULL THEN
    RAISE EXCEPTION 'Invalid attempt' USING ERRCODE='22023';
  END IF;
  SELECT pg_catalog.jsonb_build_object('version',r.result_version,'state',r.state)
    INTO v_info FROM private.ksol_result_release r
    WHERE r.attempt_id=p_attempt_id;
  RETURN v_info;
END;
$$;
REVOKE ALL ON FUNCTION public.ksol_result_admin_status(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ksol_result_admin_status(uuid) TO authenticated;
COMMIT;
