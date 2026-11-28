-- REVIEW_ONLY / DO NOT APPLY. Result Card SINGLE-TRANSACTION candidate.
-- Deploy only after independent backup+restore, JWT checks and owner approval.
-- No teacher/student/studio migrations included. Never auto-apply on PR merge.
BEGIN;
-- Never silently overwrite a preexisting release function/table when a
-- Preview/Production database has changed since this candidate was reviewed.
DO $ksol_result_preflight$
BEGIN
  IF pg_catalog.to_regclass('private.ksol_result_release') IS NOT NULL
    OR pg_catalog.to_regclass('private.ksol_result_request') IS NOT NULL
    OR pg_catalog.to_regclass('private.ksol_result_audit') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.ksol_result_transition(uuid,integer,text,uuid)') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.ksol_result_approve_pdf(uuid,integer,text,uuid)') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.ksol_result_approve_pdf(uuid,uuid,integer,text,uuid)') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.ksol_result_approve_pdf(uuid,uuid,integer,text,uuid,jsonb)') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.ksol_can_view_released_result(uuid,integer)') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.ksol_result_pdf_manifest(uuid,integer)') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.ksol_my_released_result_version(uuid)') IS NOT NULL
    OR pg_catalog.to_regprocedure('public.ksol_result_admin_status(uuid)') IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM storage.buckets
      WHERE id='result-cards-private' OR name='result-cards-private'
    ) THEN
    RAISE EXCEPTION 'Result Card objects already exist: stop and reconcile existing deployment';
  END IF;
