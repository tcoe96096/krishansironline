import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name: string) => readFileSync('docs/proposed-migrations/' + name + '_REVIEW_ONLY.sql', 'utf8');

test('identity verification evidence is revision-bound and inaccessible to browser roles', () => {
 const sql=read('teacher_v2_independent_verification');
 assert.match(sql,/teacher_user_id uuid NOT NULL REFERENCES public\.teacher_profiles\(user_id\)/);
 assert.match(sql,/profile_revision integer NOT NULL/);
 assert.match(sql,/verified_by uuid NOT NULL/);
 assert.match(sql,/WHERE revoked_at IS NULL/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON public\.teacher_identity_verifications FROM PUBLIC,anon,authenticated/);
});

test('review rejects forged verification boolean without independent evidence', () => {
 const sql=read('teacher_v2_review_independent_evidence_OVERRIDE');
 assert.match(sql,/p_verified boolean/);
 assert.match(sql,/FROM public\.teacher_identity_verifications v/);
 assert.match(sql,/v\.teacher_user_id=p_user_id AND v\.profile_revision=p\.revision/);
 assert.match(sql,/v\.revoked_at IS NULL AND v\.verified_by<>p_user_id/);
 assert.match(sql,/IF p_decision='approve' AND NOT EXISTS/);
 assert.doesNotMatch(sql,/p_verified IS DISTINCT FROM true/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.teacher_v2_review/);
});

test('verification writer restricts identity, revision, and audit', () => {
 const sql=read('teacher_v2_verification_writer');
 assert.match(sql,/auth\.uid\(\) IS NULL OR COALESCE\(public\.is_super_admin\(\),false\)/);
 assert.match(sql,/auth\.uid\(\)=p_teacher_user_id/);
 assert.match(sql,/v_profile\.revision<>p_profile_revision/);
 assert.match(sql,/v_profile\.status<>'pending'/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/identity\.verified/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.teacher_v2_record_identity_verification/);
});

test('status RPC lets Super Admin resume revision-bound verification without exposing evidence', () => {
 const sql=read('teacher_v2_verification_status');
 assert.match(sql,/STABLE SECURITY DEFINER SET search_path=''/);
 assert.match(sql,/auth\.uid\(\) IS NULL OR NOT coalesce\(public\.is_super_admin\(\),false\)/);
 assert.match(sql,/auth\.uid\(\)=p_teacher_user_id/);
 assert.match(sql,/v\.profile_revision=p\.revision/);
 assert.match(sql,/p\.revision=p_profile_revision/);
 assert.match(sql,/p\.status='pending' AND p\.submitted_at IS NOT NULL/);
 assert.match(sql,/v\.revoked_at IS NULL/);
 assert.match(sql,/v\.verified_by<>p_teacher_user_id/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.teacher_v2_verification_status/);
 assert.match(sql,/FROM PUBLIC,anon,authenticated;/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.teacher_v2_verification_status\(uuid,integer\)/);
 assert.match(sql,/TO authenticated;/);
 assert.doesNotMatch(sql,/\b(?:INSERT INTO|UPDATE public|DELETE FROM|TRUNCATE|DROP TABLE)\b/i);
});

test('review and verification writer use consistent lock order', () => {
 const review=read('teacher_v2_review_independent_evidence_OVERRIDE');
 const writer=read('teacher_v2_verification_writer');
 for (const sql of [review,writer]) {
  const advisory=sql.indexOf('pg_advisory_xact_lock');
  const rowLock=sql.indexOf('FOR UPDATE');
  assert.ok(advisory>=0 && rowLock>advisory);
 }
});

test('staging lifecycle cannot approve a teacher before independent evidence override is installed', () => {
 const lifecycle=readFileSync('docs/proposed-migrations/teacher_management_v2_lifecycle_REVIEW_ONLY.sql','utf8');
 const start=lifecycle.indexOf('CREATE OR REPLACE FUNCTION public.teacher_v2_review(');
 const end=lifecycle.indexOf('CREATE OR REPLACE FUNCTION public.teacher_v2_suspend(',start);
 assert.ok(start>=0&&end>start,'staging review RPC must be identifiable');
 const review=lifecycle.slice(start,end);
 const deny=review.indexOf("IF p_decision='approve' THEN\n   RAISE EXCEPTION 'Independent verification review override required before teacher approval'");
 const mutation=review.indexOf('UPDATE public.teacher_profiles SET decision_reason=');
 assert.ok(deny>=0&&mutation>deny,'approve must be rejected before any status/ID/role mutation');
 assert.match(review,/USING ERRCODE='42501'/);
 assert.doesNotMatch(review,/p_verified IS DISTINCT FROM true/,'caller-supplied boolean is not evidence');
 const override=read('teacher_v2_review_independent_evidence_OVERRIDE');
 assert.match(override,/FROM public\.teacher_identity_verifications v/);
 assert.match(override,/v\.profile_revision=p\.revision/);
 assert.match(override,/v\.revoked_at IS NULL/);
});
