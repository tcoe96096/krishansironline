import {normalizeTeacherAssignments,validateTeacherProfile,validateTeacherQualifications,type TeacherProfileInput,type TeacherQualificationInput,type TeacherAssignmentInput} from '../lib/teacherManagementValidation';
export type TeacherRpc = (name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:{code?:string}|null}>;
export function createTeacherClient(rpc:TeacherRpc){
 const call=async<T>(name:string,args:Record<string,unknown>={}):Promise<T>=>{
  const {data,error}=await rpc(name,args);
  if(error?.code==='40001')throw new Error('Your profile changed. Refresh before saving again.');
  if(error)throw new Error(error.code==='PGRST202'?'Teacher v2 backend awaits owner-approved activation.':'Teacher operation denied or unavailable. Refresh and check your access.');
  return data as T;
 };
 const save=async(profile:TeacherProfileInput,qualifications:TeacherQualificationInput[],scopes:TeacherAssignmentInput[],reason:string,submit:boolean,expectedRevision:number|null=null)=>{
  if(!validateTeacherProfile(profile)||!validateTeacherQualifications(qualifications))throw new Error('Check profile and qualification fields.');
  if(expectedRevision!==null&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<1))throw new Error('Invalid profile revision.');
  if(typeof reason!=='string'||reason.trim().length>1000||/[\x00-\x1f\x7f-\x9f\p{Cf}]/u.test(reason))throw new Error('Invalid application reason.');
  const assignments=normalizeTeacherAssignments(scopes);
  if(submit&&assignments.length===0)throw new Error('Choose at least one teaching scope before submitting.');
  const revision=await call<number>('teacher_v2_save_application',{p_profile:profile,p_qualifications:qualifications,p_scopes:assignments,p_reason:reason.trim(),p_submit:submit,p_expected_revision:expectedRevision});
  if(!Number.isSafeInteger(revision)||revision<1)throw new Error('Profile persistence was not confirmed by the server.');
  return revision;
 };
 return {call,save};
}
