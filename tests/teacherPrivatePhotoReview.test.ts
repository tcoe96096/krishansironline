import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');

test('Teacher Dashboard shows photo only when server-gated UI feature is enabled',()=>{
 const dashboard=read('teacher-beta/TeacherDashboardData.tsx');
 assert.match(dashboard,/teacherPhotoUiEnabled&&<TeacherPrivatePhotoV2 canUpload=\{false\}\/>/);
 const privatePhoto=read('src/services/teacherPrivatePhoto.ts');
 assert.match(privatePhoto,/teacher_v2_beta_capabilities/);
 assert.match(privatePhoto,/teacher_v2_snapshot/);
 assert.match(privatePhoto,/privateTeacherPhotoPath\(id\)/);
 assert.doesNotMatch(privatePhoto,/getPublicUrl|createSignedUrl|localStorage/);
});

test('Teacher admin reviews photo privately through trusted RLS, not public links',()=>{
 const admin=read('src/components/AdminTeacherDirectoryV2.tsx');
 const review=read('src/components/TeacherReviewPrivatePhoto.tsx');
 const sql=read('docs/proposed-migrations/teacher_v2_private_photo_admin_review_REVIEW_ONLY.sql');
 assert.match(admin,/teacherPhotoUiEnabled&&<TeacherReviewPrivatePhoto teacherUserId=\{p.user_id\}\/>/);
 assert.match(review,/\.download\(teacherUserId\+'\/profile.webp'\)/);
 assert.match(review,/URL\.revokeObjectURL/);
 assert.doesNotMatch(review,/createSignedUrl|getPublicUrl|list\(/);
 assert.match(sql,/CREATE POLICY teacher_v2_photo_super_admin_review/);
 assert.match(sql,/private\.teacher_v2_superadmin_photo_read_allowed\(\)/);
 assert.match(sql,/public\.is_super_admin\(\)/);
 assert.match(sql,/private\.teacher_v2_feature_enabled\('profile_photos'\)/);
 assert.doesNotMatch(sql,/FOR UPDATE TO authenticated|FOR DELETE TO authenticated/);
});

test('Resume intake is never automatically a verified document',()=>{
 const service=read('src/services/teacherPrivateResume.ts');
 const sql=read('docs/proposed-migrations/teacher_v2_private_resume_storage_REVIEW_ONLY.sql');
 assert.match(service,/teacher_v2_resume_reserve/);
 assert.match(service,/teacher_v2_resume_finalize/);
 assert.match(sql,/upload_state='reserved'/);
 assert.match(sql,/verification_status/);
 assert.doesNotMatch(sql,/CREATE POLICY .+ FOR DELETE/);
});
