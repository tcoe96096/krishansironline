import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DOCX_MIME,PDF_MIME,TEACHER_RESUME_MAX_BYTES,TEACHER_RESUME_BUCKET,
 isOwnResumeReservation,resumeDraftWritable,validateTeacherResume} from '../src/lib/teacherResumePolicy';

const own='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const document='33333333-3333-4333-8333-333333333333';
const valid={document_id:document,storage_path:own+'/'+document+'.pdf'};

test('only matching PDF/DOCX extensions, MIME and 5 MB input sizes pass',()=>{
 assert.equal(validateTeacherResume({name:'professional-cv.pdf',type:PDF_MIME,size:TEACHER_RESUME_MAX_BYTES}),null);
 assert.equal(validateTeacherResume({name:'professional-cv.DOCX',type:DOCX_MIME,size:500}),null);
 for(const item of [
  {name:'cv.pdf',type:DOCX_MIME,size:100},{name:'cv.docx',type:PDF_MIME,size:100},
  {name:'x.svg',type:'image/svg+xml',size:100},{name:'../cv.pdf',type:PDF_MIME,size:100},
  {name:'a/cv.pdf',type:PDF_MIME,size:100},{name:'a\\cv.pdf',type:PDF_MIME,size:100},
  {name:'cv.pdf',type:PDF_MIME,size:0},{name:'cv.pdf',type:PDF_MIME,size:TEACHER_RESUME_MAX_BYTES+1}
 ])assert.notEqual(validateTeacherResume(item),null,JSON.stringify(item));
});
test('reserve response is accepted only for authenticated owner and exact opaque UUID key',()=>{
 assert.equal(TEACHER_RESUME_BUCKET,'teacher-resumes-private');
 assert.equal(isOwnResumeReservation(valid,own),true);
 assert.equal(isOwnResumeReservation({...valid,storage_path:own+'/'+document+'.docx'},own),true);
 assert.equal(isOwnResumeReservation(valid,other),false);
 for(const wrong of [
  {...valid,storage_path:other+'/'+document+'.pdf'},
  {...valid,storage_path:'../'+document+'.pdf'},
  {...valid,storage_path:own+'/files/'+document+'.pdf'},
  {...valid,document_id:'invalid'}, {...valid,storage_path:own+'/'+document+'.exe'},
  {...valid,storage_path:own+'/'+document.toUpperCase()+'.pdf'},null,
 ])assert.equal(isOwnResumeReservation(wrong,own),false);
});
test('submitted, approved, suspended and unrelated profiles cannot upload',()=>{
 assert.equal(resumeDraftWritable({user_id:own,status:'pending',submitted_at:null},own),true);
 assert.equal(resumeDraftWritable({user_id:own,status:'pending',submitted_at:'2026-11-21T10:00:00Z'},own),false);
 assert.equal(resumeDraftWritable({user_id:own,status:'approved',submitted_at:null},own),false);
 assert.equal(resumeDraftWritable({user_id:own,status:'suspended',submitted_at:null},own),false);
 assert.equal(resumeDraftWritable({user_id:other,status:'pending',submitted_at:null},own),false);
 assert.equal(resumeDraftWritable(null,own),false);
});
test('service enforces authenticated owner, server capability, file magic, reservation and finalize',()=>{
 const s=readFileSync('src/services/teacherPrivateResume.ts','utf8');
 assert.match(s,/validateTeacherResume\(file\)/);
 assert.match(s,/signature\[0\]===37/); // %PDF-
 assert.match(s,/signature\[0\]===80&&signature\[1\]===75/); // PK ZIP header
 assert.match(s,/auth\.getUser\(\)/);
 assert.match(s,/teacher_v2_beta_capabilities/);
 assert.match(s,/resumes!==true/);
 assert.match(s,/teacher_v2_snapshot/);
 assert.match(s,/resumeDraftWritable\(profile,id\)/);
 assert.match(s,/teacher_v2_resume_reserve/);
 assert.match(s,/isOwnResumeReservation\(reservation,id\)/);
 assert.match(s,/upsert:false/);
 assert.match(s,/teacher_v2_resume_finalize/);
 assert.match(s,/if\(finalized!==true\)/);
 assert.doesNotMatch(s,/getPublicUrl|createSignedUrl|localStorage|sessionStorage|service_role/);
});
test('resume database proposal is default-deny, two-phase, server-owned, no client overwrites or public URLs',()=>{
 const sql=readFileSync('docs/proposed-migrations/teacher_v2_private_resume_storage_REVIEW_ONLY.sql','utf8');
 assert.match(sql,/REVIEW ONLY/);
 assert.match(sql,/private\.teacher_v2_feature_enabled\('resume_uploads'\)/);
 assert.match(sql,/status='pending' AND p\.submitted_at IS NULL/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/count\(\*\).*teacher_resume_documents|teacher_resume_documents[\s\S]*?>=5/);
 assert.match(sql,/v_path:=auth\.uid\(\)::text\|\|'\/\'\|\|v_id::text\|\|v_ext/);
 assert.match(sql,/d\.teacher_user_id=auth\.uid\(\)/);
 assert.match(sql,/d\.upload_state='reserved'/);
 assert.match(sql,/d\.upload_state='uploaded'/);
 assert.match(sql,/o\.owner_id=auth\.uid\(\)::text/);
 assert.match(sql,/v_object\.metadata/);
 assert.match(sql,/FOR INSERT TO authenticated/);
 assert.match(sql,/FOR SELECT TO authenticated/);
 assert.doesNotMatch(sql,/FOR UPDATE TO authenticated|FOR DELETE TO authenticated|GRANT ALL|public\s*=\s*true/i);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.teacher_v2_resume_reserve/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.teacher_v2_resume_finalize/);
});
test('registration upload requires both client and server flags plus editable draft',()=>{
 const editor=readFileSync('src/components/TeacherManagementV2.tsx','utf8');
 const input=readFileSync('src/components/TeacherPrivateResumeV2.tsx','utf8');
 assert.match(editor,/teacherResumeUiEnabled&&resumeServerEnabled&&registrationOpen&&snapshot\?\.status==='pending'&&snapshot\.submitted_at===null/);
 assert.match(input,/validateTeacherResume/);
 assert.match(input,/uploadOwnTeacherResume/);
 assert.doesNotMatch(input,/localStorage|sessionStorage|createSignedUrl|getPublicUrl/);
 const flag=readFileSync('src/lib/teacherBetaPolicy.ts','utf8');
 assert.match(flag,/core&&env\.VITE_TEACHER_RESUME_ENABLED==='true'/);
});
