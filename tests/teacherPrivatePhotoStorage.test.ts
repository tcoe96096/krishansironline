import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {privateTeacherPhotoPath,teacherPhotoWriteAllowed,validatePrivatePhotoInput,TEACHER_PHOTO_BUCKET,TEACHER_PHOTO_MAX_BYTES} from '../src/lib/teacherPhotoStoragePolicy';

const own='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const draft={user_id:own,status:'pending' as const,submitted_at:null};

test('path is derived from authenticated UUID and never from a user supplied filename',()=>{
 assert.equal(privateTeacherPhotoPath(own),own+'/profile.webp');
 assert.equal(TEACHER_PHOTO_BUCKET,'teacher-profile-photos-private');
 for(const bad of ['',other+'/../../../private','../../other','invalid','..','a'.repeat(40)]){
  assert.throws(()=>privateTeacherPhotoPath(bad),/Authenticated teacher identity required/);
 }
});
test('only owner with unsent pending draft can replace a private photograph',()=>{
 assert.equal(teacherPhotoWriteAllowed(draft,own),true);
 assert.equal(teacherPhotoWriteAllowed(draft,other),false);
 assert.equal(teacherPhotoWriteAllowed({...draft,status:'approved'},own),false);
 assert.equal(teacherPhotoWriteAllowed({...draft,status:'suspended'},own),false);
 assert.equal(teacherPhotoWriteAllowed({...draft,status:'pending',submitted_at:'2026-11-21T10:00:00Z'},own),false);
 assert.equal(teacherPhotoWriteAllowed(null,own),false);
});
test('MIME and bytes constraints exclude SVG, PDF, oversized and empty uploads',()=>{
 for(const type of ['image/jpeg','image/png','image/webp'])assert.equal(validatePrivatePhotoInput({type,size:TEACHER_PHOTO_MAX_BYTES}),true);
 for(const type of ['image/svg+xml','image/gif','application/pdf','text/html',''])assert.equal(validatePrivatePhotoInput({type,size:300}),false);
 for(const size of [0,-1,0.5,1.5,TEACHER_PHOTO_MAX_BYTES+0.5,TEACHER_PHOTO_MAX_BYTES+1,Infinity,NaN,Number.MAX_SAFE_INTEGER+1])assert.equal(validatePrivatePhotoInput({type:'image/png',size}),false);
});
test('private media service requires fresh auth, server capability and owner verified profile before Storage',()=>{
 const service=readFileSync('src/services/teacherPrivatePhoto.ts','utf8');
 assert.match(service,/supabase\.auth\.getUser\(\)/);
 assert.match(service,/teacher_v2_beta_capabilities/);
 assert.match(service,/photos!==true/);
 assert.match(service,/teacher_v2_snapshot/);
 assert.match(service,/isTeacherSnapshot/);
 assert.match(service,/teacherPhotoWriteAllowed/);
 assert.match(service,/privateTeacherPhotoPath\(id\)/);
 assert.match(service,/createImageBitmap/);
 assert.match(service,/toBlob/);
 assert.match(service,/contentType:TEACHER_PHOTO_MIME/);
 assert.match(service,/upsert:true/);
 // A successful Storage response must never accept an empty or oversized photo blob.
 assert.match(service,/data\.size<1\|\|data\.size>TEACHER_PHOTO_MAX_BYTES/);
 assert.doesNotMatch(service,/getPublicUrl|createSignedUrl|service_role|localStorage|sessionStorage|\.remove\(/);
});
test('proposal is private, owner-derived, defaults off and grants no cross-user media access',()=>{
 const sql=readFileSync('docs/proposed-migrations/teacher_v2_private_photo_storage_REVIEW_ONLY.sql','utf8');
 assert.match(sql,/REVIEW ONLY/);
 assert.match(sql,/private_teacher_photo_allowed|private_photo_allowed/);
 assert.match(sql,/profile_photos/);
 assert.match(sql,/p_name=\(auth\.uid\(\)::text\|\|\'\/profile\.webp\'\)/);
 assert.match(sql,/p\.user_id=auth\.uid\(\)/);
 assert.match(sql,/p\.status='pending' AND p\.submitted_at IS NULL/);
 assert.match(sql,/public IS DISTINCT FROM false/);
 assert.match(sql,/file_size_limit IS DISTINCT FROM 3145728/);
 assert.match(sql,/allowed_mime_types IS DISTINCT FROM ARRAY\['image\/webp'\]/);
 assert.match(sql,/FOR SELECT TO authenticated/);
 assert.match(sql,/FOR INSERT TO authenticated/);
 assert.match(sql,/FOR UPDATE TO authenticated/);
 assert.match(sql,/WITH CHECK\(bucket_id='teacher-profile-photos-private'/);
 assert.doesNotMatch(sql,/FOR (?:SELECT|INSERT|UPDATE|DELETE) TO anon|GRANT ALL|public\s*=\s*true/i);
});
test('photo UI only exists behind explicit opt-in and server registration evidence',()=>{
 const form=readFileSync('src/components/TeacherManagementV2.tsx','utf8');
 const dashboard=readFileSync('teacher-beta/TeacherDashboardOverview.tsx','utf8');
 const component=readFileSync('src/components/TeacherPrivatePhotoV2.tsx','utf8');
 assert.match(form,/teacherPhotoUiEnabled&&photoServerEnabled&&snapshot/);
 assert.match(form,/snapshot\.status==='pending'&&snapshot\.submitted_at===null/);
 assert.match(dashboard,/!preview&&teacherPhotoUiEnabled/);
 assert.match(component,/readOwnTeacherPhoto/);
 assert.match(component,/uploadOwnTeacherPhoto/);
 assert.match(component,/URL\.revokeObjectURL\(objectUrl\)/);
 assert.doesNotMatch(component,/localStorage|sessionStorage|getPublicUrl|createSignedUrl/);
});
