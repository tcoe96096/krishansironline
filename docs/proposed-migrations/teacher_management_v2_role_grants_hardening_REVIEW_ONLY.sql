-- REVIEW ONLY. NOT EXECUTED. Requires verified Preview recovery, independent review and explicit owner approval.
-- Preview public.user_roles: PostgreSQL TRUNCATE bypasses RLS.
-- Also remove unnecessary TRIGGER and REFERENCES from web-facing roles.
BEGIN;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.user_roles FROM anon, authenticated;
-- Fail closed: a direct REVOKE alone cannot neutralize privileges inherited
-- through PUBLIC or other memberships. Abort the whole transaction if any
-- web-facing role still has an effective privilege.
DO $hardening_verify$
DECLARE
  v_role text;
  v_privilege text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH v_privilege IN ARRAY ARRAY['TRUNCATE', 'TRIGGER', 'REFERENCES'] LOOP
      IF has_table_privilege(v_role, 'public.user_roles', v_privilege) THEN
        RAISE EXCEPTION 'Unsafe effective privilege persists: role %, privilege % on public.user_roles; no changes committed',
          v_role, v_privilege
          USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END LOOP;
END;
$hardening_verify$;
COMMIT;
-- Verification after separately approved execution (read-only):
-- SELECT has_table_privilege('anon','public.user_roles','TRUNCATE') AS anon_truncate,
--        has_table_privilege('authenticated','public.user_roles','TRUNCATE') AS auth_truncate,
--        has_table_privilege('anon','public.user_roles','TRIGGER') AS anon_trigger,
--        has_table_privilege('authenticated','public.user_roles','TRIGGER') AS auth_trigger,
--        has_table_privilege('anon','public.user_roles','REFERENCES') AS anon_references,
--        has_table_privilege('authenticated','public.user_roles','REFERENCES') AS auth_references;
-- Confirm all six effective privileges are false; check PUBLIC/inherited grants.
-- No INSERT/UPDATE/DELETE grants are added. No teacher v2 activation.
