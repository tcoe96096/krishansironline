-- REVIEW_ONLY / DO NOT APPLY
-- Order: atomic release table -> student access Boolean RPC -> this manifest RPC.
-- This only returns an opaque private object key for an authorized student.
-- It does NOT create signed URLs and must not be called with service-role JWT.
BEGIN;
CREATE OR REPLACE FUNCTION public.ksol_result_pdf_manifest(
  p_attempt_id uuid, p_expected_version integer
) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT r.pdf_object_key
  FROM private.ksol_result_release r
  WHERE auth.uid() IS NOT NULL
    AND p_attempt_id IS NOT NULL
    AND p_expected_version IS NOT NULL
    AND p_expected_version > 0
    AND r.attempt_id = p_attempt_id
    AND r.result_version = p_expected_version
    AND r.state = 'released'
    AND public.ksol_can_view_released_result(p_attempt_id,p_expected_version) IS TRUE;
$$;
REVOKE ALL ON FUNCTION public.ksol_result_pdf_manifest(uuid,integer)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ksol_result_pdf_manifest(uuid,integer)
  TO authenticated;
COMMIT;
-- No public Storage policy is granted here. Never expose a storage URL by SQL.
-- The Edge endpoint must verify a real user session, call this RPC with the
-- user's JWT and only then sign the returned key with a server-held secret.
-- A signed URL remains valid for its short TTL after later revocation.
