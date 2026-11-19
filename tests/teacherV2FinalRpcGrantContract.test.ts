import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const dir='docs/proposed-migrations/';
const grant=readFileSync(dir+'teacher_v2_final_rpc_grants_REVIEW_ONLY.sql','utf8');
const review=readFileSync(dir+'teacher_v2_review_independent_evidence_OVERRIDE_REVIEW_ONLY.sql','utf8');
const writer=readFileSync(dir+'teacher_v2_verification_writer_REVIEW_ONLY.sql','utf8');

test('final proposed RPC grants target exact review and verification signatures',()=>{
 assert.match(grant,/REVIEW ONLY; NOT EXECUTED/);
 for(const sig of ['teacher_v2_review(uuid,integer,text,text,boolean,jsonb)',
  'teacher_v2_record_identity_verification(uuid,integer,text,text)']){
  assert.ok(grant.includes(sig),sig);
 }
 assert.match(grant,/FROM PUBLIC,anon,authenticated/);
 assert.match(grant,/TO authenticated/);
 assert.doesNotMatch(grant,/\bGRANT\s+(?:ALL|INSERT|UPDATE|DELETE|TRUNCATE)\s+ON\s+TABLE\b/i);
});

test('both proposed privileged RPCs retain internal independent admin checks',()=>{
 for(const sql of [review,writer]){
  assert.match(sql,/SECURITY DEFINER SET search_path=''/);
  assert.match(sql,/auth\.uid\(\) IS NULL/);
  assert.match(sql,/public\.is_super_admin\(\)/);
  assert.match(sql,/auth\.uid\(\)\s*=\s*p_(?:user_id|teacher_user_id)/);
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/FOR UPDATE/);
 }
 assert.match(review,/Do not trust p_verified/);
 assert.match(review,/v\.revoked_at IS NULL/);
 assert.match(writer,/v_profile\.revision<>p_profile_revision/);
});
