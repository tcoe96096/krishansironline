-- Teacher v2: storage policy composition inventory (READ ONLY).
-- Permissive policies combine with OR; restrictive policies combine with AND.
-- Review all applicable policies, not only those named for teacher media.
-- Catalog inspection is NOT authenticated runtime proof.
SELECT n.nspname AS schema_name,
       c.relname AS relation_name,
       p.polname AS policy_name,
       CASE p.polcmd
         WHEN 'r' THEN 'SELECT'
         WHEN 'a' THEN 'INSERT'
         WHEN 'w' THEN 'UPDATE'
         WHEN 'd' THEN 'DELETE'
         WHEN '*' THEN 'ALL'
       END AS policy_command,
       CASE WHEN p.polpermissive THEN 'PERMISSIVE_OR'
            ELSE 'RESTRICTIVE_AND' END AS policy_composition,
       ARRAY(
         SELECT CASE WHEN role_oid = 0 THEN 'PUBLIC'
                     ELSE pg_catalog.pg_get_userbyid(role_oid) END
         FROM unnest(p.polroles) AS role_oid
       ) AS policy_roles,
       pg_catalog.pg_get_expr(p.polqual, p.polrelid) AS using_expression,
       pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expression,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_policy AS p
JOIN pg_catalog.pg_class AS c ON c.oid = p.polrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage'
  AND c.relname IN ('objects', 'buckets')
ORDER BY relation_name, policy_command, policy_composition, policy_name;

-- Inspect all storage object policies for unexpected OR branches that allow
-- another teacher to SELECT, UPDATE, DELETE, or list private objects.
-- A bucket private flag alone does not replace RLS or actual HTTP denial tests.
