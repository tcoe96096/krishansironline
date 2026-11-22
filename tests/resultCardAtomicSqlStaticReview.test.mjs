import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const p='docs/results/ksol-result-atomic-transition-executable-CANDIDATE-DO-NOT-APPLY.sql';
const sql=readFileSync(p,'utf8');
test('candidate explicitly review-only and transactional',()=>{
 assert.match(sql,/REVIEW_ONLY \/ DO NOT APPLY/);
 assert.match(sql,/\bBEGIN;/);
 assert.match(sql,/\bCOMMIT;/);
});
test('transition requires session and super admin',()=>{
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/NOT public\.is_super_admin\(\)/);
 assert.match(sql,/ERRCODE='42501'/);
});
test('rejects stale version and serializes state',()=>{
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/result_version<>p_expected_version/);
 assert.match(sql,/pg_advisory_xact_lock/);
});
test('allows only release and revoke',()=>{
 assert.match(sql,/p_operation NOT IN \('release','revoke'\)/);
 assert.match(sql,/v_row\.state='approved'/);
 assert.match(sql,/v_row\.state='released'/);
});
test('idempotency key is unique and payload conflict rejected',()=>{
 assert.match(sql,/PRIMARY KEY\(actor_id,operation,request_key\)/);
 assert.match(sql,/v_prior\.attempt_id<>p_attempt_id/);
 assert.match(sql,/Conflicting request key/);
});
test('private tables deny direct client access',()=>{
 assert.match(sql,/REVOKE ALL ON private\.ksol_result_release/);
 assert.match(sql,/FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/REVOKE ALL ON SCHEMA private/);
});
test('no automatic result send or grant to anonymous role',()=>{
 assert.doesNotMatch(sql,/\bSELECT\s+public\.send_result_to_student\s*\(/i);
 assert.doesNotMatch(sql,/GRANT EXECUTE ON FUNCTION[^;]+TO anon/i);
});

test('rejects null operation and null eligibility explicitly',()=>{
 assert.match(sql,/p_operation IS NULL/);
 assert.match(sql,/student_account_is_eligible\(v_student\) IS DISTINCT FROM TRUE/);
});
