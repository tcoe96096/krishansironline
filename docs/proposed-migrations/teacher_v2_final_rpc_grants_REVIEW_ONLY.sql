-- REVIEW ONLY; NOT EXECUTED. Candidate FINAL privilege reconciliation.
-- Apply only AFTER schema, lifecycle, independent-verification table,
-- verification writer and independent-evidence review override; requires
-- separate approval, recoverable Preview backup and authenticated negative tests.
-- This restores browser RPC transport access, NOT Super Admin authorization:
-- both SECURITY DEFINER functions independently check auth.uid(),
-- public.is_super_admin(), and prohibit self-verification/review.
BEGIN;
REVOKE ALL ON FUNCTION
 public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb),
 public.teacher_v2_record_identity_verification(uuid,integer,text,text)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.teacher_v2_review(uuid,integer,text,text,boolean,jsonb),
 public.teacher_v2_record_identity_verification(uuid,integer,text,text)
TO authenticated;
COMMIT;
-- Mandatory before deployment: verify exact signatures and no unexpected
-- overloads; inspect function owner, search_path and effective PUBLIC/anon
-- EXECUTE; test anonymous, non-admin, teacher self-review, ordinary admin,
-- stale revision, duplicate verification, missing/revoked evidence and
-- legitimate independent Super Admin paths. This script does not fix the
-- unrelated public.user_roles TRUNCATE exposure.
