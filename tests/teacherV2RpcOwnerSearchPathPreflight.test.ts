import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const path='docs/proposed-migrations/teacher_v2_rpc_owner_search_path_PREFLIGHT_READ_ONLY.sql';
const sql=readFileSync(path,'utf8');
test('RPC owner and search_path preflight is read-only and covers all critical signatures',()=>{
  const clean=sql.replace(/--[^\n]*/g,'').replace(/'(?:''|[^'])*'/g,"''").trim();
  assert.match(clean,/^WITH\s+required\s*\(/i);
  assert.match(clean,/\bSELECT\b/i);
  assert.doesNotMatch(clean,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY|EXECUTE|PERFORM)\b/i);
  for(const name of ['teacher_v2_save_application','teacher_v2_review','teacher_v2_record_identity_verification']){
    assert.ok(sql.includes("'"+name+"'"),name);
  }
  assert.match(sql,/to_regprocedure/);
  assert.match(sql,/pg_get_userbyid\(p\.proowner\)/);
  assert.match(sql,/p\.prosecdef/);
  assert.match(sql,/p\.proconfig/);
  assert.match(sql,/search_path=/);
  assert.match(sql,/has_function_privilege\('anon'/);
  assert.match(sql,/has_function_privilege\('authenticated'/);
  assert.match(sql,/overload_count/);
  assert.match(sql,/authenticated negative tests/);
});
