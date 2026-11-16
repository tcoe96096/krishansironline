-- REVIEW ONLY. DO NOT EXECUTE. Requires owner approval, compatibility review and RLS tests.
-- KSOL Teacher Management v2 proposed additive schema; no privileges are granted here.
BEGIN;
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id text UNIQUE,
  -- Employee identity is retained after suspension; never issue to pending/rejected accounts.
  display_name text NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 160),
  contact_email text,
  phone text,
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
  CONSTRAINT teacher_resume_storage_key_no_traversal CHECK (storage_path !~ '(^/|\\.\\.|//|\\\\)'),
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
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
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
COMMIT;
-- Not included: employee-ID issuer, approval RPC, private bucket policies,
-- secure upload verification, compatibility migration and tested role policies.
),
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
  CONSTRAINT teacher_resume_storage_key_no_traversal CHECK (storage_path !~ '(^/|\\.\\.|//|\\\\)'),
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
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
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
COMMIT;
-- Not included: employee-ID issuer, approval RPC, private bucket policies,
-- secure upload verification, compatibility migration and tested role policies.
