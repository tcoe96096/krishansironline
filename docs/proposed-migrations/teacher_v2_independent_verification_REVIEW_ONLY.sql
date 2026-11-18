-- REVIEW ONLY. NOT EXECUTED. Independent verification evidence proposal.
-- This is an additive building block, NOT a complete replacement for
-- teacher_v2_review. Do not deploy until that function is revised to query
-- this evidence inside the same locked approval transaction.
BEGIN;
CREATE TABLE IF NOT EXISTS public.teacher_identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_user_id uuid NOT NULL REFERENCES public.teacher_profiles(user_id),
  profile_revision integer NOT NULL CHECK (profile_revision > 0),
  verified_by uuid NOT NULL REFERENCES auth.users(id),
  verified_at timestamptz NOT NULL DEFAULT now(),
  evidence_reference text NOT NULL CHECK (char_length(btrim(evidence_reference)) BETWEEN 12 AND 240),
  verification_reason text NOT NULL CHECK (char_length(btrim(verification_reason)) BETWEEN 12 AND 1000),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  CONSTRAINT teacher_verification_revocation_consistency CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL) OR
    (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_one_active_verification_per_revision
 ON public.teacher_identity_verifications(teacher_user_id,profile_revision)
 WHERE revoked_at IS NULL;
ALTER TABLE public.teacher_identity_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_identity_verifications FROM PUBLIC,anon,authenticated;
COMMIT;
-- SECURITY REVIEW REQUIRED:
-- 1. Only separately audited Super Admin RPC can record/revoke verification.
-- 2. Evidence reference must not contain secrets, documents or raw identity numbers.
-- 3. Approval RPC must require matching teacher_user_id and profile_revision,
--    unrevoked verification, and verified_by <> teacher_user_id.
-- 4. Review/rejection/withdrawal/profile changes must invalidate stale evidence.
-- 5. Test races, forged caller booleans, RLS denials and audit trail.
-- 6. This proposal alone does NOT close the p_verified bypass risk.
