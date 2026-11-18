import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync('docs/proposed-migrations/teacher_v2_rpc_effective_privileges_PREFLIGHT_READ_ONLY.sql','utf8');

test('RPC preflight is explicitly read-only and has no mutation statements',()=>{
 assert.match(sql,/REVIEW ONLY/);
 assert.match(sql,/READ-ONLY PREFLIGHT/);
 const statements=sql.replace(/--[^\n]*/g,'').split(';').map(s=>s.trim()).filter(Boolean);
 assert.equal(statements.length,3,'expected three read-only inspection queries');
 for(const statement of statements){
  assert.match(statement,/^(?:WITH|SELECT)\b/i);
  assert.doesNotMatch(statement,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY|EXECUTE)\b/i);
 }
});

test('RPC preflight checks exact signatures, overloaded functions and effective grants',()=>{
 for(const name of ['teacher_v2_review','teacher_v2_record_identity_verification','teacher_v2_save_application','teacher_v2_snapshot','teacher_v2_set_assignment']){
  assert.ok(sql.includes(name),name);
 }
 assert.match(sql,/to_regprocedure\(signature\)/);
 assert.match(sql,/pg_proc/);
 assert.match(sql,/aclexplode\(/);
 assert.match(sql,/has_function_privilege\('anon'/);
 assert.match(sql,/has_function_privilege\('authenticated'/);
 assert.match(sql,/public\.user_roles/);
 assert.match(sql,/has_table_privilege\('anon','public\.user_roles','TRUNCATE'\)/);
});
