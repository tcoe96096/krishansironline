-- REVIEW ONLY: Teacher v2 deployment readiness / read-only checks.
-- This script never creates, updates, or deletes records or privileges.
-- Distinguish legacy enrollment from the proposed v2 application RPC.
SELECT 'legacy_enrollment_insert_policy' AS check_name,
       count(*)::text AS observed
FROM pg_policies
WHERE schemaname='public' AND tablename='teacher_enrollment_requests'
  AND cmd IN ('INSERT','ALL')
UNION ALL
SELECT 'v2_application_rpc_installed',
       (to_regprocedure('public.teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer)') IS NOT NULL)::text
UNION ALL
SELECT 'v2_review_rpc_installed',
       (to_regprocedure('public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb)') IS NOT NULL)::text
UNION ALL
SELECT 'anon_user_roles_truncate',
       CASE WHEN to_regclass('public.user_roles') IS NULL THEN 'missing'
            ELSE has_table_privilege('anon','public.user_roles','TRUNCATE')::text END
UNION ALL
SELECT 'authenticated_user_roles_truncate',
       CASE WHEN to_regclass('public.user_roles') IS NULL THEN 'missing'
            ELSE has_table_privilege('authenticated','public.user_roles','TRUNCATE')::text END;

-- The existence of an INSERT policy alone does not prove the runtime flow is safe.
-- Required before activation: authenticated teacher and super-admin runtime tests,
-- negative authorization tests, effective RPC grants, and verified restore evidence.
