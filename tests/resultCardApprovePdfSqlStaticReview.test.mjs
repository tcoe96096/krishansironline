import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync('docs/results/ksol-result-approve-pdf-CANDIDATE-DO-NOT-APPLY.sql','utf8');
const atomic=readFileSync('docs/results/ksol-result-atomic-transition-executable-CANDIDATE-DO-NOT-APPLY.sql','utf8');

test('approval candidate is one review-only SQL transaction',()=>{
 assert.match(sql,/REVIEW_ONLY \/ DO NOT APPLY/);
 assert.equal((sql.match(/^BEGIN;$/gm)||[]).length,1);
 assert.equal((sql.match(/^COMMIT;$/gm)||[]).length,1);
 const tail=sql.split(/^COMMIT;$/m)[1]??'';
 assert.ok(tail.split(/\r?\n/).every(x=>x.trim()===''||x.trim().startsWith('--')));
});

test('approval enforces super-admin session and idempotent digest-bound request',()=>{
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/NOT public\.is_super_admin\(\)/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/v_prior\.artifact_sha256 IS DISTINCT FROM p_artifact_sha256/);
 assert.match(sql,/operation='approve' AND request_key=p_request_key/);
 assert.match(atomic,/operation text NOT NULL CHECK\(operation IN \('release','revoke','approve'\)\)/);
 assert.match(atomic,/CONSTRAINT ksol_request_approval_digest CHECK/);
 assert.match(atomic,/artifact_sha256 IS NOT NULL/);
});

test('approval requires submitted eligible attempt and valid existing private PDF',()=>{
 assert.match(sql,/FROM public\.test_attempts a WHERE a\.id=p_attempt_id FOR UPDATE/);
 assert.match(sql,/v_status IS DISTINCT FROM 'submitted'/);
 assert.match(sql,/student_account_is_eligible\(v_student\) IS DISTINCT FROM TRUE/);
 assert.match(sql,/FROM storage\.objects o/);
 assert.match(sql,/o\.bucket_id='result-cards-private'/);
 assert.match(sql,/o\.name=v_object_key/);
 assert.match(sql,/o\.is_delete_marker IS FALSE/);
 assert.match(sql,/o\.metadata->>'mimetype'='application\/pdf'/);
 assert.match(sql,/\(o\.metadata->>'size'\)::bigint BETWEEN 1 AND 10485760/);
 assert.ok(sql.includes("p_artifact_sha256 !~ '^[0-9a-f]{64}$'"));
});

test('approval is not publication and preserves monotonic versions',()=>{
 assert.match(sql,/p_expected_version <> v_row\.result_version\+1/);
 assert.match(sql,/v_row\.state IS DISTINCT FROM 'revoked'/);
 assert.match(sql,/p_expected_version <> 1/);
 assert.match(sql,/operation,previous_state,next_state,request_key/);
 assert.match(sql,/VALUES\(v_actor,p_attempt_id,p_expected_version,'approve',v_previous,'approved',p_request_key\)/);
 assert.doesNotMatch(sql,/^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+storage\.objects\b/im);
 assert.doesNotMatch(sql,/GRANT EXECUTE[^;]*TO anon/i);
});
