-- READ ONLY / PREVIEW PREFLIGHT. Never install, revoke, or change privileges here.
-- Verify function owner, SECURITY DEFINER, search_path configuration, exact
-- overloads and effective EXECUTE before any separate migration approval.
WITH required(name, expected_signature) AS (
 VALUES
 ('teacher_v2_save_application','public.teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer)'),
 ('teacher_v2_review','public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb)'),
 ('teacher_v2_record_identity_verification','public.teacher_v2_record_identity_verification(uuid,integer,text,text)')
), found AS (
 SELECT r.name,r.expected_signature,to_regprocedure(r.expected_signature) AS function_oid
 FROM required r
)
SELECT f.name,f.expected_signature,
       f.function_oid IS NOT NULL AS installed,
       CASE WHEN p.oid IS NULL THEN NULL ELSE pg_get_userbyid(p.proowner) END AS owner_name,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       CASE WHEN p.oid IS NULL THEN NULL ELSE
         EXISTS(SELECT 1 FROM unnest(COALESCE(p.proconfig,ARRAY[]::text[])) setting
                WHERE setting LIKE 'search_path=%')
       END AS explicit_search_path,
       CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('anon',p.oid,'EXECUTE') END AS anon_execute,
       CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('authenticated',p.oid,'EXECUTE') END AS authenticated_execute,
       (SELECT count(*) FROM pg_proc other
         JOIN pg_namespace n ON n.oid=other.pronamespace
         WHERE n.nspname='public' AND other.proname=f.name) AS overload_count
FROM found f LEFT JOIN pg_proc p ON p.oid=f.function_oid
ORDER BY f.name;
-- STOP if any required function is missing, unexpectedly overloaded, has
-- an unsafe owner/search_path, or exposes privileged behavior to anon.
-- Presence of a configured search_path is NOT proof of safety: inspect its
-- exact value and all unqualified names, then run authenticated negative tests.
-- An authenticated EXECUTE grant is a transport capability, not approval.
