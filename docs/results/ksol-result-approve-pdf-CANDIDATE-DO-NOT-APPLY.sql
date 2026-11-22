-- REVIEW_ONLY / DO NOT APPLY
-- Order: atomic result tables -> private PDF bucket -> this approval RPC.
-- No SQL has been deployed. The digest must come from a trusted server upload;
-- database checks object existence, identity, PDF MIME and stored size, but it
-- cannot independently recompute file bytes from storage.objects metadata.
BEGIN;
CREATE OR REPLACE FUNCTION public.ksol_result_approve_pdf(
  p_attempt_id uuid, p_expected_version integer,
  p_artifact_sha256 text, p_request_key uuid
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_prior private.ksol_result_request%ROWTYPE;
  v_row private.ksol_result_release%ROWTYPE;
  v_attempt_locked uuid;
  v_status text;
  v_student uuid;
  v_object_key text;
  v_object_exists boolean;
  v_previous text;
BEGIN
  IF v_actor IS NULL OR NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  IF p_attempt_id IS NULL OR p_expected_version IS NULL OR p_expected_version < 1
    OR p_request_key IS NULL OR p_artifact_sha256 IS NULL
    OR p_artifact_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid approval request' USING ERRCODE='22023';
  END IF;
  -- Serialize retries with the same actor and approval key.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_actor::text||':approve:'||p_request_key::text,0)
  );
  SELECT * INTO v_prior FROM private.ksol_result_request
    WHERE actor_id=v_actor AND operation='approve' AND request_key=p_request_key;
  IF FOUND THEN
    IF v_prior.attempt_id IS DISTINCT FROM p_attempt_id
      OR v_prior.expected_version IS DISTINCT FROM p_expected_version
      OR v_prior.artifact_sha256 IS DISTINCT FROM p_artifact_sha256 THEN
      RAISE EXCEPTION 'Conflicting approval request key' USING ERRCODE='23505';
    END IF;
    RETURN v_prior.outcome;
  END IF;

  SELECT a.id,a.status,a.student_id INTO v_attempt_locked,v_status,v_student
    FROM public.test_attempts a WHERE a.id=p_attempt_id FOR UPDATE;
  IF v_attempt_locked IS NULL OR v_status IS DISTINCT FROM 'submitted'
    OR v_student IS NULL
    OR public.student_account_is_eligible(v_student) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Attempt is not eligible' USING ERRCODE='22023';
  END IF;
  v_object_key := p_attempt_id::text || '/v' || p_expected_version::text
    || '/' || p_artifact_sha256 || '.pdf';

  SELECT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='result-cards-private'
      AND o.name=v_object_key
      AND o.is_delete_marker IS FALSE
      AND o.archived_at IS NULL
      AND o.metadata->>'mimetype'='application/pdf'
      AND (o.metadata->>'size')::bigint BETWEEN 1 AND 10485760
  ) INTO v_object_exists;
  IF v_object_exists IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Private PDF artifact not found or invalid' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_row FROM private.ksol_result_release
    WHERE attempt_id=p_attempt_id FOR UPDATE;
  IF FOUND THEN
    -- A revised result must advance exactly one version from revoked state.
    IF v_row.state IS DISTINCT FROM 'revoked'
      OR p_expected_version <> v_row.result_version+1 THEN
      RAISE EXCEPTION 'Existing result must first be revoked' USING ERRCODE='22023';
    END IF;
    v_previous := 'revoked';
    UPDATE private.ksol_result_release SET
      result_version=p_expected_version,
      artifact_sha256=p_artifact_sha256,
      pdf_object_key=v_object_key,
      state='approved',
      released_at=NULL,revoked_at=NULL,updated_at=pg_catalog.now()
      WHERE attempt_id=p_attempt_id;
  ELSE
    IF p_expected_version <> 1 THEN
      RAISE EXCEPTION 'First result version must be 1' USING ERRCODE='22023';
    END IF;
    v_previous := 'not_created';
    INSERT INTO private.ksol_result_release
      (attempt_id,result_version,artifact_sha256,pdf_object_key,state)
      VALUES(p_attempt_id,p_expected_version,p_artifact_sha256,v_object_key,'approved');
  END IF;

  INSERT INTO private.ksol_result_audit
    (actor_id,attempt_id,result_version,operation,previous_state,next_state,request_key)
    VALUES(v_actor,p_attempt_id,p_expected_version,'approve',v_previous,'approved',p_request_key);
  INSERT INTO private.ksol_result_request
    (actor_id,operation,request_key,attempt_id,expected_version,artifact_sha256,outcome)
    VALUES(v_actor,'approve',p_request_key,p_attempt_id,p_expected_version,p_artifact_sha256,'approved');
  RETURN 'approved';
END;
$$;
REVOKE ALL ON FUNCTION public.ksol_result_approve_pdf(uuid,integer,text,uuid)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ksol_result_approve_pdf(uuid,integer,text,uuid)
  TO authenticated;
COMMIT;
-- NO AUTO-RELEASE: approved != released. Separate super-admin release RPC
-- and independent JWT tests must pass before student PDF access is enabled.
-- Upload should be immutable (no upsert). Storage metadata is not a proof
-- that supplied SHA-256 matches actual bytes; trusted upload computes digest.
