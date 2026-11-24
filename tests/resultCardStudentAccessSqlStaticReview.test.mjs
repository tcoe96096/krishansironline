import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync('docs/results/ksol-result-student-access-gate-CANDIDATE-DO-NOT-APPLY.sql','utf8');
test('student access gate is review-only',()=>assert.match(sql,/REVIEW_ONLY \/ DO NOT APPLY/));
test('checks logged in owner and eligible account',()=>{
 assert.match(sql,/a\.student_id=auth\.uid\(\)/);
 assert.match(sql,/student_account_is_eligible\(auth\.uid\(\)\)/);
});
test('requires submitted and released exact version',()=>{
 assert.match(sql,/a\.status='submitted'/);
 assert.match(sql,/r\.state='released'/);
 assert.match(sql,/r\.result_version=p_expected_version/);
});
test('no anonymous execute or direct result delivery',()=>{
 assert.match(sql,/FROM PUBLIC,anon/);
 assert.match(sql,/TO authenticated/);
 assert.doesNotMatch(sql,/GRANT EXECUTE[^;]*TO anon/i);
 assert.doesNotMatch(sql,/send_result_to_student\s*\(/);
});
