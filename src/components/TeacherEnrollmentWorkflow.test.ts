import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const app=source('./TeacherEnrollmentApplication.tsx');
const review=source('./AdminTeacherEnrollmentReview.tsx');
const workspace=source('./StaffLearningWorkspace.tsx');
const admin=source('./AdminStaffPermissions.tsx');
const sql=source('../../docs/proposed-migrations/teacher_enrollment_requests_review_only.sql');

test('teacher login request stays separate from staff role assignment',()=>{
  for(const anchor of [
    'Request Teacher Enrollment','submit_teacher_enrollment','withdraw_teacher_enrollment',
    "application?.status==='pending'","application?.status==='approved'",
    'Google sign-in identifies your account', // contained in Staff workspace, not request
  ]) assert.ok((app+workspace).includes(anchor),anchor);
  assert.ok(workspace.includes('<TeacherEnrollmentApplication/>'));
  assert.ok(!app.includes("from('result_staff_grants').insert("));
  assert.ok(!app.includes("from('user_roles').insert("));
});

test('admin review actions require validated Super Admin, reason and confirmation',()=>{
  for(const anchor of [
    'AdminTeacherEnrollmentReview','review_teacher_enrollment','is_super_admin',
    "verification was not granted","Super Admin verification was not granted.",
    'window.confirm(', 'Approve Teacher','Reject Request'
  ]) assert.ok((review+admin).includes(anchor),anchor);
  assert.ok(review.includes("p_request_id:request.id"));
  assert.ok(review.includes("p_reason:justification"));
  assert.ok(review.includes("p_action:decision"));
  assert.ok(admin.includes('<AdminTeacherEnrollmentReview demoMode={demoMode}/>'));
});

test('SQL backend grants minimal class-scoped materials rights and never allows self-approval',()=>{
  assert.ok(sql.includes('-- REVIEW ONLY'));
  assert.ok(sql.startsWith('-- ACTIVATION UPDATE'));
  for(const anchor of [
    'security definer',"set search_path=''",
    "p_action not in ('approve','reject')",
    'public.is_super_admin()',
    'for update',
    "array['materials.read','materials.draft.write','materials.review.propose']",
    'v_request.requested_class',
    'grant execute on function public.submit_teacher_enrollment',
    'to authenticated;',
    'result_staff_grants',
    'teacher_enrollment_audit',
    'raise exception',
  ]) assert.ok(sql.includes(anchor),anchor);
  assert.equal(/grant\s+(insert|update|delete)\s+on\s+public\.teacher_enrollment_requests\s+to\s+authenticated/i.test(sql),false);
});

test('draft SQL is not an applied production migration',()=>{
  const workflow=source('../../.github/workflows/result-system-unit-tests.yml');
  assert.ok(workflow.includes('TeacherEnrollmentWorkflow.test.ts'));
  assert.ok(sql.includes('NOT executed'));
});

test('public account buttons navigate to the correct workspace instead of reopening login',()=>{
  const header=source('./Header.tsx');
  assert.ok(header.includes("const accountDestination = isAdmin ? 'admin' : isStudentAccount ? 'studentDashboard' : 'staffWorkspace'"));
  assert.ok(header.includes("if (user) handleNavClick(accountDestination); else onOpenAuth();"));
  assert.ok(header.includes('Open account workspace'));
  assert.ok(header.includes('Teacher / Staff Account'));
  assert.ok(header.includes('{isStudentAccount && <button role="menuitem"'));
  assert.ok(header.includes('profile?.user_id === user.id'));
});
