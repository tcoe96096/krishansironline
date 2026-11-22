-- REVIEW_ONLY / DO NOT APPLY
-- Private result PDF bucket candidate, deliberately NOT a production migration.
-- Preconditions: independent backup+restore, Supabase Storage version check,
-- service role/Edge Function design review and separate explicit owner approval.
BEGIN;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES (
  'result-cards-private',
  'result-cards-private',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;
-- No storage.objects policies are added here. A private bucket does NOT
-- automatically guarantee safe service-role access or safe signed URLs.
-- No authenticated/anon direct object SELECT, INSERT, UPDATE, DELETE grants.
-- Upload and download must be implemented through an authenticated server
-- endpoint that checks immutable result version, ownership, release state
-- and current revocation immediately before creating a short-lived URL.
-- Never reuse teacher-profile, teacher-resume or Studio buckets.
COMMIT;
-- REVIEW BLOCKER: verify the existing storage.objects policy set and ensure
-- no broad inherited policy grants access to this bucket. Verify object
-- key format, immutable PDF digest, signed URL TTL and audit retention.
