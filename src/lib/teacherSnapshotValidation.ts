import type {TeacherSnapshot} from '../services/teacherManagement';
import {TEACHER_CLASSES,TEACHER_SUBJECTS,TEACHER_WORK_TYPES,isValidTeacherEmployeeId} from './teacherManagementValidation';

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
     !nullableText(value.employee_id)||
     (value.employee_id!==null&&(!isValidTeacherEmployeeId(value.employee_id as string)||!['approved','suspended'].includes(value.status)))||
     !nullableText(value.contact_email)||
     !nullableText(value.phone)||!nullableText(value.submitted_at)||!nullableText(value.reviewed_at)||
     !nullableText(value.application_reason)||!nullableText(value.decision_reason)||
     !Number.isSafeInteger(value.revision)||Number(value.revision)<1||
     !(value.experience_years===null||(Number.isInteger(value.experience_years)&&
       Number(value.experience_years)>=0&&Number(value.experience_years)<=70)))return false;
  if(!Array.isArray(value.requested_scopes)||value.requested_scopes.length>60||!value.requested_scopes.every(scope=>
     object(scope)&&TEACHER_CLASSES.some(x=>x===scope.classLevel)&&
     TEACHER_SUBJECTS.some(x=>x===scope.subject)&&TEACHER_WORK_TYPES.some(x=>x===scope.workType)))return false;
  if(!Array.isArray(value.qualifications)||value.qualifications.length>20||!value.qualifications.every(q=>
     object(q)&&text(q.title)&&text(q.institution)&&Number.isInteger(q.year)&&
     Number(q.year)>=1950&&Number(q.year)<=new Date().getUTCFullYear()))return false;
  if(!Array.isArray(value.assignments)||!value.assignments.every(a=>
     object(a)&&text(a.id)&&TEACHER_CLASSES.some(x=>x===a.class_level)&&
     TEACHER_SUBJECTS.some(x=>x===a.subject)&&TEACHER_WORK_TYPES.some(x=>x===a.work_type)&&
     (a.status==='active'||a.status==='revoked')))return false;
  if(!Array.isArray(value.resumes)||!value.resumes.every(r=>
     object(r)&&text(r.id)&&text(r.original_filename)&&
     ['pending','verified','rejected'].some(x=>x===r.verification_status)))return false;
  return true;
}

/** Client-side identity guard; database RLS must independently enforce ownership. */
export function isOwnTeacherSnapshot(value:unknown,authenticatedUserId:string):value is TeacherSnapshot {
  return typeof authenticatedUserId==='string'&&authenticatedUserId.length>0&&
    isTeacherSnapshot(value)&&value.user_id===authenticatedUserId;
}
