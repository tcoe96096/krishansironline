import {createTeacherClient} from './teacherManagementClient';
import { requireSupabase } from '../lib/supabase';
import { type TeacherProfileInput, type TeacherQualificationInput, type TeacherAssignmentInput } from '../lib/teacherManagementValidation';
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
