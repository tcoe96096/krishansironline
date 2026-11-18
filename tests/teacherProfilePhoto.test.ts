import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateTeacherPhoto} from '../teacher-beta/TeacherProfilePhoto';

test('teacher dashboard photo accepts camera/gallery safe image types up to 3 MB',()=>{
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

test('photograph appears only in Teacher Workspace and remains a local non-uploaded preview',()=>{
 const portal=readFileSync('teacher-beta/main.tsx','utf8');
 const picker=readFileSync('teacher-beta/TeacherProfilePhoto.tsx','utf8');
 const dashboard=readFileSync('teacher-beta/TeacherDashboardOverview.tsx','utf8');
 assert.match(portal,/<TeacherDashboardOverview/);
 assert.match(dashboard,/<TeacherProfilePhoto/);
 assert.match(picker,/capture="user"/);
 assert.match(picker,/URL\.createObjectURL/);
 assert.match(picker,/URL\.revokeObjectURL/);
 assert.match(picker,/No database\/storage upload/);
 assert.doesNotMatch(picker,/\.storage\.from\(|\.upload\(|localStorage\.setItem|sessionStorage\.setItem|fetch\(/);
 assert.doesNotMatch(readFileSync('src/components/StudentDashboard.tsx','utf8'),/TeacherProfilePhoto/);
});
