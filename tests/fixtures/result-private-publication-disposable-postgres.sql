-- Synthetic PostgreSQL ONLY; never use a real connection.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE SCHEMA private;
CREATE TABLE public.user_roles(user_id uuid,role text);
INSERT INTO public.user_roles VALUES('00000000-0000-0000-0000-000000000001','super_admin');
CREATE TABLE public.test_attempts(id uuid PRIMARY KEY,student_id uuid NOT NULL,status text NOT NULL);
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(bucket_id text,name text,is_delete_marker boolean,archived_at timestamptz,metadata jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.actor',true),'')::uuid $$;
CREATE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid()='00000000-0000-0000-0000-000000000001'::uuid $$;
CREATE FUNCTION public.student_account_is_eligible(p_student_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT p_student_id='00000000-0000-0000-0000-000000000002'::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid(),public.is_super_admin(),public.student_account_is_eligible(uuid) TO authenticated;
INSERT INTO public.test_attempts VALUES('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000002','submitted');
\i docs/results/result-private-publication-20261127-CANDIDATE-DO-NOT-APPLY.sql
INSERT INTO storage.objects VALUES('result-cards-private','00000000-0000-0000-0000-000000000010/v1/'||repeat('a',64)||'.pdf',false,NULL,'{"mimetype":"application/pdf","size":128}');
SET ROLE service_role;
SELECT set_config('test.actor','00000000-0000-0000-0000-000000000001',false);
DO $test$
DECLARE a uuid:='00000000-0000-0000-0000-000000000010'; k uuid:='00000000-0000-0000-0000-000000000011'; r uuid:='00000000-0000-0000-0000-000000000012';
BEGIN
 IF public.ksol_result_approve_pdf('00000000-0000-0000-0000-000000000001',a,1,repeat('a',64),k) IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'Approval failed'; END IF;
 IF public.ksol_result_approve_pdf('00000000-0000-0000-0000-000000000001',a,1,repeat('a',64),k) IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'Replay failed'; END IF;
 BEGIN
  PERFORM public.ksol_result_approve_pdf('00000000-0000-0000-0000-000000000001',a,1,repeat('b',64),k);
  RAISE EXCEPTION 'Conflicting replay accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END;
$test$;
RESET ROLE;
SET ROLE authenticated;
DO $test$
BEGIN
 IF has_function_privilege(current_user,'public.ksol_result_approve_pdf(uuid,uuid,integer,text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Browser approval RPC grant leaked'; END IF;
 IF public.ksol_result_transition('00000000-0000-0000-0000-000000000010',1,'release','00000000-0000-0000-0000-000000000012') IS DISTINCT FROM 'released' THEN RAISE EXCEPTION 'Release failed'; END IF;
END;
$test$;
SELECT set_config('test.actor','00000000-0000-0000-0000-000000000002',false);
DO $test$
DECLARE a uuid:='00000000-0000-0000-0000-000000000010';
BEGIN
 IF public.ksol_my_released_result_version(a) IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Owner version denied'; END IF;
 IF public.ksol_result_pdf_manifest(a,1) IS NULL THEN RAISE EXCEPTION 'Owner manifest denied'; END IF;
 IF public.ksol_result_pdf_manifest(a,2) IS NOT NULL THEN RAISE EXCEPTION 'Wrong version leaked'; END IF;
 BEGIN
  PERFORM public.ksol_result_transition(a,1,'revoke','00000000-0000-0000-0000-000000000013');
  RAISE EXCEPTION 'Student could revoke';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$test$;
SELECT set_config('test.actor','00000000-0000-0000-0000-000000000003',false);
DO $test$
BEGIN
 IF public.ksol_result_pdf_manifest('00000000-0000-0000-0000-000000000010',1) IS NOT NULL THEN RAISE EXCEPTION 'Foreign manifest leaked'; END IF;
END;
$test$;
RESET ROLE;
-- A second eligible synthetic student must never inherit the first student's PDF.
CREATE OR REPLACE FUNCTION public.student_account_is_eligible(p_student_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT p_student_id IN ('00000000-0000-0000-0000-000000000002'::uuid,'00000000-0000-0000-0000-000000000003'::uuid) $$;
UPDATE public.test_attempts SET student_id='00000000-0000-0000-0000-000000000003';
SET ROLE authenticated;
SELECT set_config('test.actor','00000000-0000-0000-0000-000000000003',false);
DO $test$
BEGIN
 IF public.ksol_result_pdf_manifest('00000000-0000-0000-0000-000000000010',1) IS NOT NULL OR public.ksol_my_released_result_version('00000000-0000-0000-0000-000000000010') IS NOT NULL THEN RAISE EXCEPTION 'Reassigned attempt leaked prior recipient PDF'; END IF;
END;
$test$;
RESET ROLE;
UPDATE public.test_attempts SET student_id='00000000-0000-0000-0000-000000000002';
SET ROLE authenticated;
SELECT set_config('test.actor','00000000-0000-0000-0000-000000000001',false);
SELECT public.ksol_result_transition('00000000-0000-0000-0000-000000000010',1,'revoke','00000000-0000-0000-0000-000000000014');
SELECT set_config('test.actor','00000000-0000-0000-0000-000000000002',false);
DO $test$
BEGIN
 IF public.ksol_result_pdf_manifest('00000000-0000-0000-0000-000000000010',1) IS NOT NULL THEN RAISE EXCEPTION 'Revoked manifest leaked'; END IF;
END;
$test$;
RESET ROLE;
DO $test$
BEGIN
 IF (SELECT count(*) FROM private.ksol_result_audit)<>3 THEN RAISE EXCEPTION 'Audit replay count wrong'; END IF;
END;
$test$;
SELECT 'RESULT_PRIVATE_PUBLICATION_SYNTHETIC_ASSERTIONS_PASSED' AS status;

-- Separate generation contract: actual record joins, no real student data.
ALTER TABLE public.test_attempts ADD COLUMN test_id text, ADD COLUMN score numeric, ADD COLUMN total_marks numeric, ADD COLUMN percentage numeric, ADD COLUMN correct_count integer, ADD COLUMN submitted_at timestamptz;
CREATE TABLE public.student_profiles(user_id uuid,student_name text,roll_no text,class_level text,school_name text);
CREATE TABLE public.tests(id text PRIMARY KEY,title jsonb,subject text,class_level text);
UPDATE public.test_attempts SET test_id='synthetic-test',score=8,total_marks=10,percentage=80,correct_count=8,submitted_at='2026-01-01T00:00:00Z';
INSERT INTO public.student_profiles VALUES('00000000-0000-0000-0000-000000000002','Synthetic Student','SYN-01','10','Synthetic School');
INSERT INTO public.tests VALUES('synthetic-test','{"en":"Synthetic Test"}','Social Science','10');
\i docs/results/result-generation-snapshot-20261127-CANDIDATE-DO-NOT-APPLY.sql
SET ROLE service_role;
DO $test$
DECLARE s jsonb; actor uuid:='00000000-0000-0000-0000-000000000001'; a uuid:='00000000-0000-0000-0000-000000000010';
BEGIN
 s:=public.ksol_result_generation_snapshot(actor,a);
 IF s->>'studentName' IS DISTINCT FROM 'Synthetic Student' OR s->>'score' IS DISTINCT FROM '8' OR s->>'studentId' IS DISTINCT FROM '00000000-0000-0000-0000-000000000002' THEN RAISE EXCEPTION 'Snapshot identity or score mismatch'; END IF;
 BEGIN
  PERFORM public.ksol_result_generation_snapshot('00000000-0000-0000-0000-000000000002',a);
  RAISE EXCEPTION 'Non-admin actor accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.ksol_result_generation_snapshot(actor,'00000000-0000-0000-0000-000000000099');
  RAISE EXCEPTION 'Missing attempt accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$test$;
RESET ROLE;
DO $test$
BEGIN
 IF has_function_privilege('authenticated','public.ksol_result_generation_snapshot(uuid,uuid)','EXECUTE') OR has_function_privilege('anon','public.ksol_result_generation_snapshot(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Snapshot grant leaked'; END IF;
END;
$test$;
SELECT 'RESULT_GENERATION_SNAPSHOT_SYNTHETIC_ASSERTIONS_PASSED' AS status;
