-- REVIEW ONLY. NOT EXECUTED. No migration or grant has been applied.
-- Read-only, revision-bound verification status for independently authorized
-- Super Admin callers. Needed after page refresh so a previously recorded
-- verification can be reviewed without inventing an unverifiable local flag.
-- Requires teacher_profiles, teacher_identity_verifications and the audited
-- public.is_super_admin() function, plus a recoverable Preview restore first.
BEGIN;
CREATE OR REPLACE FUNCTION public.teacher_v2_verification_status(
 p_teacher_user_id uuid,p_profile_revision integer
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false)
    OR auth.uid()=p_teacher_user_id THEN
   RAISE EXCEPTION 'Independent Super Admin required' USING ERRCODE='42501';
 END IF;
 IF p_teacher_user_id IS NULL OR p_profile_revision IS NULL
    OR p_profile_revision<1 THEN RETURN false; END IF;
 RETURN EXISTS (
   SELECT 1 FROM public.teacher_profiles p
   JOIN public.teacher_identity_verifications v
     ON v.teacher_user_id=p.user_id AND v.profile_revision=p.revision
   WHERE p.user_id=p_teacher_user_id AND p.revision=p_profile_revision
     AND p.status='pending' AND p.submitted_at IS NOT NULL
     AND v.revoked_at IS NULL AND v.verified_by<>p_teacher_user_id
 );
END $$;
-- SECURITY REVIEW: revoke default PUBLIC function EXECUTE before a narrowly
-- scoped authenticated transport grant. The function itself checks Super Admin
-- and denies self-verification, anonymous, ordinary-admin and teacher callers.
REVOKE ALL ON FUNCTION public.teacher_v2_verification_status(uuid,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_v2_verification_status(uuid,integer)
 TO authenticated;
COMMIT;
-- NOT A RELEASE APPROVAL. Before ANY application require: exact grants and
-- overload preflight, recovery rehearsal, JWT role-positive/negative tests,
-- stale/withdrawn/revoked evidence tests and separate owner authorization.
-- Never grant to anon/PUBLIC; never expose evidence_reference or document bytes.
