import { requireSupabase } from '../lib/supabase';
import { normalizeTeacherAssignments, validateTeacherProfile, validateTeacherQualifications, type TeacherProfileInput, type TeacherQualificationInput, type TeacherAssignmentInput } from '../lib/teacherManagementValidation';
export type TeacherSnapshot = {
  user_id:string;employee_id:string|null;display_name:string;contact_email:string|null;phone:string|null;
  experience_years:number|null;status:'pending'|'approved'|'rejected'|'suspended';revision:number;submitted_at:string|null;
  application_reason:string|null;requested_scopes:TeacherAssignmentInput[];qualifications:TeacherQualificationInput[];
  assignments:{id:string;class_level:string;subject:string;work_type:string;status:string}[];
  resumes:{id:string;original_filename:string;verification_status:string}[];
};
// No localStorage persistence of personal data and no inferred permissions.
export async function teacherCall<T>(name:string,args:Record<string,unknown>={}):Promise<T>{
 const {data,error}=await requireSupabase().rpc(name,args);
 if(error)throw new Error(error.code==='PGRST202'?'Teacher v2 backend awaits owner-approved activation.':'Teacher operation denied or unavailable. Refresh and check your access.');
 return data as T;
}
export async function saveTeacherApplication(profile:TeacherProfileInput,qualifications:TeacherQualificationInput[],scopes:TeacherAssignmentInput[],reason:string,submit:boolean){
 if(!validateTeacherProfile(profile)||!validateTeacherQualifications(qualifications))throw new Error('Check profile and qualification fields.');
 const assignments=normalizeTeacherAssignments(scopes);
 if(submit&&(assignments.length===0||reason.trim().length<12||reason.trim().length>1000))throw new Error('Choose work scopes and enter a reason of 12–1000 characters.');
 return teacherCall<number>('teacher_v2_save_application',{p_profile:profile,p_qualifications:qualifications,p_scopes:assignments,p_reason:reason.trim(),p_submit:submit});
}

export const teacherResumeEnabled = import.meta.env.VITE_TEACHER_RESUME_ENABLED==='true';
export async function uploadTeacherResume(file:File,revision:number){
 const {validateTeacherResume}=await import('../lib/teacherManagementValidation');
 if(!teacherResumeEnabled||!validateTeacherResume(file))throw new Error('Private resume upload is unavailable or file is invalid.');
 const body=new FormData();body.append('file',file);body.append('revision',String(revision));
 const {data,error}=await requireSupabase().functions.invoke('teacher-resume',{body});
 if(error||!data?.documentId)throw new Error('Resume verification failed. No attachment confirmed.');
 return data.documentId as string;
}
export async function downloadTeacherResume(documentId:string){
 if(!teacherResumeEnabled)throw new Error('Private resume download awaits activation.');
 const {data,error}=await requireSupabase().functions.invoke('teacher-resume',{body:{documentId}});
 if(error||!(data instanceof Blob))throw new Error('Private document access denied.');
 const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download='teacher-resume';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
