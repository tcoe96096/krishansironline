-- READ ONLY: Teacher Management v2 activation catalog preflight (2026-11-21).
-- Expected operator-selected target: Preview zgpkmfqioqvincmgyfpi ONLY.
-- This query DOES NOT CONNECT to a target, write data, change grants, or
-- attest a backup, an isolated restore, JWT actor tests or owner approval.
-- Verify the project ID/endpoint OUTSIDE SQL before running this SELECT.
-- Never treat a catalog PASS as deployment authorization.
WITH catalog_gates AS (
 SELECT
  'teacher_profiles'::text AS gate,
  (to_regclass('public.teacher_profiles') IS NOT NULL) AS catalog_ready,
  'Teacher profile table installed'::text AS meaning
 UNION ALL SELECT 'teacher_resume_documents',
  to_regclass('public.teacher_resume_documents') IS NOT NULL,
  'Resume metadata table installed'
 UNION ALL SELECT 'teacher_assignments',
  to_regclass('public.teacher_assignments') IS NOT NULL,
  'Teacher assignments table installed'
 UNION ALL SELECT 'teacher_identity_verifications',
  to_regclass('public.teacher_identity_verifications') IS NOT NULL,
  'Independent identity verification table installed'
 UNION ALL SELECT 'teacher_snapshot_rpc',
  to_regprocedure('public.teacher_v2_snapshot(uuid)') IS NOT NULL,
  'Owner-filtered snapshot RPC installed'
 UNION ALL SELECT 'teacher_registration_rpc',
  to_regprocedure('public.teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer)') IS NOT NULL,
  'Registration/submit RPC installed'
 UNION ALL SELECT 'teacher_review_rpc',
  to_regprocedure('public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb)') IS NOT NULL,
  'Independently guarded teacher review RPC installed'
 UNION ALL SELECT 'identity_verification_writer_rpc',
  to_regprocedure('public.teacher_v2_record_identity_verification(uuid,integer,text,text)') IS NOT NULL,
  'Independent evidence recording RPC installed'
 UNION ALL SELECT 'identity_verification_read_rpc',
  to_regprocedure('public.teacher_v2_verification_status(uuid,integer)') IS NOT NULL,
  'Revision-bound read-only evidence status RPC installed'
 UNION ALL SELECT 'resume_reserve_rpc',
  to_regprocedure('public.teacher_v2_resume_reserve(text,text,integer)') IS NOT NULL,
  'Owner-specific private resume reservation RPC installed'
 UNION ALL SELECT 'resume_finalize_rpc',
  to_regprocedure('public.teacher_v2_resume_finalize(uuid)') IS NOT NULL,
  'Owner-specific private resume finalization RPC installed'
 UNION ALL SELECT 'private_photo_bucket',
  EXISTS (SELECT 1 FROM storage.buckets b
          WHERE b.id='teacher-profile-photos-private'
            AND b.public IS FALSE AND b.file_size_limit=3145728
            AND b.allowed_mime_types=ARRAY['image/webp']::text[]),
  'Private photo bucket exists with exact MIME/size configuration'
 UNION ALL SELECT 'private_resume_bucket',
  EXISTS (SELECT 1 FROM storage.buckets b
          WHERE b.id='teacher-resumes-private'
            AND b.public IS FALSE AND b.file_size_limit=5242880
            AND b.allowed_mime_types=ARRAY[
             'application/pdf',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]::text[]),
  'Private resume bucket exists with exact MIME/size configuration'
 UNION ALL SELECT 'anon_no_user_roles_truncate',
  coalesce(NOT has_table_privilege('anon',to_regclass('public.user_roles'),'TRUNCATE'),false),
  'anon MUST NOT retain effective TRUNCATE on public.user_roles'
 UNION ALL SELECT 'authenticated_no_user_roles_truncate',
  coalesce(NOT has_table_privilege('authenticated',to_regclass('public.user_roles'),'TRUNCATE'),false),
  'authenticated MUST NOT retain effective TRUNCATE on public.user_roles'
), non_catalog_gates AS (
 -- SQL cannot independently establish any of these required facts.
 SELECT 'target_project_verified'::text AS gate,'UNVERIFIED'::text AS status,
  'Confirm exact Supabase Preview project and endpoint independently'::text AS meaning
 UNION ALL SELECT 'independently_restored_backup','UNVERIFIED',
  'Require disposable-target successful restore and reconciled evidence'
 UNION ALL SELECT 'authenticated_rls_matrix','UNVERIFIED',
  'Require real JWT allow/deny tests for anon, applicant, other user, admin, Super Admin'
 UNION ALL SELECT 'private_media_policy_composition','UNVERIFIED',
  'Audit every permissive Storage policy, owner reads and cross-user denials'
 UNION ALL SELECT 'document_malware_scan','UNVERIFIED',
  'Quarantine and scan PDF/DOCX bytes before a reviewer may open documents'
 UNION ALL SELECT 'independent_owner_release_approval','UNVERIFIED',
  'Separate explicit owner approval for the precisely identified high-impact operation'
)
SELECT gate,
 CASE WHEN catalog_ready THEN 'CATALOG_PRESENT_NOT_RUNTIME_VERIFIED'
      ELSE 'BLOCKED' END AS status,
 meaning
FROM catalog_gates
UNION ALL
SELECT gate,status,meaning FROM non_catalog_gates
ORDER BY gate;
-- A successful SELECT merely returns inventory findings, NEVER GO.
-- Staging/Production SQL, REVOKE, merge, publish and feature activation remain
-- prohibited without separate recovery evidence, runtime checks and approval.
