import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');

test('existing KSOL website owns Teacher Registration, Login and Dashboard routes',()=>{
 const app=read('src/App.tsx');
 for(const fragment of ["'/teacher': 'teacher'","'/teacher-registration': 'teacherRegistration'","'/teacher-login': 'teacherLogin'","'/teacher-dashboard': 'teacherDashboard'","<TeacherSiteWorkspace section={activePage"]){
  assert.ok(app.includes(fragment),'Missing integrated website route '+fragment);
 }
 assert.match(app,/showTeacherPreview=\{false\}/);
});

test('header navigates within the same site without old broken Teacher Demo links',()=>{
 const header=read('src/components/Header.tsx');
 assert.match(header,/handleNavClick\('teacher'\)/);
 assert.match(header,/Teacher Management/);
 assert.doesNotMatch(header,/teacher-v2-preview\/|Teacher Demo/);
});

test('Admin Staff and Permissions mounts server-verified Teacher directory',()=>{
 const admin=read('src/components/AdminDashboard.tsx');
 assert.match(admin,/active === 'staff'/);
 assert.match(admin,/AdminTeacherDirectoryV2 demoMode=\{demoMode\}/);
 assert.match(admin,/teacherBetaEnabled \?/);
 const directory=read('src/components/AdminTeacherDirectoryV2.tsx');
 assert.match(directory,/teacherCall<boolean>\('is_super_admin'\)/);
 assert.match(directory,/teacher_v2_record_identity_verification/);
});

test('Teacher Site auth and registration remain fail-closed until beta activation',()=>{
 const portal=read('src/components/TeacherSiteWorkspace.tsx');
 assert.match(portal,/teacherBetaEnabled/);
 assert.match(portal,/!active&&<p role="status"/);
 assert.match(portal,/active&&!loading&&user\?<TeacherManagementV2/);
 assert.match(portal,/active&&!loading&&user\?<div className="space-y-5"><TeacherDashboardData/);
 assert.match(portal,/signInWithOAuth/);
 assert.match(portal,/teacherCallback\(target\)/);
 assert.doesNotMatch(portal,/service_role|teacher_v2_review\(|localStorage/);
});

test('direct GitHub Pages website URLs are generated for all integrated Teacher pages',()=>{
 const vite=read('vite.config.ts');
 for(const slug of ['teacher','teacher-registration','teacher-login','teacher-dashboard']){
  assert.ok(vite.includes("slug: '"+slug+"'"),"Missing direct-load page "+slug);
 }
 assert.match(vite,/\['admin', 'teacher-login', 'teacher-dashboard', 'teacher-registration'\]\.includes\(page.slug\)/);
});
