-- REVIEW ONLY / READ ONLY. Run manually in a separately authorized catalog audit.
-- RLS alone is not sufficient: table owners, BYPASSRLS and table privileges matter.
-- Empty output for a proposed table means NOT INSTALLED, not a passing check.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls,
       pg_get_userbyid(c.relowner) AS table_owner,
       r.rolbypassrls AS owner_has_bypassrls,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
       has_table_privilege('anon', c.oid, 'INSERT') AS anon_insert,
       has_table_privilege('anon', c.oid, 'UPDATE') AS anon_update,
       has_table_privilege('anon', c.oid, 'DELETE') AS anon_delete,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select,
       has_table_privilege('authenticated', c.oid, 'INSERT') AS authenticated_insert,
       has_table_privilege('authenticated', c.oid, 'UPDATE') AS authenticated_update,
       has_table_privilege('authenticated', c.oid, 'DELETE') AS authenticated_delete,
       has_table_privilege('anon', c.oid, 'TRUNCATE') AS anon_truncate,
       has_table_privilege('authenticated', c.oid, 'TRUNCATE') AS authenticated_truncate
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles r ON r.oid = c.relowner
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p')
  AND (c.relname LIKE 'teacher_v2_%'
       OR c.relname IN ('teacher_enrollment_requests','user_roles'))
ORDER BY c.relname;
-- Also inspect pg_policies and function EXECUTE; catalog evidence cannot replace
-- authenticated positive/negative runtime tests or proven backup recovery.
