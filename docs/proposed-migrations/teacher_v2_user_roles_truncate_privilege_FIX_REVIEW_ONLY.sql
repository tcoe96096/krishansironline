-- REVIEW ONLY. NOT EXECUTED. Requires a verified, recoverable Preview backup
-- and independent release approval. This is a separate privilege hardening patch,
-- NOT part of Teacher v2's feature-activation migration.
--
-- Verified Preview finding (2026-11-22): both anon and authenticated can TRUNCATE
-- public.user_roles. PostgreSQL RLS does NOT protect TRUNCATE. No legitimate
-- browser role should hold this privilege on the authorization table.
-- This patch changes ACLs only; it does not modify records or policies.
BEGIN;
DO $precheck$
BEGIN
 IF pg_catalog.to_regclass('public.user_roles') IS NULL THEN
   RAISE EXCEPTION 'Expected public.user_roles table does not exist';
 END IF;
END $precheck$;

REVOKE TRUNCATE ON TABLE public.user_roles FROM PUBLIC, anon, authenticated;

DO $postcheck$
BEGIN
 IF pg_catalog.has_table_privilege('anon','public.user_roles','TRUNCATE')
    OR pg_catalog.has_table_privilege('authenticated','public.user_roles','TRUNCATE') THEN
   RAISE EXCEPTION 'TRUNCATE remains reachable through an inherited or indirect role grant; audit role memberships before proceeding'
    USING ERRCODE='42501';
 END IF;
END $postcheck$;
COMMIT;

-- Post-approval acceptance SQL:
-- SELECT has_table_privilege('anon','public.user_roles','TRUNCATE') AS anon_allowed,
--        has_table_privilege('authenticated','public.user_roles','TRUNCATE') AS authenticated_allowed;
-- Both must be false. Do not perform an actual TRUNCATE test.
