-- REVIEW ONLY; NOT EXECUTED. Candidate least-privilege remediation.
-- Preview read-only catalog inspection found effective TRUNCATE on
-- public.user_roles for anon and authenticated. RLS never covers TRUNCATE.
-- IMPORTANT: confirm source of inherited/effective privileges, function
-- dependencies, role memberships and baseline before applying this proposal.
-- Revoking direct grants is insufficient if privileges are inherited via
-- another role or granted to PUBLIC; re-run has_table_privilege afterward.
BEGIN;
REVOKE TRUNCATE ON TABLE public.user_roles FROM PUBLIC, anon, authenticated;
COMMIT;
-- Acceptance query (run separately, read-only):
-- SELECT role_name,
--        has_table_privilege(role_name,'public.user_roles','TRUNCATE') AS can_truncate
-- FROM (VALUES ('anon'),('authenticated')) AS roles(role_name);
-- Both rows MUST be false. If either remains true, STOP and inspect
-- role inheritance / owner privileges rather than issuing wider revokes.
-- No data modification, table replacement, RLS change or broad grant is intended.
