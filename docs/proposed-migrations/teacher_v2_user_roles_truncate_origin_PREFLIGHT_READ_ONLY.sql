-- READ ONLY: explain effective TRUNCATE exposure on public.user_roles.
-- Run against Preview only. No privilege changes or data writes.
WITH principals AS (
  SELECT oid,rolname,rolinherit FROM pg_roles WHERE rolname IN ('anon','authenticated')
), grants AS (
  SELECT a.grantee, a.privilege_type, a.is_grantable
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
  WHERE n.nspname='public' AND c.relname='user_roles'
    AND a.privilege_type='TRUNCATE'
)
SELECT p.rolname,p.rolinherit,
       has_table_privilege(p.rolname,'public.user_roles','TRUNCATE') AS effective_truncate,
       EXISTS (SELECT 1 FROM grants g WHERE g.grantee=p.oid) AS direct_truncate_grant,
       EXISTS (SELECT 1 FROM grants g WHERE g.grantee=0) AS public_truncate_grant,
       ARRAY(SELECT parent.rolname FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid WHERE m.member=p.oid) AS direct_memberships
FROM principals p ORDER BY p.rolname;
-- A direct/PUBLIC grant is not the only possible origin: inherited roles or
-- owner privileges may contribute. Inspect before any REVOKE.
-- Acceptance after approved remediation: effective_truncate=false for both.
