-- Integration smoke against a DISPOSABLE synthetic PostgreSQL fixture ONLY.
\set ON_ERROR_STOP on
DO $$
BEGIN
 IF has_function_privilege('anon',
   'public.ksol_result_approve_pdf(uuid,integer,text,uuid)','EXECUTE')
 OR has_function_privilege('anon',
   'public.ksol_result_transition(uuid,integer,text,uuid)','EXECUTE')
 OR has_function_privilege('anon',
   'public.ksol_result_pdf_manifest(uuid,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Anonymous RPC permission leak';
 END IF;
 IF has_table_privilege('authenticated','private.ksol_result_release','SELECT')
 THEN RAISE EXCEPTION 'Private release table readable by client';
 END IF;
END $$;

SET ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE v_attempt uuid := '33333333-3333-4333-8333-333333333333';
BEGIN
 IF public.ksol_result_approve_pdf(v_attempt,1,repeat('a',64),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') IS DISTINCT FROM 'approved'
 THEN RAISE EXCEPTION 'Initial approval failed';
 END IF;
 IF public.ksol_result_transition(v_attempt,1,'release',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') IS DISTINCT FROM 'released'
 THEN RAISE EXCEPTION 'Release failed';
 END IF;
 IF public.ksol_result_transition(v_attempt,1,'release',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') IS DISTINCT FROM 'released'
 THEN RAISE EXCEPTION 'Idempotent release failed';
 END IF;
END $$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE v_attempt uuid := '33333333-3333-4333-8333-333333333333';
BEGIN
 IF public.ksol_my_released_result_version(v_attempt) IS DISTINCT FROM 1
 THEN RAISE EXCEPTION 'Student missing released version';
 END IF;
 IF public.ksol_can_view_released_result(v_attempt,1) IS DISTINCT FROM TRUE
 THEN RAISE EXCEPTION 'Student owner is denied';
 END IF;
 IF public.ksol_result_pdf_manifest(v_attempt,1) IS DISTINCT FROM
    v_attempt::text||'/v1/'||repeat('a',64)||'.pdf'
 THEN RAISE EXCEPTION 'Student PDF manifest mismatch';
 END IF;
 IF public.ksol_can_view_released_result(v_attempt,2) IS NOT FALSE
 THEN RAISE EXCEPTION 'Stale/incorrect version allowed';
 END IF;
END $$;

-- Disable student to verify emergency admin revocation still succeeds.
RESET ROLE;
UPDATE public.student_profiles SET account_status='inactive'
WHERE user_id='22222222-2222-4222-8222-222222222222';
SET ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE v_attempt uuid := '33333333-3333-4333-8333-333333333333';
BEGIN
 IF public.ksol_result_transition(v_attempt,1,'revoke',
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc') IS DISTINCT FROM 'revoked'
 THEN RAISE EXCEPTION 'Emergency revocation failed';
 END IF;
 BEGIN
   PERFORM public.ksol_result_transition(v_attempt,1,NULL::text,
     'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
   RAISE EXCEPTION 'NULL operation unexpectedly allowed';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
END $$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
BEGIN
 IF public.ksol_my_released_result_version(
  '33333333-3333-4333-8333-333333333333') IS NOT NULL
 THEN RAISE EXCEPTION 'Revoked result version leaked';
 END IF;
 IF public.ksol_result_pdf_manifest(
  '33333333-3333-4333-8333-333333333333',1) IS NOT NULL
 THEN RAISE EXCEPTION 'Revoked PDF manifest leaked';
 END IF;
END $$;

RESET ROLE;
UPDATE public.student_profiles SET account_status='active'
WHERE user_id='22222222-2222-4222-8222-222222222222';
SET ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $$
DECLARE v_attempt uuid := '33333333-3333-4333-8333-333333333333';
BEGIN
 IF public.ksol_result_approve_pdf(v_attempt,2,repeat('b',64),
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') IS DISTINCT FROM 'approved'
 THEN RAISE EXCEPTION 'Revoked result version advancement failed';
 END IF;
 IF public.ksol_result_transition(v_attempt,2,'release',
   'ffffffff-ffff-4fff-8fff-ffffffffffff') IS DISTINCT FROM 'released'
 THEN RAISE EXCEPTION 'Second version release failed';
 END IF;
END $$;

SELECT pg_catalog.set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
DO $$
DECLARE v_attempt uuid := '33333333-3333-4333-8333-333333333333';
BEGIN
 IF public.ksol_my_released_result_version(v_attempt) IS DISTINCT FROM 2
 THEN RAISE EXCEPTION 'Version two not visible';
 END IF;
 IF public.ksol_can_view_released_result(v_attempt,1) IS NOT FALSE
 THEN RAISE EXCEPTION 'Previous version still visible';
 END IF;
END $$;
RESET ROLE;
SELECT 'KSOL_POSTGRES_SYNTHETIC_SMOKE_PASS' AS status;
