-- MINIMAL BETA REVIEW-ONLY TESTS. NOT EXECUTED. Owner approval required, isolated Preview only.
-- Run only AFTER separately approved core schema/beta_flags/profile/functions/lifecycle bundle.
-- Every fixture and side effect rolls back. Never run against Production.
BEGIN;
-- Only basic registration is opened inside this rollback-only fixture.
UPDATE private.teacher_beta_features SET enabled=(feature='registration');
INSERT INTO auth.users(id,email) VALUES
 ('11111111-1111-4111-8111-111111111111','teacher-v2-acceptance@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','other-v2-acceptance@example.invalid'),
 ('33333333-3333-4333-8333-333333333333','admin-v2-acceptance@example.invalid');
INSERT INTO public.user_roles(user_id,role) VALUES('33333333-3333-4333-8333-333333333333','super_admin'),('22222222-2222-4222-8222-222222222222','admin');
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SELECT public.teacher_v2_save_application(
 '{"displayName":"Acceptance Teacher","contactEmail":"teacher@example.invalid","phone":"","experienceYears":2}',
 '[{"title":"MA History","institution":"Acceptance University","year":2020},{"title":"BEd","institution":"Acceptance College","year":2022}]',
 '[{"classLevel":"10","subject":"History","workType":"materials.draft"}]',
 'Acceptance test teacher application',false);
DO $$ BEGIN
 BEGIN
  PERFORM public.teacher_v2_save_application('{"displayName":"Stale edit"}','[]','[]','',false,NULL);
  RAISE EXCEPTION 'FAIL: stale draft overwrite';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
SELECT public.teacher_v2_save_application(
 '{"displayName":"Acceptance Teacher","contactEmail":"teacher@example.invalid","phone":"","experienceYears":2}',
 '[{"title":"MA History","institution":"Acceptance University","year":2020},{"title":"BEd","institution":"Acceptance College","year":2022}]',
 '[{"classLevel":"10","subject":"History","workType":"materials.draft"}]',
 'Acceptance test teacher application',true,2);
DO $$ BEGIN
 BEGIN
  PERFORM public.teacher_v2_snapshot('22222222-2222-4222-8222-222222222222');
  RAISE EXCEPTION 'FAIL: cross-account profile read';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.teacher_v2_directory();RAISE EXCEPTION 'FAIL: teacher directory access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.teacher_profiles SET employee_id='KSOL-T-AAAAAAAAAAAA' WHERE user_id=auth.uid();
  RAISE EXCEPTION 'FAIL: self-issued employee ID';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  DELETE FROM public.teacher_audit_events;RAISE EXCEPTION 'FAIL: audit tampering';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF public.teacher_v2_has_active_assignment('10','History','materials.draft') THEN RAISE EXCEPTION 'FAIL: pending v2 assignment'; END IF;

END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $$ BEGIN
 BEGIN PERFORM public.teacher_v2_directory();RAISE EXCEPTION 'FAIL: ordinary Admin directory access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SELECT public.teacher_v2_review('11111111-1111-4111-8111-111111111111',3,'approve','Independently verified acceptance identity',true,'[{"classLevel":"10","subject":"History","workType":"materials.draft"},{"classLevel":"12","subject":"Political Science","workType":"materials.draft"}]');
DO $$ DECLARE p jsonb; BEGIN
 p:=public.teacher_v2_snapshot('11111111-1111-4111-8111-111111111111');
 IF p->>'employee_id' !~ '^KSOL-T-[A-Z0-9]{8,16}$' OR p->>'status'<>'approved' OR jsonb_array_length(p->'qualifications')<>2 OR jsonb_array_length(p->'assignments')<>2 THEN RAISE EXCEPTION 'FAIL: atomic approval/profile payload'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 BEGIN
  INSERT INTO public.teacher_profiles(user_id,display_name,status,employee_id,approved_by,approved_at)
  SELECT '22222222-2222-4222-8222-222222222222','Duplicate ID fixture','approved',employee_id,
   '33333333-3333-4333-8333-333333333333',now()
  FROM public.teacher_profiles WHERE user_id='11111111-1111-4111-8111-111111111111';
  RAISE EXCEPTION 'FAIL: duplicate employee ID accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
 IF NOT public.teacher_v2_has_active_assignment('10','History','materials.draft')
 OR NOT public.teacher_v2_has_active_assignment('12','Political Science','materials.draft') THEN
  RAISE EXCEPTION 'FAIL: multiple class/subject assignments missing'; END IF;
 IF coalesce((SELECT (public.teacher_v2_beta_capabilities()->>'materials')::boolean),false) THEN
  RAISE EXCEPTION 'FAIL: advanced authoring enabled in basic Beta'; END IF;
 IF EXISTS(SELECT 1 FROM public.test_attempts) THEN RAISE EXCEPTION 'FAIL: Teacher read another student result'; END IF;
 BEGIN
  PERFORM public.teacher_v2_issue_employee_id(auth.uid());
  RAISE EXCEPTION 'FAIL: teacher directly issued employee ID';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SELECT public.teacher_v2_set_assignment('11111111-1111-4111-8111-111111111111','10','History','materials.draft','revoke','Acceptance test immediate assignment revocation');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
 IF public.teacher_v2_has_active_assignment('10','History','materials.draft') THEN RAISE EXCEPTION 'FAIL: revoked v2 assignment retained'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SELECT public.teacher_v2_suspend('11111111-1111-4111-8111-111111111111','Acceptance test immediate teacher suspension');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
 IF public.teacher_v2_has_active_assignment('10','History','materials.draft') OR public.teacher_v2_has_active_assignment('12','Political Science','materials.draft') THEN RAISE EXCEPTION 'FAIL: revoked access retained'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
DO $$ BEGIN
 BEGIN PERFORM public.teacher_v2_restore('11111111-1111-4111-8111-111111111111','Unauthorized ordinary Admin restore');RAISE EXCEPTION 'FAIL: ordinary Admin restoration';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SELECT public.teacher_v2_restore('11111111-1111-4111-8111-111111111111','Acceptance verified restoration without grants');
DO $$ DECLARE p jsonb; BEGIN
 p:=public.teacher_v2_snapshot('11111111-1111-4111-8111-111111111111');
 IF p->>'status'<>'approved' OR p->>'employee_id' IS NULL OR p->>'decision_reason'<>'Acceptance verified restoration without grants' THEN RAISE EXCEPTION 'FAIL: restoration identity or review note'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
DO $$ BEGIN
 IF public.teacher_v2_has_active_assignment('10','History','materials.draft') OR public.teacher_v2_has_active_assignment('12','Political Science','materials.draft') THEN RAISE EXCEPTION 'FAIL: restoration revived revoked assignments'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
DO $$ BEGIN
 BEGIN PERFORM public.teacher_v2_snapshot('11111111-1111-4111-8111-111111111111');RAISE EXCEPTION 'FAIL: anonymous profile access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
-- Remaining owner-approved acceptance: concurrent approval vs edit/upload; actual
-- storage + scanner; material writes, publication/result-edit denial under every
-- existing policy; real Google OAuth; ordinary Admin; account deletion/retention.
