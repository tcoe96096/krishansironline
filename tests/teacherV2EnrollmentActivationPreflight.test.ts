import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync('docs/proposed-migrations/teacher_v2_enrollment_activation_PREFLIGHT_READ_ONLY.sql','utf8');

test('enrollment activation preflight contains only read-only queries',()=>{
 assert.match(sql,/REVIEW ONLY/);
 const withoutComments=sql.replace(/--[^\n]*/g,'').trim();
 const statements=withoutComments.split(';').map(s=>s.trim()).filter(Boolean);
 assert.equal(statements.length,1,'one SELECT UNION query expected');
 for(const statement of statements){
  assert.match(statement,/^SELECT\b/i);
  const noLiterals=statement.replace(/'(?:''|[^'])*'/g,"''");
  assert.doesNotMatch(noLiterals,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY|EXECUTE)\b/i);
 }
});

test('enrollment preflight verifies actual runtime activation blockers',()=>{
 assert.match(sql,/pg_policies/);
 assert.match(sql,/teacher_enrollment_requests/);
 assert.match(sql,/cmd IN \('INSERT','ALL'\)/);
 assert.match(sql,/teacher_v2_save_application\(jsonb,jsonb,jsonb,text,boolean,integer\)/);
 assert.match(sql,/teacher_v2_review\(uuid,integer,text,text,boolean,jsonb\)/);
 for(const role of ['anon','authenticated']){
  assert.ok(sql.includes(`has_table_privilege('${role}','public.user_roles','TRUNCATE')`));
 }
});
