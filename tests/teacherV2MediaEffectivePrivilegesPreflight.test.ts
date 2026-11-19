import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync('docs/proposed-migrations/teacher_v2_media_effective_privileges_PREFLIGHT_READ_ONLY.sql','utf8');

test('teacher media effective privileges audit is strictly SELECT-only',()=>{
 const statements=sql.replace(/--[^\n]*/g,'').split(';').map(s=>s.trim()).filter(Boolean);
 assert.equal(statements.length,3);
 for(const statement of statements){
  assert.match(statement,/^SELECT\b/i);
  const withoutStrings=statement.replace(/'(?:''|[^'])*'/g,"''");
  assert.doesNotMatch(withoutStrings,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY|EXECUTE)\b/i);
 }
});
test('audit checks inherited grants, table ownership, RLS and both storage tables',()=>{
 for(const fragment of ['has_schema_privilege','has_table_privilege','pg_catalog.pg_auth_members',
 'inherit_option','set_option','pg_catalog.pg_get_userbyid','relrowsecurity','relforcerowsecurity',
 "'objects'","'buckets'","'anon'","'authenticated'","'TRUNCATE'"]){
  assert.ok(sql.includes(fragment),fragment);
 }
});
