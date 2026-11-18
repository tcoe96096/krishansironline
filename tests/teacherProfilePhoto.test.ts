import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateTeacherPhoto} from '../teacher-beta/TeacherProfilePhoto';

test('registration photo accepts camera/gallery safe image types up to 3 MB',()=>{
 assert.equal(validateTeacherPhoto({type:'image/jpeg',size:1024}),null);
 assert.equal(validateTeacherPhoto({type:'image/png',size:3*1024*1024}),null);
 assert.equal(validateTeacherPhoto({type:'image/webp',size:24576}),null);
 for(const type of ['image/svg+xml','application/pdf','text/html','image/gif','']) {
  assert.match(validateTeacherPhoto({type,size:200})||'',/Choose a JPG/);
 }
 for(const size of [0,-1,3*1024*1024+1,Number.POSITIVE_INFINITY]){
  assert.match(validateTeacherPhoto({type:'image/jpeg',size})||'',/under 3 MB/);
 }
});

test('photo is selected in Registration and displayed in Dashboard without an upload',()=>{
 const portal=readFileSync('teacher-beta/main.tsx','utf8');
 const picker=readFileSync('teacher-beta/TeacherProfilePhoto.tsx','utf8');
 const registration=readFileSync('teacher-beta/TeacherRegistrationDesignPreview.tsx','utf8');
 const dashboard=readFileSync('teacher-beta/TeacherDashboardOverview.tsx','utf8');
 assert.match(portal,/<TeacherDashboardOverview/);
 assert.match(dashboard,/<TeacherProfilePhoto/);
 assert.match(registration,/<TeacherPhotoPicker/);
 assert.match(portal,/photoUrl=\{demo\?registrationPhotoUrl:null\}/);
 assert.match(portal,/URL\.createObjectURL\(file\)/);
 assert.match(portal,/URL\.revokeObjectURL\(registrationPhotoUrl\)/);
 assert.match(picker,/capture="user"/);
 assert.doesNotMatch(picker,/URL\.createObjectURL/);
 assert.doesNotMatch(picker,/URL\.revokeObjectURL/);
 assert.match(picker,/No database\/storage upload/);
 assert.match(picker,/disabled=\{disabled\}/);
 assert.match(picker,/onPhotoSelected\(file\)/);
 assert.doesNotMatch(dashboard,/<TeacherPhotoPicker/);
 assert.doesNotMatch(picker,/\.storage\.from\(|\.upload\(|localStorage\.setItem|sessionStorage\.setItem|fetch\(/);
 assert.doesNotMatch(readFileSync('src/components/StudentDashboard.tsx','utf8'),/TeacherProfilePhoto/);
});
