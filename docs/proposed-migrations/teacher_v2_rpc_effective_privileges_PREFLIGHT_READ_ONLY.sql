-- REVIEW ONLY. READ-ONLY PREFLIGHT. DO NOT APPLY MIGRATIONS HERE.
-- Run only against an explicitly identified disposable/Preview database
-- after owner approval. All statements are SELECT; no DDL or writes.
-- Missing v2 functions return NULL rather than causing a function lookup error.
WITH expected(signature, expected_caller) AS (
 VALUES
 ('public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb)','super_admin'),
 ('public.teacher_v2_record_identity_verification(uuid,integer,text,text)','super_admin'),
 ('public.teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer)','authenticated'),
 ('public.teacher_v2_snapshot(uuid)','authenticated'),
 ('public.teacher_v2_set_assignment(uuid,text,text,text,text,text)','super_admin')
), resolved AS (
 SELECT signature,expected_caller,to_regprocedure(signature) AS function_oid
 FROM expected
)
SELECT signature,expected_caller,
       function_oid IS NOT NULL AS installed,
       CASE WHEN function_oid IS NULL THEN NULL
            ELSE pg_get_userbyid(p.proowner) END AS function_owner,
       CASE WHEN function_oid IS NULL THEN NULL
            ELSE p.prosecdef END AS security_definer,
       CASE WHEN function_oid IS NULL THEN NULL
            ELSE has_function_privilege('PUBLIC',function_oid,'EXECUTE') END AS public_can_execute,
       CASE WHEN function_oid IS NULL THEN NULL
            ELSE has_function_privilege('anon',function_oid,'EXECUTE') END AS anon_can_execute,
       CASE WHEN function_oid IS NULL THEN NULL
            ELSE has_function_privilege('authenticated',function_oid,'EXECUTE') END AS authenticated_can_execute
FROM resolved r LEFT JOIN pg_proc p ON p.oid=r.function_oid
ORDER BY signature;

-- Detect overloaded public teacher_v2 RPCs. Overloads require independent
-- grant and authorization review; one REVOKE does not protect another.
SELECT n.nspname AS schema_name,p.proname AS function_name,
       p.oid::regprocedure::text AS signature,
       pg_get_userbyid(p.proowner) AS function_owner,
       p.prosecdef AS security_definer,
       has_function_privilege('PUBLIC',p.oid,'EXECUTE') AS public_can_execute,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE 'teacher_v2_%'
ORDER BY p.proname,p.oid::regprocedure::text;

-- TRUNCATE bypasses RLS. Report privileges without attempting TRUNCATE.
SELECT to_regclass('public.user_roles') AS user_roles_relation,
       CASE WHEN to_regclass('public.user_roles') IS NULL THEN NULL
            ELSE has_table_privilege('anon','public.user_roles','TRUNCATE') END AS anon_can_truncate,
       CASE WHEN to_regclass('public.user_roles') IS NULL THEN NULL
            ELSE has_table_privilege('authenticated','public.user_roles','TRUNCATE') END AS authenticated_can_truncate;
