-- KSOL Teacher v2: READ-ONLY Preview preflight.
-- Intended project: zgpkmfqioqvincmgyfpi (verify connector project ID separately).
-- Does not establish managed-backup/restore readiness or authenticated RLS behavior.
-- Never run against Production as a substitute for explicit release approval.
BEGIN READ ONLY;
SELECT current_database() AS database_name,
       current_setting('server_version') AS postgres_version,
       now() AS checked_at;
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('user_roles','result_staff_grants','teacher_profiles',
                    'teacher_qualifications','teacher_assignments',
                    'teacher_application_scopes','study_material_items')
  AND c.relkind IN ('r','p')
ORDER BY c.relname;
SELECT role_name,
       has_table_privilege(role_name,'public.user_roles','TRUNCATE') AS can_truncate,
       has_table_privilege(role_name,'public.user_roles','INSERT') AS can_insert,
       has_table_privilege(role_name,'public.user_roles','UPDATE') AS can_update,
       has_table_privilege(role_name,'public.user_roles','DELETE') AS can_delete
FROM (VALUES ('anon'),('authenticated'),('service_role')) roles(role_name);
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='user_roles'
ORDER BY grantee, privilege_type;
SELECT schemaname, tablename, policyname, roles, cmd, permissive,
       qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('user_roles','result_staff_grants','study_material_items')
ORDER BY tablename, policyname;
SELECT scope_class, role, count(*) AS active_grants
FROM public.result_staff_grants
WHERE is_active IS TRUE
GROUP BY scope_class,role
ORDER BY scope_class,role;
SELECT p.proname, p.prosecdef AS security_definer,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND (p.proname LIKE 'teacher_v2_%' OR p.proname IN
       ('is_super_admin','review_teacher_enrollment','submit_teacher_enrollment'))
ORDER BY p.proname;
COMMIT;
