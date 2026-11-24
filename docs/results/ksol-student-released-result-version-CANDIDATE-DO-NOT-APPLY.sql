-- REVIEW_ONLY / DO NOT APPLY.
-- Student-only lookup of the current released version; returns NULL unless
-- the student owns an eligible submitted attempt with a released result.
BEGIN;
CREATE OR REPLACE FUNCTION public.ksol_my_released_result_version(
  p_attempt_id uuid
) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT r.result_version
  FROM public.test_attempts a
  JOIN private.ksol_result_release r ON r.attempt_id=a.id
  WHERE auth.uid() IS NOT NULL
    AND p_attempt_id IS NOT NULL
    AND a.id=p_attempt_id
    AND a.student_id=auth.uid()
    AND a.status='submitted'
    AND public.student_account_is_eligible(auth.uid()) IS TRUE
    AND r.state='released';
$$;
REVOKE ALL ON FUNCTION public.ksol_my_released_result_version(uuid)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ksol_my_released_result_version(uuid)
  TO authenticated;
COMMIT;
-- The returned version is not proof of PDF access: the download Edge
-- Function independently rechecks current authorization at every request.
