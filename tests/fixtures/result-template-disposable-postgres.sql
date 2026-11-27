-- Disposable PostgreSQL only. Never connect to Preview or Production.
-- Run with psql -X -v ON_ERROR_STOP=1 -f this-file.sql from repository root.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
INSERT INTO auth.users VALUES('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.actor',true),'')::uuid $$;
CREATE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid()='00000000-0000-0000-0000-000000000001'::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid(),public.is_super_admin() TO authenticated;
\i docs/results/result-template-production-CANDIDATE-DO-NOT-APPLY.sql
SET ROLE authenticated;
SELECT set_config('test.actor','00000000-0000-0000-0000-000000000001',false);
DO $test$
BEGIN
 IF public.publish_result_card_template('modern','{"showLogo":true}','Initial template style') IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Initial version wrong'; END IF;
 IF public.publish_result_card_template('classic','{"showLogo":false}','Updated template style') IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'Updated version wrong'; END IF;
 IF (SELECT count(*) FROM public.result_card_template_audit)<>2 THEN RAISE EXCEPTION 'Audit count wrong'; END IF;
 BEGIN
  PERFORM public.publish_result_card_template('modern','{"studentName":"synthetic"}','Invalid option attempt');
  RAISE EXCEPTION 'Private field accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
END;
$test$;
SELECT set_config('test.actor','00000000-0000-0000-0000-000000000002',false);
DO $test$
BEGIN
 IF public.can_publish_result_card_template() IS DISTINCT FROM false THEN RAISE EXCEPTION 'Wrong permission'; END IF;
 IF (SELECT count(*) FROM public.result_card_template_audit)<>0 THEN RAISE EXCEPTION 'Audit leaked'; END IF;
 BEGIN
  PERFORM public.publish_result_card_template('modern','{}','Unauthorized publish');
  RAISE EXCEPTION 'Unauthorized publish accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$test$;
RESET ROLE;
SET ROLE anon;
DO $test$
BEGIN
 IF (SELECT version FROM public.result_card_templates WHERE template_key='default') IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'Published styling missing'; END IF;
 BEGIN
  PERFORM updated_by FROM public.result_card_templates;
  RAISE EXCEPTION 'Private actor metadata leaked';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.publish_result_card_template('modern','{}','Anonymous publish attempt');
  RAISE EXCEPTION 'Anonymous execution accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$test$;
RESET ROLE;
SELECT 'RESULT_TEMPLATE_SYNTHETIC_ASSERTIONS_PASSED' AS status;
