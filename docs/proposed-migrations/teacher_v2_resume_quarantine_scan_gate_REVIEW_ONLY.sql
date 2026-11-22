-- Teacher v2: fail-closed resume quarantine and scan attestation model.
-- Does NOT scan documents, open private files or activate upload.
-- Review and apply only after SQL rollback tests and deployment checks.
BEGIN;
DO $preflight$
BEGIN
 IF to_regclass('public.teacher_resume_documents') IS NULL
    OR to_regprocedure('public.is_super_admin()') IS NULL THEN
  RAISE EXCEPTION 'Teacher resume tables and role guard must already exist';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname='teacher_resume_documents'
       AND c.relrowsecurity) THEN
  RAISE EXCEPTION 'RLS must be enabled before resume scan model';
 END IF;
 IF has_table_privilege('authenticated','public.teacher_resume_documents','UPDATE')
    OR has_table_privilege('anon','public.teacher_resume_documents','UPDATE') THEN
  RAISE EXCEPTION 'Browser roles must not update scan attestations';
 END IF;
 IF EXISTS (SELECT 1 FROM public.teacher_resume_documents WHERE verification_status='verified') THEN
  RAISE EXCEPTION 'Existing verified resumes need independent scan reconciliation before upgrade';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='teacher_resume_documents'
  AND column_name IN ('scan_status','scan_completed_at','scan_engine','scan_sha256')) THEN
  RAISE EXCEPTION 'Prior scan columns require explicit schema review';
 END IF;
 IF to_regprocedure('public.teacher_v2_resume_scan_summary(uuid)') IS NOT NULL THEN
  RAISE EXCEPTION 'Existing scan summary RPC requires review';
 END IF;
END $preflight$;

ALTER TABLE public.teacher_resume_documents
 ADD COLUMN scan_status text NOT NULL DEFAULT 'pending',
 ADD COLUMN scan_completed_at timestamptz,
 ADD COLUMN scan_engine text,
 ADD COLUMN scan_sha256 text;

ALTER TABLE public.teacher_resume_documents
 ADD CONSTRAINT teacher_resume_scan_state_guard CHECK (
  (
   scan_status='pending'
   AND scan_completed_at IS NULL AND scan_engine IS NULL AND scan_sha256 IS NULL
  )
  OR
  (
   scan_status IN ('clean','infected','error')
   AND upload_state='uploaded'
   AND scan_completed_at IS NOT NULL
   AND scan_engine IS NOT NULL
   AND char_length(btrim(scan_engine)) BETWEEN 3 AND 80
   AND (
     (scan_sha256 IS NOT NULL AND scan_sha256 ~ '^[0-9a-f]{64}$')
     OR (scan_status IN ('infected','error') AND scan_sha256 IS NULL)
   )
  )
 ),
 ADD CONSTRAINT teacher_resume_verification_requires_clean_scan CHECK (
   verification_status <> 'verified'
   OR (
    upload_state='uploaded'
    AND scan_status='clean'
    AND scan_completed_at IS NOT NULL
    AND scan_engine IS NOT NULL
    AND scan_sha256 IS NOT NULL
   )
 );

-- Only owner or server-confirmed Super Admin may read aggregate scan state.
-- Never expose object keys, names, document bytes or per-file hashes.
CREATE FUNCTION public.teacher_v2_resume_scan_summary(p_teacher_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $summary$
DECLARE v jsonb;
BEGIN
 IF p_teacher_user_id IS NULL
   OR auth.uid() IS NULL
   OR (auth.uid()<>p_teacher_user_id AND NOT coalesce(public.is_super_admin(),false)) THEN
  RAISE EXCEPTION 'Teacher resume scan status requires owner or Super Admin'
    USING ERRCODE='42501';
 END IF;
 SELECT jsonb_build_object(
  'total',count(*),
  'reserved',count(*) FILTER (WHERE upload_state='reserved'),
  'uploaded',count(*) FILTER (WHERE upload_state='uploaded'),
  'pending_scan',count(*) FILTER (WHERE upload_state='uploaded' AND scan_status='pending'),
  'clean',count(*) FILTER (WHERE upload_state='uploaded' AND scan_status='clean'),
  'infected',count(*) FILTER (WHERE upload_state='uploaded' AND scan_status='infected'),
  'error',count(*) FILTER (WHERE upload_state='uploaded' AND scan_status='error'),
  'verified',count(*) FILTER (WHERE verification_status='verified')
 ) INTO v
 FROM public.teacher_resume_documents WHERE teacher_user_id=p_teacher_user_id;
 RETURN v;
END $summary$;
REVOKE ALL ON FUNCTION public.teacher_v2_resume_scan_summary(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_v2_resume_scan_summary(uuid)
 TO authenticated;
COMMIT;

-- SCAN EXECUTION IS NOT PROVIDED HERE. There is deliberately no client-facing
-- RPC or upload-bucket read for scan attestations.
-- A separately approved trusted server scanner must inspect actual bytes and
-- record a verified SHA-256 digest + engine + completion timestamp.
-- No document may be marked 'verified' unless the DB constraints accept a
-- clean scan attestation. Browser roles have no direct table UPDATE privileges.
-- Malware scanner configuration, response authenticity and independent
-- document review remain explicit release blockers for resume uploads.
