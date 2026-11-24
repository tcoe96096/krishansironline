-- REVIEW_ONLY / DO NOT APPLY
-- Candidate for student result visibility gate. Requires atomic transition
-- migration, real JWT tests and separately approved Production rollout.
-- IMPORTANT: Boolean gate alone does NOT protect storage signed URLs or
-- existing endpoints. Every read/download endpoint must enforce it.
BEGIN;
CREATE OR REPLACE FUNCTION public.ksol_can_view_released_result(
 p_attempt_id uuid,p_expected_version integer
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT auth.uid() IS NOT NULL
   AND p_attempt_id IS NOT NULL
   AND p_expected_version IS NOT NULL
   AND EXISTS (
     SELECT 1
     FROM public.test_attempts a
     JOIN private.ksol_result_release r ON r.attempt_id=a.id
     WHERE a.id=p_attempt_id
       AND a.student_id=auth.uid()
       AND a.status='submitted'
       AND public.student_account_is_eligible(auth.uid())
       AND r.result_version=p_expected_version
       AND r.state='released'
   );
$$;
REVOKE ALL ON FUNCTION public.ksol_can_view_released_result(uuid,integer)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ksol_can_view_released_result(uuid,integer)
  TO authenticated;
COMMIT;
-- No storage URL, PDF, student result data or mutation is returned here.
-- On revocation, newly authorized reads must fail closed. Previously
-- downloaded files cannot be recalled; use short-lived links and avoid
-- embedding public storage URLs.
