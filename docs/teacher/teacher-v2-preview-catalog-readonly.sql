-- Teacher v2 Preview catalog audit — READ ONLY / NO-GO
-- Run manually in a read-only transaction against the intended Preview project.
-- This script never installs RPCs, changes grants, creates policies, or modifies data.
-- Record project ID, commit SHA, execution identity and timestamp separately.
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database_name, current_user AS audit_actor, now() AS audit_time;
-- Existence alone does not prove secure RPC behavior.
SELECT p.oid::regprocedure::text AS rpc_signature,
       p.prosecdef AS security_definer,
       p.provolatile AS volatility,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('teacher_v2_save_application','teacher_v2_review','teacher_v2_snapshot')
ORDER BY p.proname,p.oid::regprocedure::text;
-- Zero rows for an expected RPC is a BLOCKER; check against all three names above.
SELECT required.name AS expected_rpc,
       EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
              WHERE n.nspname='public' AND p.proname=required.name) AS exists_in_public
FROM (VALUES ('teacher_v2_save_application'),('teacher_v2_review'),('teacher_v2_snapshot')) AS required(name);
-- Known high-risk privilege: both values must be false before approval.
SELECT role_name,
       has_table_privilege(role_name,'public.user_roles','TRUNCATE') AS can_truncate_user_roles
FROM (VALUES ('anon'),('authenticated')) AS roles(role_name);
-- Policy and RLS inventory; inspect USING/WITH CHECK independently.
SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       p.polname AS policy_name,p.polcmd AS command,
       pg_get_expr(p.polqual,p.polrelid) AS using_expr,
       pg_get_expr(p.polwithcheck,p.polrelid) AS check_expr
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid=c.oid
WHERE n.nspname='public' AND c.relkind IN ('r','p')
  AND (c.relname LIKE 'teacher%' OR c.relname IN ('user_roles','teacher_applications'))
ORDER BY c.relname,p.polname;
-- Storage bucket privacy is metadata only, not proof of object authorization.
SELECT id,name,public,file_size_limit,allowed_mime_types
FROM storage.buckets WHERE id LIKE '%teacher%' OR name LIKE '%teacher%'
ORDER BY id;
-- Effective privileges can arise from PUBLIC or inherited role memberships, not only direct grants.
SELECT role_name,
       has_table_privilege(role_name,'public.user_roles','SELECT') AS can_select_user_roles,
       has_table_privilege(role_name,'public.user_roles','INSERT') AS can_insert_user_roles,
       has_table_privilege(role_name,'public.user_roles','UPDATE') AS can_update_user_roles,
       has_table_privilege(role_name,'public.user_roles','DELETE') AS can_delete_user_roles,
       has_table_privilege(role_name,'public.user_roles','TRUNCATE') AS can_truncate_user_roles
FROM (VALUES ('anon'),('authenticated')) AS roles(role_name);
-- Storage object policy inventory; bucket privacy alone does not protect object rows.
SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled,
       p.polname AS policy_name,p.polcmd AS command,
       pg_get_expr(p.polqual,p.polrelid) AS using_expr,
       pg_get_expr(p.polwithcheck,p.polrelid) AS check_expr
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid=c.oid
WHERE n.nspname='storage' AND c.relname='objects'
ORDER BY p.polname;
-- Policy composition: permissive policies OR together; restrictive policies AND together.
-- Inspect role targets and permissive mode before claiming private-object isolation.
SELECT p.polname AS policy_name,
       CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS policy_mode,
       p.polcmd AS command,
       ARRAY(SELECT CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE role_oid::regrole::text END
             FROM unnest(p.polroles) AS role_oid) AS policy_roles,
       pg_get_expr(p.polqual,p.polrelid) AS using_expr,
       pg_get_expr(p.polwithcheck,p.polrelid) AS check_expr
FROM pg_policy p
JOIN pg_class c ON c.oid=p.polrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='storage' AND c.relname='objects'
ORDER BY p.polname;
ROLLBACK;
-- STOP: no authenticated positive/negative test, restore verification or owner approval is implied.