END;
$ksol_result_preflight$;
-- MODULE 1 docs/results/ksol-result-atomic-transition-executable-CANDIDATE-DO-NOT-APPLY.sql
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.ksol_result_release (
  attempt_id uuid PRIMARY KEY REFERENCES public.test_attempts(id) ON DELETE RESTRICT,
  recipient_id uuid NOT NULL,
  result_version integer NOT NULL DEFAULT 1 CHECK(result_version>0),
  -- Immutable, version-bound private PDF identity; no unbound releases.
  artifact_sha256 text NOT NULL CHECK (artifact_sha256 ~ '^[0-9a-f]{64}$'),
  pdf_object_key text NOT NULL UNIQUE CHECK (
    pdf_object_key = attempt_id::text || '/v' || result_version::text || '/' || artifact_sha256 || '.pdf'
  ),
  state text NOT NULL DEFAULT 'approved' CHECK(state IN ('approved','released','revoked')),
  released_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private.ksol_result_request (
  actor_id uuid NOT NULL,
  operation text NOT NULL CHECK(operation IN ('release','revoke','approve')),
  artifact_sha256 text CHECK(artifact_sha256 IS NULL OR artifact_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT ksol_request_approval_digest CHECK(
    (operation='approve' AND artifact_sha256 IS NOT NULL) OR
    (operation IN ('release','revoke') AND artifact_sha256 IS NULL)
  ),
  request_key uuid NOT NULL,
  attempt_id uuid NOT NULL,
  expected_version integer NOT NULL,
  outcome text NOT NULL,
  PRIMARY KEY(actor_id,operation,request_key)
);
CREATE TABLE IF NOT EXISTS private.ksol_result_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid NOT NULL,
  attempt_id uuid NOT NULL,
  result_version integer NOT NULL,
  operation text NOT NULL,
  previous_state text NOT NULL,
  next_state text NOT NULL,
  request_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.ksol_result_release ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ksol_result_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ksol_result_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.ksol_result_release,private.ksol_result_request,
  private.ksol_result_audit FROM PUBLIC,anon,authenticated;
-- Do not change schema-wide grants: private may be shared by unrelated modules.
-- Deployment gate: independently verify private schema USAGE privileges for
-- anon/authenticated and confirm no existing policy exposes these tables.
-- Only the three newly named result tables have their direct grants revoked.
CREATE FUNCTION public.ksol_result_transition(
  p_attempt_id uuid,p_expected_version integer,p_operation text,p_request_key uuid
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_row private.ksol_result_release%ROWTYPE;
  v_prior private.ksol_result_request%ROWTYPE;
  v_status text;
  v_student uuid;
  v_attempt_locked uuid;
  v_next text;
BEGIN
  IF v_actor IS NULL OR public.is_super_admin() IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  IF p_attempt_id IS NULL OR p_expected_version IS NULL OR p_expected_version<1
    OR p_request_key IS NULL OR p_operation IS NULL
    OR p_operation NOT IN ('release','revoke') THEN
    RAISE EXCEPTION 'Invalid transition request' USING ERRCODE='22023';
  END IF;
  -- Serialize all operations for the same actor, operation and key.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_actor::text||':'||p_operation||':'||p_request_key::text,0)
  );
  SELECT * INTO v_prior FROM private.ksol_result_request
    WHERE actor_id=v_actor AND operation=p_operation AND request_key=p_request_key;
  IF FOUND THEN
    IF v_prior.attempt_id<>p_attempt_id OR v_prior.expected_version<>p_expected_version THEN
      RAISE EXCEPTION 'Conflicting request key' USING ERRCODE='23505';
    END IF;
    RETURN v_prior.outcome;
  END IF;
  -- Lock attempt first so status/ownership cannot race this transition.
  SELECT a.id,a.status,a.student_id INTO v_attempt_locked,v_status,v_student
    FROM public.test_attempts a WHERE a.id=p_attempt_id FOR UPDATE;
  IF v_attempt_locked IS NULL THEN
    RAISE EXCEPTION 'Attempt not available' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_row FROM private.ksol_result_release
    WHERE attempt_id=p_attempt_id FOR UPDATE;
  IF NOT FOUND OR v_row.result_version<>p_expected_version THEN
    RAISE EXCEPTION 'Result version not available' USING ERRCODE='22023';
  END IF;
  -- Only publishing requires a currently submitted/eligible student.
  -- Emergency revocation must remain possible even if the student's account
  -- is disabled or attempt status later changes.
  IF p_operation='release' AND (
    v_status IS DISTINCT FROM 'submitted' OR v_student IS NULL
    OR v_row.recipient_id IS DISTINCT FROM v_student
    OR public.student_account_is_eligible(v_student) IS DISTINCT FROM TRUE
  ) THEN
    RAISE EXCEPTION 'Result not eligible' USING ERRCODE='22023';
  END IF;
  IF p_operation='release' AND v_row.state='approved' THEN v_next:='released';
  ELSIF p_operation='revoke' AND v_row.state='released' THEN v_next:='revoked';
  ELSE RAISE EXCEPTION 'Invalid result transition' USING ERRCODE='22023';
  END IF;
  UPDATE private.ksol_result_release SET state=v_next,
    released_at=CASE WHEN v_next='released' THEN pg_catalog.now() ELSE released_at END,
    revoked_at=CASE WHEN v_next='revoked' THEN pg_catalog.now() ELSE revoked_at END,
    updated_at=pg_catalog.now()
    WHERE attempt_id=p_attempt_id;
  INSERT INTO private.ksol_result_audit
    (actor_id,attempt_id,result_version,operation,previous_state,next_state,request_key)
    VALUES(v_actor,p_attempt_id,v_row.result_version,p_operation,v_row.state,v_next,p_request_key);
  INSERT INTO private.ksol_result_request
    (actor_id,operation,request_key,attempt_id,expected_version,outcome)
    VALUES(v_actor,p_operation,p_request_key,p_attempt_id,p_expected_version,v_next);
  RETURN v_next;
END;
$$;
REVOKE ALL ON FUNCTION public.ksol_result_transition(uuid,integer,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ksol_result_transition(uuid,integer,text,uuid) TO authenticated;
-- The function itself enforces super-admin authorization; no direct table grants.

-- MODULE 2 docs/results/ksol-result-pdf-private-bucket-CANDIDATE-DO-NOT-APPLY.sql
-- Fail closed on an existing bucket; do not silently accept a public bucket
-- or changed MIME/size rules. A separate operator review is required.
DO $ksol_bucket_guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id='result-cards-private' OR name='result-cards-private'
  ) THEN
    RAISE EXCEPTION 'Result card bucket already exists; manual review required';
  END IF;
END;
$ksol_bucket_guard$;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES (
  'result-cards-private',
  'result-cards-private',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
);
-- No storage.objects policies are added here. A private bucket does NOT
-- automatically guarantee safe service-role access or safe signed URLs.
-- No authenticated/anon direct object SELECT, INSERT, UPDATE, DELETE grants.
-- Upload and download must be implemented through an authenticated server
-- endpoint that checks immutable result version, ownership, release state
-- and current revocation immediately before creating a short-lived URL.
-- Never reuse teacher-profile, teacher-resume or Studio buckets.

-- MODULE 3 docs/results/ksol-result-approve-pdf-CANDIDATE-DO-NOT-APPLY.sql
CREATE FUNCTION public.ksol_result_approve_pdf(
  p_actor_id uuid, p_attempt_id uuid, p_expected_version integer,
  p_artifact_sha256 text, p_request_key uuid, p_expected_snapshot jsonb
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid := p_actor_id;
  v_prior private.ksol_result_request%ROWTYPE;
  v_row private.ksol_result_release%ROWTYPE;
  v_attempt_locked uuid;
  v_status text;
  v_student uuid;
  v_object_key text;
  v_object_exists boolean;
  v_previous text;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=v_actor AND lower(ur.role)='super_admin') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  IF p_attempt_id IS NULL OR p_expected_version IS NULL OR p_expected_version < 1
    OR p_request_key IS NULL OR p_artifact_sha256 IS NULL
    OR p_expected_snapshot IS NULL OR jsonb_typeof(p_expected_snapshot) IS DISTINCT FROM 'object'
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
  IF public.ksol_result_generation_snapshot(v_actor,p_attempt_id) IS DISTINCT FROM p_expected_snapshot THEN
    RAISE EXCEPTION 'Result changed after preparation; regenerate or review PDF' USING ERRCODE='22023';
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
      AND CASE WHEN o.metadata->>'size' ~ '^[0-9]{1,8}$' THEN (o.metadata->>'size')::bigint BETWEEN 8 AND 10485760 ELSE false END
  ) INTO v_object_exists;
  IF v_object_exists IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Private PDF artifact not found or invalid' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_row FROM private.ksol_result_release
    WHERE attempt_id=p_attempt_id FOR UPDATE;
  IF FOUND THEN
    -- A revised result must advance exactly one version from revoked state.
    IF v_row.state IS DISTINCT FROM 'revoked'
      OR v_row.recipient_id IS DISTINCT FROM v_student
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
      (attempt_id,recipient_id,result_version,artifact_sha256,pdf_object_key,state)
      VALUES(p_attempt_id,v_student,p_expected_version,p_artifact_sha256,v_object_key,'approved');
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
REVOKE ALL ON FUNCTION public.ksol_result_approve_pdf(uuid,uuid,integer,text,uuid,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ksol_result_approve_pdf(uuid,uuid,integer,text,uuid,jsonb)
  TO service_role;

-- MODULE 4 docs/results/ksol-result-student-access-gate-CANDIDATE-DO-NOT-APPLY.sql
CREATE FUNCTION public.ksol_can_view_released_result(
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
       AND r.recipient_id=auth.uid()
       AND a.status='submitted'
       AND public.student_account_is_eligible(auth.uid()) IS TRUE
       AND r.result_version=p_expected_version
       AND r.state='released'
   );
$$;
REVOKE ALL ON FUNCTION public.ksol_can_view_released_result(uuid,integer)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ksol_can_view_released_result(uuid,integer)
  TO authenticated;

-- MODULE 5 docs/results/ksol-result-pdf-manifest-CANDIDATE-DO-NOT-APPLY.sql
CREATE FUNCTION public.ksol_result_pdf_manifest(
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

-- MODULE 6 docs/results/ksol-student-released-result-version-CANDIDATE-DO-NOT-APPLY.sql
CREATE FUNCTION public.ksol_my_released_result_version(
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
       AND r.recipient_id=auth.uid()
    AND a.status='submitted'
    AND public.student_account_is_eligible(auth.uid()) IS TRUE
    AND r.state='released';
$$;
REVOKE ALL ON FUNCTION public.ksol_my_released_result_version(uuid)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ksol_my_released_result_version(uuid)
  TO authenticated;

-- MODULE 7 docs/results/ksol-result-admin-status-CANDIDATE-DO-NOT-APPLY.sql
CREATE FUNCTION public.ksol_result_admin_status(p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_info jsonb;
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() IS DISTINCT FROM TRUE THEN
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
