import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');

test('Super Admin directory uses server-side filter and pending default',()=>{
 const ui=read('src/components/AdminTeacherDirectoryV2.tsx');
 assert.match(ui,/useState<[^>]+>\('pending'\)/);
 assert.match(ui,/teacherCall<unknown>\('teacher_v2_directory_filtered',\{p_offset:page\*25,p_search:query,p_status:statusFilter\}\)/);
 assert.match(ui,/aria-label="Filter teacher application status"/);
 for(const status of ['pending','draft','approved','rejected','suspended','all']){
   assert.ok(ui.includes('value="'+status+'"'),status+' status missing');
 }
 assert.match(ui,/setPage\(0\);setStatusFilter/);
 assert.match(ui,/\[user\?\.id,demoMode,page,query,reload,statusFilter\]/);
});

test('Filtered directory SQL guards role, input and server-side draft separation',()=>{
 const sql=read('docs/proposed-migrations/teacher_v2_directory_filtered_REVIEW_ONLY.sql');
 const body=sql.slice(sql.indexOf('CREATE FUNCTION'),sql.indexOf('REVOKE ALL ON FUNCTION'));
 assert.match(body,/auth\.uid\(\) IS NULL OR NOT coalesce\(public\.is_super_admin\(\),false\)/);
 assert.match(body,/p_offset<0 OR p_offset>100000/);
 assert.match(body,/char_length\(p_search\)>160/);
 assert.match(body,/p_status NOT IN \('all','pending','draft','approved','rejected','suspended'\)/);
 assert.match(body,/p_status='pending' AND t\.status='pending' AND t\.submitted_at IS NOT NULL/);
 assert.match(body,/p_status='draft' AND t\.status='pending' AND t\.submitted_at IS NULL/);
 assert.match(body,/LIMIT 25 OFFSET p_offset/);
 assert.match(body,/public\.teacher_v2_snapshot\(p\.user_id\)/);
 assert.doesNotMatch(body,/raw_user_meta_data|service_role|contact_email/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.teacher_v2_directory_filtered\(integer,text,text\)/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.teacher_v2_directory_filtered\(integer,text,text\)/);
});
