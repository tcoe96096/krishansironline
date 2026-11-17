-- REVIEW ONLY. NOT EXECUTED. Same core DDL for an independently approved target.
-- No Production target is selected; owner approval and essential tests are required.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $core_preflight$ BEGIN
 IF to_regclass('public.user_roles') IS NULL OR to_regprocedure('public.is_super_admin()') IS NULL OR to_regprocedure('auth.uid()') IS NULL THEN
  RAISE EXCEPTION 'Required existing Auth/role foundation missing; stop'; END IF;
 IF to_regclass('public.teacher_profiles') IS NOT NULL OR to_regclass('private.teacher_beta_features') IS NOT NULL THEN
  RAISE EXCEPTION 'Existing v2 schema requires reviewed upgrade; stop'; END IF;
END $core_preflight$;
-- REVIEW ONLY. DO NOT EXECUTE. Requires owner approval, compatibility review and RLS tests.
-- KSOL Teacher Management v2 proposed additive schema; no privileges are granted here.

CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id text UNIQUE,
  revision integer NOT NULL DEFAULT 1,
  submitted_at timestamptz,
  application_reason text,
  decision_reason text CHECK (decision_reason IS NULL OR char_length(btrim(decision_reason)) BETWEEN 12 AND 1000),
  reviewed_at timestamptz,
  CONSTRAINT teacher_last_review_consistency CHECK ((decision_reason IS NULL)=(reviewed_at IS NULL)),
  requested_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Employee identity is retained after suspension; never issue to pending/rejected accounts.
  display_name text NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 160),
  contact_email text CHECK (contact_email IS NULL OR char_length(contact_email) <= 254),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 20),
  experience_years integer CHECK (experience_years BETWEEN 0 AND 70),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended','rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_employee_id_format CHECK (employee_id IS NULL OR employee_id ~ '^KSOL-T-[A-Z0-9]{8,16}$'),
  CONSTRAINT teacher_employee_id_requires_approval CHECK (employee_id IS NULL OR status IN ('approved','suspended')),
  CONSTRAINT teacher_profile_approval_metadata CHECK (
    (status IN ('pending','rejected') AND approved_by IS NULL AND approved_at IS NULL)
    OR (status IN ('approved','suspended') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);
CREATE TABLE IF NOT EXISTS public.teacher_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_user_id uuid NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 120),
  institution text NOT NULL CHECK (char_length(trim(institution)) BETWEEN 2 AND 160),
  passing_year integer NOT NULL CHECK (passing_year BETWEEN 1950 AND 2100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.teacher_resume_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_user_id uuid NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE CHECK (char_length(storage_path) BETWEEN 12 AND 512),
  original_filename text NOT NULL CHECK (char_length(trim(original_filename)) BETWEEN 5 AND 180),
  content_type text NOT NULL CHECK (content_type IN ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  CONSTRAINT teacher_resume_storage_key_no_traversal CHECK (left(storage_path,1)<>'/' AND strpos(storage_path,'..')=0 AND strpos(storage_path,'//')=0 AND strpos(storage_path,chr(92))=0),
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_user_id uuid NOT NULL REFERENCES public.teacher_profiles(user_id) ON DELETE CASCADE,
  class_level text NOT NULL CHECK (class_level IN ('6','7','8','9','10','11','12')),
  subject text NOT NULL CHECK (subject IN ('Political Science','History','Geography','Economics','Other')),
  work_type text NOT NULL CHECK (work_type IN ('materials.draft','materials.review','assessment.draft','result.review')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_by uuid REFERENCES auth.users(id),
  revoked_at timestamptz,
  CONSTRAINT teacher_assignment_revocation_consistency CHECK ((status='active' AND revoked_at IS NULL AND revoked_by IS NULL) OR (status='revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_assignments_one_active_scope ON public.teacher_assignments (teacher_user_id,class_level,subject,work_type) WHERE status='active';
CREATE TABLE IF NOT EXISTS public.teacher_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  teacher_user_id uuid NOT NULL REFERENCES public.teacher_profiles(user_id),
  action text NOT NULL,
  reason text NOT NULL CHECK (char_length(trim(reason)) BETWEEN 12 AND 1000),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Default-deny policies: no client-side table access until audited server RPCs and
-- per-table SELECT/UPDATE policies are separately reviewed and installed.
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_resume_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_profiles, public.teacher_qualifications, public.teacher_resume_documents, public.teacher_assignments, public.teacher_audit_events FROM anon, authenticated;

-- Apply only as a separately approved bundle with v2 lifecycle and integration proposals.
-- Private resume verification remains a separate activation gate.

-- REVIEW ONLY. NOT EXECUTED. No Production/Preview activation authorized.
-- Required BEFORE v2 functions/lifecycle/integration/resume/privacy proposals.

CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE private.teacher_beta_features (
 feature text PRIMARY KEY CHECK (feature IN ('registration','material_authoring','result_analytics','resume_uploads','advanced_assignments')),
 enabled boolean NOT NULL DEFAULT false
);
INSERT INTO private.teacher_beta_features(feature) VALUES
 ('registration'),('material_authoring'),('result_analytics'),('resume_uploads'),('advanced_assignments');
ALTER TABLE private.teacher_beta_features ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.teacher_beta_features FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE private.teacher_beta_feature_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 action text NOT NULL CHECK (action IN ('open_registration','close_beta')),
 release_commit text CHECK (release_commit IS NULL OR release_commit ~ '^[0-9a-f]{40}$'),
 operator_name text NOT NULL DEFAULT current_user,
 reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 12 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.teacher_beta_feature_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.teacher_beta_feature_audit FROM PUBLIC,anon,authenticated,service_role;
-- Owner SQL only can change feature state; no self-service configuration endpoint.
CREATE FUNCTION private.teacher_v2_feature_enabled(p_feature text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND coalesce((SELECT enabled FROM private.teacher_beta_features WHERE feature=p_feature),false);
$$;
REVOKE ALL ON FUNCTION private.teacher_v2_feature_enabled(text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.teacher_v2_beta_capabilities()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('registration',private.teacher_v2_feature_enabled('registration'),
 'materials',private.teacher_v2_feature_enabled('material_authoring'),
 'analytics',private.teacher_v2_feature_enabled('result_analytics'),
 'resumes',private.teacher_v2_feature_enabled('resume_uploads'),
 'advanced',private.teacher_v2_feature_enabled('advanced_assignments'));
END $$;
REVOKE ALL ON FUNCTION public.teacher_v2_beta_capabilities() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.teacher_v2_beta_capabilities() TO authenticated;
-- A minimal release must also close any older optional v2 endpoint if present.
-- No implementation/deployment of these optional modules is needed or enabled.
DO $beta$
DECLARE v_signature text;
BEGIN
 FOREACH v_signature IN ARRAY ARRAY[
  'teacher_v2_result_summary(text,text)',
  'teacher_v2_freeze_result_summary(text,text,boolean)',
  'teacher_v2_resume_path(uuid)',
  'teacher_v2_reserve_resume(uuid,integer)',
  'teacher_v2_finalize_resume(uuid,integer,text,text,text,integer,text)'
 ] LOOP
  IF to_regprocedure('public.'||v_signature) IS NOT NULL THEN
   EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC,anon,authenticated,service_role',v_signature);
  END IF;
 END LOOP;
END $beta$;

-- Proposed minimal launch: registration only, all four advanced features false.
-- Enabling even registration requires a separately approved, target-specific action.


-- REVIEW ONLY. Never execute or grant privileges without owner approval and RLS review.
-- Requires teacher_management_v2_schema_REVIEW_ONLY.sql.
-- Profile edits are owner-bound; approval, employee IDs and assignments are not client-writable.

CREATE OR REPLACE FUNCTION public.teacher_v2_save_profile(
  p_display_name text, p_contact_email text, p_phone text, p_experience_years integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;
  IF p_display_name IS NULL OR char_length(btrim(p_display_name)) NOT BETWEEN 2 AND 160
     OR p_display_name ~ '[[:cntrl:]]'
     OR (p_contact_email IS NOT NULL AND (
          char_length(p_contact_email) > 254 OR
          (p_contact_email <> '' AND p_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')))
     OR (p_phone IS NOT NULL AND btrim(p_phone)<>'' AND
          (char_length(p_phone)>20 OR btrim(p_phone) !~ '^[+]?[0-9 ()-]+$'
           OR char_length(regexp_replace(p_phone,'[^0-9]','','g')) NOT BETWEEN 7 AND 15))
     OR (p_experience_years IS NOT NULL AND p_experience_years NOT BETWEEN 0 AND 70)
  THEN
    RAISE EXCEPTION 'Invalid teacher profile' USING ERRCODE='22023';
  END IF;
  SELECT status INTO v_status FROM public.teacher_profiles
    WHERE user_id=v_actor FOR UPDATE;
  IF FOUND AND v_status <> 'pending' THEN
    RAISE EXCEPTION 'Reviewed teacher profiles cannot be edited by applicants'
      USING ERRCODE='42501';
  END IF;
  INSERT INTO public.teacher_profiles
    (user_id,display_name,contact_email,phone,experience_years)
  VALUES (v_actor,btrim(p_display_name),nullif(btrim(p_contact_email),''),nullif(btrim(p_phone),''),p_experience_years)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name=excluded.display_name,contact_email=excluded.contact_email,
    phone=excluded.phone,experience_years=excluded.experience_years,updated_at=now()
  WHERE public.teacher_profiles.status='pending';
  RETURN v_actor;
END;
$$;
REVOKE ALL ON FUNCTION public.teacher_v2_save_profile(text,text,text,integer)
  FROM PUBLIC,anon,authenticated;

-- A SECURITY DEFINER reader intentionally returns an allowlisted row, never resume paths.
CREATE OR REPLACE FUNCTION public.teacher_v2_get_my_profile()
RETURNS TABLE(user_id uuid,employee_id text,display_name text,contact_email text,
              phone text,experience_years integer,status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT p.user_id,p.employee_id,p.display_name,p.contact_email,
    p.phone,p.experience_years,p.status
    FROM public.teacher_profiles p WHERE p.user_id=auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.teacher_v2_get_my_profile()
  FROM PUBLIC,anon,authenticated;

-- REVIEW GATES: role tests, email/phone validation parity, concurrent approval/edit,
-- privilege inspection, no data leakage, legacy compatibility, explicit owner approval.


-- REVIEW ONLY — NEVER EXECUTE without owner approval and Supabase security review.
-- Requires teacher_management_v2_schema_REVIEW_ONLY.sql and an existing verified
-- public.is_super_admin() RPC. Review its implementation and privileges first.
-- This file deliberately does NOT grant EXECUTE to authenticated/anon.

CREATE OR REPLACE FUNCTION public.teacher_v2_issue_employee_id(p_teacher_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' AS $$
DECLARE v_id text; v_status text; v_attempt integer; v_constraint text;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(public.is_super_admin(),false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Super Admin authorization required' USING ERRCODE='42501';
  END IF;
  SELECT status,employee_id INTO v_status,v_id
    FROM public.teacher_profiles WHERE user_id=p_teacher_user_id FOR UPDATE;
  IF NOT FOUND OR v_status<>'approved' THEN
    RAISE EXCEPTION 'Only approved teacher profiles can receive an employee ID' USING ERRCODE='42501';
  END IF;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  FOR v_attempt IN 1..10 LOOP
    v_id := 'KSOL-T-' || upper(substring(replace(pg_catalog.gen_random_uuid()::text,'-','') from 1 for 12));
    BEGIN
      UPDATE public.teacher_profiles SET employee_id=v_id,updated_at=now()
        WHERE user_id=p_teacher_user_id AND employee_id IS NULL;
      INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason,details)
        VALUES(auth.uid(),p_teacher_user_id,'employee_id.issued',
          'Super Admin issued employee ID for approved teacher',
          jsonb_build_object('employee_id',v_id));
      RETURN v_id;
    EXCEPTION WHEN unique_violation THEN
      -- Never mask unrelated uniqueness failures in audit or future schema changes.
      GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
      IF v_constraint <> 'teacher_profiles_employee_id_key' THEN
        RAISE;
      END IF;
      -- Retry only an actual Employee ID collision; the subtransaction rolled back.
    END;
  END LOOP;
  RAISE EXCEPTION 'Could not allocate unique teacher employee ID';
END;
$$;
REVOKE ALL ON FUNCTION public.teacher_v2_issue_employee_id(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.teacher_v2_set_assignment(
 p_teacher_user_id uuid,p_class_level text,p_subject text,p_work_type text,
 p_action text,p_reason text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' AS $$
DECLARE v_assignment_id uuid; v_status text;
BEGIN
  IF auth.uid() IS NULL OR COALESCE(public.is_super_admin(),false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Super Admin authorization required' USING ERRCODE='42501';
  END IF;
  IF p_reason IS NULL OR char_length(trim(p_reason)) NOT BETWEEN 12 AND 1000 THEN
    RAISE EXCEPTION 'A decision reason of 12–1000 characters is required';
  END IF;
  IF p_class_level IS NULL OR p_class_level NOT IN ('6','7','8','9','10','11','12')
    OR p_subject IS NULL OR p_subject NOT IN ('Political Science','History','Geography','Economics','Other')
    OR p_work_type IS NULL OR p_work_type NOT IN ('materials.draft','materials.review','assessment.draft','result.review')
    OR p_action IS NULL OR p_action NOT IN ('grant','revoke') THEN
    RAISE EXCEPTION 'Invalid assignment scope or action';
  END IF;
  IF p_action='grant' AND NOT private.teacher_v2_feature_enabled('registration') THEN
    RAISE EXCEPTION 'Teacher assignment grants disabled' USING ERRCODE='42501'; END IF;
  IF p_action='grant' AND p_work_type IN ('assessment.draft','result.review') AND NOT private.teacher_v2_feature_enabled('advanced_assignments') THEN
    RAISE EXCEPTION 'Advanced assignment grants disabled' USING ERRCODE='42501'; END IF;
  SELECT status INTO v_status FROM public.teacher_profiles
    WHERE user_id=p_teacher_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teacher profile does not exist' USING ERRCODE='42501';
  END IF;
  -- Suspended or rejected teachers must never receive new grants, but their
  -- existing grants must remain revocable by Super Admin for incident response.
  IF p_action='grant' AND v_status<>'approved' THEN
    RAISE EXCEPTION 'Only approved teachers can receive assignments' USING ERRCODE='42501';
  END IF;
  IF p_action='grant' THEN
    SELECT id INTO v_assignment_id FROM public.teacher_assignments
      WHERE teacher_user_id=p_teacher_user_id AND class_level=p_class_level
      AND subject=p_subject AND work_type=p_work_type AND status='active' FOR UPDATE;
    IF v_assignment_id IS NOT NULL THEN
      RAISE EXCEPTION 'Active assignment already exists';
    END IF;
    INSERT INTO public.teacher_assignments
      (teacher_user_id,class_level,subject,work_type,assigned_by)
      VALUES(p_teacher_user_id,p_class_level,p_subject,p_work_type,auth.uid())
      RETURNING id INTO v_assignment_id;
  ELSE
    UPDATE public.teacher_assignments SET status='revoked',revoked_by=auth.uid(),revoked_at=now()
      WHERE teacher_user_id=p_teacher_user_id AND class_level=p_class_level
      AND subject=p_subject AND work_type=p_work_type AND status='active'
      RETURNING id INTO v_assignment_id;
    IF v_assignment_id IS NULL THEN RAISE EXCEPTION 'No active assignment to revoke'; END IF;
  END IF;
  INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason,details)
    VALUES(auth.uid(),p_teacher_user_id,'assignment.'||p_action,p_reason,
      jsonb_build_object('assignment_id',v_assignment_id,'class_level',p_class_level,
        'subject',p_subject,'work_type',p_work_type));
  RETURN v_assignment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.teacher_v2_set_assignment(uuid,text,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
-- Server-side scoped authorization primitive for future Study Material / Results RPCs.
-- The caller cannot choose another teacher's user ID. No EXECUTE grant is active.
-- Never use this boolean alone for a write: the consuming RPC must enforce the
-- same check inside its own transaction and validate the target resource scope.
CREATE OR REPLACE FUNCTION public.teacher_v2_has_active_assignment(
 p_class_level text,p_subject text,p_work_type text
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = '' AS $$
DECLARE v_actor uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RETURN false; END IF;
  IF p_class_level IS NULL OR p_class_level NOT IN ('6','7','8','9','10','11','12')
     OR p_subject IS NULL OR p_subject NOT IN ('Political Science','History','Geography','Economics','Other')
     OR p_work_type IS NULL OR p_work_type NOT IN ('materials.draft','materials.review','assessment.draft','result.review')
  THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.teacher_profiles p
    JOIN public.teacher_assignments a ON a.teacher_user_id=p.user_id
    WHERE p.user_id=v_actor AND p.status='approved'
      AND a.status='active' AND a.revoked_at IS NULL
      AND a.class_level=p_class_level AND a.subject=p_subject
      AND a.work_type=p_work_type
  );
END;
$$;
REVOKE ALL ON FUNCTION public.teacher_v2_has_active_assignment(text,text,text)
  FROM PUBLIC, anon, authenticated;

-- SECURITY GATES BEFORE ANY EXECUTE GRANT:
-- Verify public.is_super_admin() uses auth.uid() and cannot be spoofed.
-- Add approved grant policies and negative RLS tests.
-- Explicitly grant EXECUTE to authenticated ONLY after independent security review.
-- Do not wire frontend RPC calls until that approval is complete.


-- REVIEW ONLY. NOT EXECUTED. Owner approval required before any activation.
-- Order: schema, profile_rpc, functions, lifecycle, integration. No automatic migration.

-- Optional legacy boundary: only installed when that old module already exists.
-- Same per-account lock as enrollment prevents a grant/review transition race
-- under the API's READ COMMITTED transactions. Runtime concurrency tests required.
CREATE OR REPLACE FUNCTION private.teacher_v2_guard_legacy_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.user_id::text,0));
 IF NEW.is_active AND EXISTS(SELECT 1 FROM public.teacher_profiles WHERE user_id=NEW.user_id) THEN
  RAISE EXCEPTION 'Legacy grant cannot bypass a v2 profile' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.teacher_v2_guard_legacy_grant() FROM PUBLIC,anon,authenticated,service_role;
DO $$ BEGIN
 IF to_regclass('public.result_staff_grants') IS NOT NULL THEN
  EXECUTE 'CREATE TRIGGER teacher_v2_no_legacy_grant BEFORE INSERT OR UPDATE ON public.result_staff_grants FOR EACH ROW EXECUTE FUNCTION private.teacher_v2_guard_legacy_grant()';
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.teacher_v2_save_application(p_profile jsonb,p_qualifications jsonb,p_scopes jsonb,p_reason text,p_submit boolean DEFAULT false,p_expected_revision integer DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor uuid:=auth.uid(); v_profile public.teacher_profiles; v_revision integer; q jsonb; s jsonb;
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF NOT private.teacher_v2_feature_enabled('registration') THEN RAISE EXCEPTION 'Teacher registration disabled' USING ERRCODE='42501'; END IF;
 -- Serialize even first submissions; profile updates and approval lock the same account.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text,0));
 SELECT * INTO v_profile FROM public.teacher_profiles WHERE user_id=v_actor FOR UPDATE;
 IF (v_profile.user_id IS NOT NULL AND p_expected_revision IS DISTINCT FROM v_profile.revision)
 OR (v_profile.user_id IS NULL AND p_expected_revision IS NOT NULL) THEN
  RAISE EXCEPTION 'Profile changed; reload before saving' USING ERRCODE='40001';
 END IF;
 IF FOUND AND (v_profile.status IN ('approved','suspended') OR v_profile.submitted_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Withdraw pending application before editing; approved profiles are locked' USING ERRCODE='42501';
 END IF;
 IF jsonb_typeof(p_profile) IS DISTINCT FROM 'object' OR jsonb_typeof(p_qualifications) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_qualifications)>20 OR jsonb_typeof(p_scopes) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_scopes)>60 OR p_submit IS NULL
 OR (p_submit AND (p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 12 AND 1000 OR jsonb_array_length(p_scopes)=0)) THEN
 RAISE EXCEPTION 'Invalid application' USING ERRCODE='22023'; END IF;
 -- Never let an applicant change a Super Admin-owned legacy grant.
 IF to_regclass('public.result_staff_grants') IS NOT NULL THEN
  PERFORM 1 FROM public.result_staff_grants WHERE user_id=v_actor AND is_active FOR UPDATE;
  IF FOUND THEN RAISE EXCEPTION 'Super Admin must close legacy staff access before v2 enrollment' USING ERRCODE='42501'; END IF;
 END IF;
 -- Rejected applicants may revise. No privileged fields are taken from client JSON.
 IF v_profile.status='rejected' THEN UPDATE public.teacher_profiles SET status='pending' WHERE user_id=v_actor; END IF;
 PERFORM public.teacher_v2_save_profile(p_profile->>'displayName',p_profile->>'contactEmail',p_profile->>'phone',(p_profile->>'experienceYears')::integer);
 FOR q IN SELECT value FROM jsonb_array_elements(p_qualifications) LOOP
  IF jsonb_typeof(q) IS DISTINCT FROM 'object' OR q->>'title' IS NULL OR q->>'institution' IS NULL
   OR char_length(btrim(q->>'title')) NOT BETWEEN 2 AND 120 OR char_length(btrim(q->>'institution')) NOT BETWEEN 2 AND 160
   OR (q->>'title') ~ '[[:cntrl:]]' OR (q->>'institution') ~ '[[:cntrl:]]'
   OR q->>'year' IS NULL OR (q->>'year')::integer NOT BETWEEN 1950 AND extract(year FROM now())::integer THEN
   RAISE EXCEPTION 'Invalid qualification' USING ERRCODE='22023'; END IF;
 END LOOP;
 FOR s IN SELECT value FROM jsonb_array_elements(p_scopes) LOOP
  IF (s->>'classLevel') IS NULL OR (s->>'classLevel') NOT IN ('6','7','8','9','10','11','12')
   OR (s->>'subject') IS NULL OR (s->>'subject') NOT IN ('Political Science','History','Geography','Economics','Other')
   OR (s->>'workType') IS NULL OR (s->>'workType') NOT IN ('materials.draft','materials.review','assessment.draft','result.review') THEN
   RAISE EXCEPTION 'Invalid scope' USING ERRCODE='22023'; END IF;
 END LOOP;
 DELETE FROM public.teacher_qualifications WHERE teacher_user_id=v_actor;
 INSERT INTO public.teacher_qualifications(teacher_user_id,title,institution,passing_year)
 SELECT v_actor,btrim(value->>'title'),btrim(value->>'institution'),(value->>'year')::integer FROM jsonb_array_elements(p_qualifications);
 UPDATE public.teacher_profiles SET revision=revision+1,requested_scopes=p_scopes,application_reason=btrim(p_reason),
 submitted_at=CASE WHEN p_submit THEN now() ELSE NULL END,updated_at=now() WHERE user_id=v_actor RETURNING revision INTO v_revision;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason,details)
 VALUES(v_actor,v_actor,CASE WHEN p_submit THEN 'application.submitted' ELSE 'profile.saved' END,'Applicant saved own teacher application',jsonb_build_object('revision',v_revision));
 RETURN v_revision;
END $$;

CREATE OR REPLACE FUNCTION public.teacher_v2_withdraw()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 UPDATE public.teacher_profiles SET submitted_at=NULL,revision=revision+1,updated_at=now() WHERE user_id=auth.uid() AND status='pending' AND submitted_at IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'No pending application'; END IF;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason) VALUES(auth.uid(),auth.uid(),'application.withdrawn','Applicant withdrew pending teacher application');
 RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.teacher_v2_review(p_user_id uuid,p_revision integer,p_decision text,p_reason text,p_verified boolean,p_assignments jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.teacher_profiles; s jsonb; v_id text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) OR auth.uid()=p_user_id THEN RAISE EXCEPTION 'Independent Super Admin required' USING ERRCODE='42501'; END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('approve','reject') OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 12 AND 1000
 OR jsonb_typeof(p_assignments) IS DISTINCT FROM 'array' OR jsonb_array_length(p_assignments)>60 THEN RAISE EXCEPTION 'Invalid review'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,0));
 SELECT * INTO p FROM public.teacher_profiles WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND OR p.status<>'pending' OR p.submitted_at IS NULL OR p_revision IS DISTINCT FROM p.revision THEN RAISE EXCEPTION 'Application changed; reload before review'; END IF;
 IF p_decision='approve' AND p_verified IS DISTINCT FROM true THEN RAISE EXCEPTION 'Identity verification required'; END IF;
 IF p_decision='approve' AND NOT private.teacher_v2_feature_enabled('registration') THEN RAISE EXCEPTION 'Teacher approval disabled' USING ERRCODE='42501'; END IF;
 -- Never issue an approved employee identity with zero authorized work scopes.
 -- Legacy class-10 teachers require explicit verified subject mapping before approval.
 IF p_decision='approve' AND jsonb_array_length(p_assignments)=0 THEN
  RAISE EXCEPTION 'Approval requires at least one verified class, subject and work assignment' USING ERRCODE='22023';
 END IF;
 UPDATE public.teacher_profiles SET decision_reason=btrim(p_reason),reviewed_at=now(),status=CASE WHEN p_decision='approve' THEN 'approved' ELSE 'rejected' END,
 approved_by=CASE WHEN p_decision='approve' THEN auth.uid() END,approved_at=CASE WHEN p_decision='approve' THEN now() END,
 submitted_at=NULL,revision=revision+1,updated_at=now() WHERE user_id=p_user_id;
 IF p_decision='approve' THEN
  -- Core Beta has no dependency on the optional legacy material schema.
  -- Transitioned accounts must not retain a legacy route around v2 revocation.
  IF to_regclass('public.result_staff_grants') IS NOT NULL THEN
   UPDATE public.result_staff_grants SET is_active=false WHERE user_id=p_user_id AND is_active;
  END IF;
  v_id:=public.teacher_v2_issue_employee_id(p_user_id);
  FOR s IN SELECT value FROM jsonb_array_elements(p_assignments) LOOP
   PERFORM public.teacher_v2_set_assignment(p_user_id,s->>'classLevel',s->>'subject',s->>'workType','grant',p_reason);
  END LOOP;
 END IF;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason,details)
 VALUES(auth.uid(),p_user_id,'application.'||p_decision,p_reason,jsonb_build_object('revision',p_revision,'assignments',p_assignments));
 RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.teacher_v2_suspend(p_user_id uuid,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) OR auth.uid()=p_user_id THEN RAISE EXCEPTION 'Independent Super Admin required' USING ERRCODE='42501'; END IF;
 IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 12 AND 1000 THEN RAISE EXCEPTION 'Reason required'; END IF;
 UPDATE public.teacher_profiles SET status='suspended',decision_reason=btrim(p_reason),reviewed_at=now(),revision=revision+1,updated_at=now() WHERE user_id=p_user_id AND status='approved';
 IF NOT FOUND THEN RAISE EXCEPTION 'Approved teacher required'; END IF;
 UPDATE public.teacher_assignments SET status='revoked',revoked_by=auth.uid(),revoked_at=now() WHERE teacher_user_id=p_user_id AND status='active';
 -- Close the legacy path too. This does not grant any new legacy rights.
 IF to_regclass('public.result_staff_grants') IS NOT NULL THEN
  UPDATE public.result_staff_grants SET is_active=false WHERE user_id=p_user_id AND is_active;
 END IF;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason) VALUES(auth.uid(),p_user_id,'teacher.suspended',p_reason);
 RETURN true;
END $$;

-- Restoration preserves identity but never revives revoked assignments or legacy grants.
CREATE OR REPLACE FUNCTION public.teacher_v2_restore(p_user_id uuid,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) OR auth.uid()=p_user_id THEN RAISE EXCEPTION 'Independent Super Admin required' USING ERRCODE='42501'; END IF;
 IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 12 AND 1000 THEN RAISE EXCEPTION 'Reason required'; END IF;
 UPDATE public.teacher_profiles SET status='approved',decision_reason=btrim(p_reason),reviewed_at=now(),revision=revision+1,updated_at=now()
 WHERE user_id=p_user_id AND status='suspended';
 IF NOT FOUND THEN RAISE EXCEPTION 'Suspended teacher required'; END IF;
 INSERT INTO public.teacher_audit_events(actor_user_id,teacher_user_id,action,reason)
 VALUES(auth.uid(),p_user_id,'teacher.restored',p_reason);
 RETURN true;
END $$;

-- Allowlisted nested payload: private object keys are never returned.
CREATE OR REPLACE FUNCTION public.teacher_v2_snapshot(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
 IF auth.uid() IS NULL OR (auth.uid()<>p_user_id AND NOT coalesce(public.is_super_admin(),false)) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT to_jsonb(p)||jsonb_build_object('qualifications',coalesce((SELECT jsonb_agg(jsonb_build_object('title',q.title,'institution',q.institution,'year',q.passing_year)) FROM public.teacher_qualifications q WHERE q.teacher_user_id=p.user_id),'[]'::jsonb),
 'assignments',coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM public.teacher_assignments a WHERE a.teacher_user_id=p.user_id),'[]'::jsonb),
 'resumes',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'original_filename',d.original_filename,'verification_status',d.verification_status)) FROM public.teacher_resume_documents d WHERE d.teacher_user_id=p.user_id),'[]'::jsonb)) INTO v FROM public.teacher_profiles p WHERE p.user_id=p_user_id;
 RETURN v;
END $$;
CREATE OR REPLACE FUNCTION public.teacher_v2_directory(p_offset integer DEFAULT 0,p_search text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) THEN RAISE EXCEPTION 'Super Admin required' USING ERRCODE='42501'; END IF;
 IF p_offset IS NULL OR p_offset<0 OR p_offset>100000 OR p_search IS NULL OR char_length(p_search)>160 THEN RAISE EXCEPTION 'Invalid directory query'; END IF;
 RETURN coalesce((SELECT jsonb_agg(public.teacher_v2_snapshot(p.user_id)) FROM
 (SELECT user_id FROM public.teacher_profiles WHERE display_name ILIKE '%'||p_search||'%' OR employee_id ILIKE '%'||p_search||'%' ORDER BY created_at,user_id LIMIT 25 OFFSET p_offset) p),'[]'::jsonb);
END $$;
CREATE OR REPLACE FUNCTION public.teacher_v2_audit(p_user_id uuid)
RETURNS SETOF public.teacher_audit_events LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) THEN RAISE EXCEPTION 'Super Admin required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT * FROM public.teacher_audit_events WHERE teacher_user_id=p_user_id ORDER BY created_at DESC,id LIMIT 100;
END $$;
-- Explicit grants form part of the review bundle, NOT an activated capability.
REVOKE ALL ON FUNCTION public.teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer),public.teacher_v2_withdraw(),public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb),public.teacher_v2_suspend(uuid,text),public.teacher_v2_restore(uuid,text),public.teacher_v2_snapshot(uuid),public.teacher_v2_directory(integer,text),public.teacher_v2_audit(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer),public.teacher_v2_withdraw(),public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb),public.teacher_v2_suspend(uuid,text),public.teacher_v2_restore(uuid,text),public.teacher_v2_snapshot(uuid),public.teacher_v2_directory(integer,text),public.teacher_v2_audit(uuid),public.teacher_v2_set_assignment(uuid,text,text,text,text,text) TO authenticated;

COMMIT;
