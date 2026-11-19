-- REVIEW ONLY. NO GRANTS OR REVOKES ARE EXECUTED BY THIS FILE.
-- Proposed acceptance contract for v2 privileged RPCs.
-- Lifecycle SQL grants authenticated EXECUTE, but the independent-evidence
-- override later REVOKEs it. Do not activate the browser review action until
-- the final installed privilege state is explicitly reviewed and tested.

WITH required(signature, expected_access) AS (
 VALUES
 ('public.teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer)','authenticated teacher'),
 ('public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb)','authorized super admin'),
 ('public.teacher_v2_record_identity_verification(uuid,integer,text,text)','authorized independent verifier')
), resolved AS (
 SELECT signature, expected_access, to_regprocedure(signature) AS oid
 FROM required
)
SELECT r.signature,r.expected_access,r.oid IS NOT NULL AS installed,
       CASE WHEN r.oid IS NULL THEN NULL ELSE has_function_privilege('anon',r.oid,'EXECUTE') END AS anon_can_execute,
       CASE WHEN r.oid IS NULL THEN NULL ELSE has_function_privilege('authenticated',r.oid,'EXECUTE') END AS authenticated_can_execute,
       CASE WHEN r.oid IS NULL THEN NULL ELSE p.prosecdef END AS security_definer
FROM resolved r LEFT JOIN pg_proc p ON p.oid=r.oid
ORDER BY r.signature;

-- Caution: authenticated EXECUTE is only a transport grant, NOT authorization.
-- SECURITY DEFINER functions must enforce role, identity, revision and
-- verification checks internally; test non-admin and self-approval denials.
-- The independent verifier's grant must not be exposed before a verified
-- identity/authorization design and negative runtime tests are approved.
