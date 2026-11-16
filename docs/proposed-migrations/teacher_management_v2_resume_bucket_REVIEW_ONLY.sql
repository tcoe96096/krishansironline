-- REVIEW ONLY. NOT EXECUTED. Private resume bucket proposal.
-- Apply ONLY after the core teacher-v2 and resume-metadata SQL is approved/tested.
-- Storage service configuration and scanner deployment are separate steps.
-- Supabase permits INSERT into storage.buckets to create a bucket, but object
-- uploads/deletions MUST go through the Storage API; never alter storage.objects.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $resume_bucket_preflight$
BEGIN
 IF to_regclass('public.teacher_resume_documents') IS NULL
    OR to_regprocedure('public.teacher_v2_finalize_resume(uuid,integer,text,text,text,integer,text)') IS NULL THEN
  RAISE EXCEPTION 'Install and verify teacher resume schema before bucket provisioning';
 END IF;
 -- No client Storage policies may grant reads or writes to sensitive resume bytes.
 -- A future project with existing storage.objects policies requires a fresh
 -- policy-specific review, never an unreviewed bucket install.
 IF EXISTS (SELECT 1 FROM pg_policies
   WHERE schemaname='storage' AND tablename='objects'
     AND (ARRAY['anon','authenticated','public']::name[] && roles)) THEN
  RAISE EXCEPTION 'Review existing client Storage policies before resume bucket provisioning';
 END IF;
END $resume_bucket_preflight$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('teacher-resumes-private','teacher-resumes-private',false,5242880,
        ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[])
ON CONFLICT (id) DO NOTHING;
DO $resume_bucket_verify$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM storage.buckets b
  WHERE b.id='teacher-resumes-private'
   AND b.name='teacher-resumes-private'
   AND b.public IS FALSE
   AND b.file_size_limit=5242880
   AND b.allowed_mime_types=ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
 ) THEN
  RAISE EXCEPTION 'Resume bucket privacy, MIME or size configuration mismatch';
 END IF;
END $resume_bucket_verify$;
COMMIT;
-- No client Storage policies are created; the verified Edge Function acts
-- with the server-only key after authenticating each caller and scanning bytes.
-- Keep private.teacher_beta_features.resume_uploads=false until real private
-- upload/download denial tests, scanner acceptance and cleanup are verified.
