-- Synthetic, isolated PostgreSQL 17 fixture; NEVER run on Supabase.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE TABLE public.test_attempts (
  id uuid PRIMARY KEY,
  student_id uuid NOT NULL,
  status text NOT NULL
);
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL, role text NOT NULL
);
CREATE TABLE public.student_profiles (
  user_id uuid PRIMARY KEY,
  approval_status text NOT NULL,
  account_status text NOT NULL,
  deleted_at timestamptz
);
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  public boolean NOT NULL,
  file_size_limit bigint,
  allowed_mime_types text[]
);
CREATE TABLE storage.objects (
  bucket_id text NOT NULL,
  name text NOT NULL,
  metadata jsonb,
  archived_at timestamptz,
  is_delete_marker boolean NOT NULL DEFAULT false
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id=auth.uid() AND lower(role)='super_admin'
  );
$$;
CREATE OR REPLACE FUNCTION public.student_account_is_eligible(p_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_profiles
    WHERE user_id=p_student_id AND approval_status='approved'
      AND account_status='active' AND deleted_at IS NULL
  );
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_account_is_eligible(uuid) TO authenticated;
INSERT INTO public.user_roles VALUES
  ('11111111-1111-4111-8111-111111111111','super_admin');
INSERT INTO public.student_profiles (user_id,approval_status,account_status)
VALUES ('22222222-2222-4222-8222-222222222222','approved','active');
INSERT INTO public.test_attempts(id,student_id,status) VALUES
 ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','submitted');
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES
 ('result-cards-private','33333333-3333-4333-8333-333333333333/v1/'||repeat('a',64)||'.pdf',
  '{"mimetype":"application/pdf","size":128}'::jsonb),
 ('result-cards-private','33333333-3333-4333-8333-333333333333/v2/'||repeat('b',64)||'.pdf',
  '{"mimetype":"application/pdf","size":256}'::jsonb);
