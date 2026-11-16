import {createTeacherClient} from './teacherManagementClient';
import { requireSupabase } from '../lib/supabase';
import { validateTeacherResume, type TeacherProfileInput, type TeacherQualificationInput, type TeacherAssignmentInput } from '../lib/teacherManagementValidation';
export type TeacherSnapshot = {
  user_id:string;employee_id:string|null;display_name:string;contact_email:string|null;phone:string|null;
  experience_years:number|null;status:'pending'|'approved'|'rejected'|'suspended';revision:number;submitted_at:string|null;
  application_reason:string|null;decision_reason:string|null;reviewed_at:string|null;requested_scopes:TeacherAssignmentInput[];qualifications:TeacherQualificationInput[];
  assignments:{id:string;class_level:string;subject:string;work_type:string;status:string}[];
  resumes:{id:string;original_filename:string;verification_status:string}[];
};
// No localStorage persistence of personal data and no inferred permissions.
const api=createTeacherClient((name,args)=>requireSupabase().rpc(name,args));
export const teacherCall=api.call;
export const saveTeacherApplication=api.save;

export const teacherResumeEnabled = import.meta.env.VITE_TEACHER_RESUME_ENABLED==='true';
export async function uploadTeacherResume(file:File,revision:number){
 if(!teacherResumeEnabled||!validateTeacherResume(file))throw new Error('Private resume upload is unavailable or file is invalid.');
 const body=new FormData();body.append('file',file);body.append('revision',String(revision));
 const {data,error}=await requireSupabase().functions.invoke('teacher-resume',{body});
 if(error||!data?.documentId)throw new Error('Resume verification failed. No attachment confirmed.');
 return data.documentId as string;
}
export async function downloadTeacherResume(documentId:string,originalFilename:string){
 if(!teacherResumeEnabled)throw new Error('Private resume download awaits activation.');
 const {data,error}=await requireSupabase().functions.invoke('teacher-resume',{body:{documentId}});
 if(error||!(data instanceof Blob))throw new Error('Private document access denied.');
 const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=/[.]docx$/i.test(originalFilename)?'teacher-resume.docx':'teacher-resume.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
