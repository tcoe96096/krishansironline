-- KSOL Result Card: READ-ONLY catalog preflight for Preview and Production
-- Run manually in Supabase SQL editor; SELECT statements only.
-- Compare outputs by project. Never paste credentials or row data into PRs.
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('public','private')
  AND table_name IN (
    'result_card_templates','result_card_template_audit',
    'result_delivery_notices','result_delivery_audit',
    'result_staff_grants','result_staff_grant_audit','test_attempts'
  ) ORDER BY 1,2;

SELECT table_name,column_name,udt_name,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name LIKE 'result_%'
ORDER BY table_name,ordinal_position;

SELECT n.nspname AS schema,p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS signature,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       pg_get_userbyid(p.proowner) AS function_owner,
       p.proacl AS execute_grants
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','private')
  AND (p.proname LIKE '%result%' OR p.proname LIKE '%report%')
ORDER BY 1,2;

SELECT n.nspname AS schema,c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','p')
  AND c.relname LIKE 'result_%' ORDER BY 1,2;

SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname IN ('public','private')
  AND tablename LIKE 'result_%' ORDER BY 1,2,3;

SELECT tc.table_name,tc.constraint_name,tc.constraint_type,
       pg_get_constraintdef(c.oid) AS definition
FROM information_schema.table_constraints tc
JOIN pg_namespace n ON n.nspname=tc.table_schema
JOIN pg_class t ON t.relname=tc.table_name AND t.relnamespace=n.oid
JOIN pg_constraint c ON c.conrelid=t.oid AND c.conname=tc.constraint_name
WHERE tc.table_schema='public' AND tc.table_name LIKE 'result_%'
ORDER BY 1,2;

SELECT table_name,grantee,privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name LIKE 'result_%'
ORDER BY 1,2,3;

-- Never run deployment or GRANT/REVOKE from this file.
