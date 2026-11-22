import type {TeacherSnapshot} from '../services/teacherManagement';

// Validate untrusted RPC JSON before either teacher or admin views dereference it.
// This is display-side contract checking; the database remains authoritative for access.
const object = (value:unknown):value is Record<string,unknown> =>
  value!==null&&typeof value==='object'&&!Array.isArray(value);
const text = (value:unknown):value is string => typeof value==='string';
const nullableText = (value:unknown):boolean => value===null||text(value);

export function isTeacherSnapshot(value:unknown):value is TeacherSnapshot {
  if(!object(value))return false;
  if(!text(value.user_id)||!text(value.display_name)||!text(value.status)||
     !['pending','approved','rejected','suspended'].includes(value.status)||
     !nullableText(value.employee_id)||!nullableText(value.contact_email)||
     !nullableText(value.phone)||!nullableText(value.submitted_at)||!nullableText(value.reviewed_at)||
     !nullableText(value.application_reason)||!nullableText(value.decision_reason)||
     !Number.isSafeInteger(value.revision)||Number(value.revision)<1||
     !(value.experience_years===null||(Number.isInteger(value.experience_years)&&
       Number(value.experience_years)>=0&&Number(value.experience_years)<=70)))return false;
  if(!Array.isArray(value.requested_scopes)||!value.requested_scopes.every(scope=>
     object(scope)&&text(scope.classLevel)&&text(scope.subject)&&text(scope.workType)))return false;
  if(!Array.isArray(value.qualifications)||!value.qualifications.every(q=>
     object(q)&&text(q.title)&&text(q.institution)&&Number.isInteger(q.year)))return false;
  if(!Array.isArray(value.assignments)||!value.assignments.every(a=>
     object(a)&&text(a.id)&&text(a.class_level)&&text(a.subject)&&
     text(a.work_type)&&text(a.status)))return false;
  if(!Array.isArray(value.resumes)||!value.resumes.every(r=>
     object(r)&&text(r.id)&&text(r.original_filename)&&text(r.verification_status)))return false;
  return true;
}

/** Client-side identity guard; database RLS must independently enforce ownership. */
export function isOwnTeacherSnapshot(value:unknown,authenticatedUserId:string):value is TeacherSnapshot {
  return typeof authenticatedUserId==='string'&&authenticatedUserId.length>0&&
    isTeacherSnapshot(value)&&value.user_id===authenticatedUserId;
}
