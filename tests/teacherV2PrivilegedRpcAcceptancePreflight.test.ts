import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync('docs/proposed-migrations/teacher_v2_privileged_rpc_acceptance_PREFLIGHT_READ_ONLY.sql','utf8');

test('privileged RPC acceptance preflight is read-only',()=>{
 assert.match(sql,/REVIEW ONLY/);
 const statements=sql.replace(/--[^\n]*/g,'').split(';').map(x=>x.trim()).filter(Boolean);
 assert.equal(statements.length,1);
 assert.match(statements[0],/^WITH\b/i);
 const noStrings=statements[0].replace(/'(?:''|[^'])*'/g,"''");
 assert.doesNotMatch(noStrings,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY|EXECUTE)\b/i);
});

test('privileged RPC preflight checks all exact signatures and effective caller grants',()=>{
 for(const signature of [
  'teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer)',
  'teacher_v2_review(uuid,integer,text,text,boolean,jsonb)',
  'teacher_v2_record_identity_verification(uuid,integer,text,text)'
 ]) assert.ok(sql.includes(signature),signature);
 assert.match(sql,/to_regprocedure\(signature\)/);
 assert.match(sql,/has_function_privilege\('anon'/);
 assert.match(sql,/has_function_privilege\('authenticated'/);
 assert.match(sql,/p\.prosecdef/);
});
