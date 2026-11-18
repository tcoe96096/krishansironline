import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {teacherPageFromPath,teacherPagePath} from '../teacher-beta/teacherRoutes';

const base='/krishansironline-preview-unified/teacher-beta/';
test('separate public pages have distinct deep-linkable GitHub Pages paths',()=>{
 const pairs=[
  ['welcome',''],
  ['register','registration/'],
  ['login','login/'],
  ['dashboard','dashboard/'],
  ['admin','admin/'],
 ] as const;
 for(const [page,suffix] of pairs){
   const url=teacherPagePath(page,base);
   assert.equal(url,base+suffix);
   assert.equal(teacherPageFromPath(url,base),page);
 }
 assert.equal(teacherPageFromPath(base+'staff-workspace/',base),'register','existing OAuth callback remains valid');
 assert.equal(teacherPageFromPath('/random/','/teacher-beta/'),'welcome');
});
test('do not allow arbitrary external URL destinations for preview navigation',()=>{
 for(const untrusted of ['//attacker.test/','https://attacker.test/','/teacher-beta/?redirect=https://attacker.test','/teacher-beta/\\evil/']){
  assert.throws(()=>teacherPagePath('login',untrusted),/Invalid teacher preview base/);
 }
});
test('registration, login and dashboard are independent JSX screens and photo stays in dashboard',()=>{
 const main=readFileSync('teacher-beta/main.tsx','utf8');
 const registration=readFileSync('teacher-beta/TeacherRegistrationDesignPreview.tsx','utf8');
 const dashboard=readFileSync('teacher-beta/TeacherDashboardOverview.tsx','utf8');
 const config=readFileSync('vite.teacher-beta.config.ts','utf8');
 assert.match(main,/page==='register'/);
 assert.match(main,/page==='login'/);
 assert.match(main,/page==='dashboard'/);
 assert.match(main,/page==='admin'/);
 assert.match(main,/<TeacherRegistrationDesignPreview\/>/);
 assert.match(main,/<TeacherDashboardOverview/);
 assert.match(main,/Login required for Teacher Dashboard/);
 assert.match(main,/const demo=!teacherBetaEnabled/);
 assert.match(main,/Teacher Google Login/);
 assert.match(registration,/Resume \/ बायोडाटा/);
 assert.doesNotMatch(registration,/Application reason|Reason for applying|Application Tracking|Super Admin Verification/);
 assert.match(dashboard,/<TeacherProfilePhoto/);
 assert.match(dashboard,/No saved applications/);
 assert.match(config,/'registration','login','dashboard'/);
 assert.doesNotMatch(dashboard,/teacher_v2_save_application|\.rpc\(|signInWithOAuth/);
});
