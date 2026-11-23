import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const read=(name:string)=>readFileSync('docs/proposed-migrations/'+name,'utf8');

test('Preview user_roles hardening stays review-only, transactional and effective-privilege checked',()=>{
 const sql=read('teacher_management_v2_role_grants_hardening_REVIEW_ONLY.sql');
 assert.match(sql,/REVIEW ONLY/i);
 assert.match(sql,/NOT EXECUTED/i);
 assert.match(sql,/BEGIN;/);
 assert.match(sql,/COMMIT;/);
 assert.match(sql,/REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public\.user_roles FROM anon, authenticated;/);
 for(const role of ["'anon'","'authenticated'"])assert.ok(sql.includes(role));
 for(const privilege of ["'TRUNCATE'","'TRIGGER'","'REFERENCES'"])assert.ok(sql.includes(privilege));
 assert.match(sql,/has_table_privilege\(v_role, 'public\.user_roles', v_privilege\)/);
 assert.match(sql,/RAISE EXCEPTION/);
 assert.doesNotMatch(sql,/\bGRANT\b\s+(?:TRUNCATE|TRIGGER|REFERENCES)/i);
});

test('Targeted TRUNCATE patch checks effective inherited access and never truncates rows',()=>{
 const sql=read('teacher_v2_user_roles_truncate_privilege_FIX_REVIEW_ONLY.sql');
 assert.match(sql,/REVIEW ONLY/i);
 assert.match(sql,/REVOKE TRUNCATE ON TABLE public\.user_roles FROM PUBLIC, anon, authenticated;/);
 assert.match(sql,/has_table_privilege\('anon','public\.user_roles','TRUNCATE'\)/);
 assert.match(sql,/has_table_privilege\('authenticated','public\.user_roles','TRUNCATE'\)/);
 assert.doesNotMatch(sql,/^\s*TRUNCATE\s+(?:TABLE\s+)?public\.user_roles\s*;/im);
});

test('Role hardening proposals are not installed migrations',()=>{
 const installed=readdirSync('supabase/migrations');
 assert.equal(installed.some(name=>/teacher.*(?:role_grants_hardening|truncate_privilege)/i.test(name)),false);
});
