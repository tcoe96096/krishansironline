-- REVIEW ONLY. NOT EXECUTED. Run only on the separately owner-approved target.
-- Requires a verified core schema, essential acceptance and deployment/launch approval.
BEGIN;
SET LOCAL ksol.approved_release_sha='REPLACE_WITH_OWNER_APPROVED_40_HEX_SHA';
DO $$ BEGIN
 IF current_setting('ksol.approved_release_sha') !~ '^[0-9a-f]{40}$' THEN RAISE EXCEPTION 'Pin owner-approved release SHA first'; END IF;
 IF (SELECT count(*) FROM private.teacher_beta_features)<>5 THEN RAISE EXCEPTION 'Unexpected feature configuration; stop'; END IF;
END $$;
UPDATE private.teacher_beta_features SET enabled=(feature='registration');
INSERT INTO private.teacher_beta_feature_audit(action,release_commit,reason)
VALUES('open_registration',current_setting('ksol.approved_release_sha'),'Owner approved core-only all-teacher Beta opening');
COMMIT;
