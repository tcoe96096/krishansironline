-- REVIEW_ONLY / DO NOT APPLY. Executable SQL candidate, NOT deployed.
-- Preconditions: verified backup+disposable restore, security owner review,
-- independent explicit owner approval. No delivery, storage or website changes.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.ksol_result_release (
  attempt_id uuid PRIMARY KEY REFERENCES public.test_attempts(id) ON DELETE RESTRICT,
  result_version integer NOT NULL DEFAULT 1 CHECK(result_version>0),
  state text NOT NULL DEFAULT 'approved' CHECK(state IN ('approved','released','revoked')),
  released_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private.ksol_result_request (
  actor_id uuid NOT NULL,
  operation text NOT NULL CHECK(operation IN ('release','revoke')),
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
REVOKE ALL ON SCHEMA private FROM PUBLIC,anon,authenticated;
-- Do not grant private schema usage to clients. RPC remains in public.
CREATE OR REPLACE FUNCTION public.ksol_result_transition(
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
  IF v_actor IS NULL OR NOT public.is_super_admin() THEN
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
  IF v_status IS DISTINCT FROM 'submitted' OR v_student IS NULL
    OR NOT public.student_account_is_eligible(v_student) THEN
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
COMMIT;
-- NO AUTOMATIC RELEASE: records require separately authorized initialization
-- from a verified approved result version. No PDF/file access RPC included.
-- Before execution inspect function owner/BYPASSRLS, existing private schema,
-- schema privileges, audit retention and restore proof.
