import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name:string)=>readFileSync('docs/proposed-migrations/'+name,'utf8');
const readSource=(path:string)=>readFileSync(path,'utf8');

test('v2 registration uses server-owned RPC rather than legacy enrollment INSERT',()=>{
 const ui=readSource('src/components/TeacherManagementV2.tsx');
 const service=readSource('src/services/teacherManagement.ts');
 assert.match(ui,/saveTeacherApplication\(/);
 assert.match(service,/requireSupabase\(\)\.rpc\(name,args\)/);
});

test('independent verification is revision-bound and not a client boolean',()=>{
 const table=read('teacher_v2_independent_verification_REVIEW_ONLY.sql');
 const writer=read('teacher_v2_verification_writer_REVIEW_ONLY.sql');
 const override=read('teacher_v2_review_independent_evidence_OVERRIDE_REVIEW_ONLY.sql');
 assert.match(table,/teacher_one_active_verification_per_revision/);
 assert.match(writer,/v_profile\.revision<>p_profile_revision/);
 assert.match(writer,/auth\.uid\(\)=p_teacher_user_id/);
 assert.match(override,/v\.profile_revision=p\.revision/);
 assert.match(override,/v\.revoked_at IS NULL/);
 assert.match(override,/v\.verified_by<>p_user_id/);
 assert.match(override,/Do not trust p_verified/);
});

test('privileged RPCs are revoked after independent evidence override pending grant approval',()=>{
 const lifecycle=read('teacher_management_v2_lifecycle_REVIEW_ONLY.sql');
 const writer=read('teacher_v2_verification_writer_REVIEW_ONLY.sql');
 const override=read('teacher_v2_review_independent_evidence_OVERRIDE_REVIEW_ONLY.sql');
 assert.match(lifecycle,/GRANT EXECUTE ON FUNCTION[\s\S]*?public\.teacher_v2_review\(uuid,integer,text,text,boolean,jsonb\)[\s\S]*?TO authenticated;/);
 assert.match(writer,/REVOKE ALL ON FUNCTION public\.teacher_v2_record_identity_verification\(uuid,integer,text,text\)[\s\S]*?FROM PUBLIC,anon,authenticated;/);
 assert.match(override,/REVOKE ALL ON FUNCTION public\.teacher_v2_review\(uuid,integer,text,text,boolean,jsonb\)[\s\S]*?FROM PUBLIC,anon,authenticated;/);
 assert.doesNotMatch(override,/GRANT EXECUTE/);
});

test('proposed verification cannot mutate existing legacy grants',()=>{
 for(const name of ['teacher_v2_independent_verification_REVIEW_ONLY.sql','teacher_v2_verification_writer_REVIEW_ONLY.sql']){
  const sql=read(name);
  assert.doesNotMatch(sql,/\b(?:UPDATE|DELETE FROM|TRUNCATE|DROP TABLE)\s+public\.result_staff_grants/i);
 }
});
