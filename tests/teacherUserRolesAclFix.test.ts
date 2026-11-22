import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync('docs/proposed-migrations/teacher_v2_user_roles_truncate_privilege_FIX_REVIEW_ONLY.sql','utf8');

test('user role security proposal removes inherited/public truncate permission without mutating any rows',()=>{
 assert.match(sql,/REVOKE TRUNCATE ON TABLE public\.user_roles FROM PUBLIC, anon, authenticated;/);
 assert.match(sql,/has_table_privilege\('anon','public\.user_roles','TRUNCATE'\)/);
 assert.match(sql,/has_table_privilege\('authenticated','public\.user_roles','TRUNCATE'\)/);
 assert.match(sql,/BEGIN;/);
 assert.match(sql,/COMMIT;/);
 const withoutComments=sql.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n');
 assert.doesNotMatch(withoutComments,/\b(?:DELETE\s+FROM|DROP\s+TABLE|TRUNCATE\s+TABLE|UPDATE\s+public\.user_roles)\b/i);
});
