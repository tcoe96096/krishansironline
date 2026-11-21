import {requireSupabase} from '../lib/supabase';
import {teacherCall} from './teacherManagement';
import {isTeacherSnapshot} from '../lib/teacherSnapshotValidation';
import {TEACHER_RESUME_BUCKET,DOCX_MIME,PDF_MIME,
 isOwnResumeReservation,resumeDraftWritable,validateTeacherResume} from '../lib/teacherResumePolicy';

/** Store private teacher resumes only in an authenticated server-reserved key.
 * Client flags are UX only; server RPC and Storage RLS are authoritative.
 * A successful Storage response is NOT an accepted resume until finalize returns true.
 */
export async function uploadOwnTeacherResume(file:File):Promise<void>{
 const validation=validateTeacherResume(file);
 if(validation)throw new Error(validation);
 // Fast signature check is not a malware or full file-format scan. Server must
 // quarantine and inspect actual bytes before any reviewer opens a document.
 const signature=new Uint8Array(await file.slice(0,8).arrayBuffer());
 const valid=file.type===PDF_MIME?
  signature.length>=5&&signature[0]===37&&signature[1]===80&&signature[2]===68&&signature[3]===70&&signature[4]===45:
  file.type===DOCX_MIME&&signature.length>=4&&signature[0]===80&&signature[1]===75&&signature[2]===3&&signature[3]===4;
 if(!valid)throw new Error('Document contents do not match the selected PDF/DOCX type.');
 const supabase=requireSupabase();
 const {data,error}=await supabase.auth.getUser();
 const id=data.user?.id;
 if(error||!id)throw new Error('Sign in before uploading your resume.');
 const caps=await teacherCall<unknown>('teacher_v2_beta_capabilities');
 if(!caps||typeof caps!=='object'||(caps as {resumes?:unknown}).resumes!==true||
    (caps as {registration?:unknown}).registration!==true)
  throw new Error('Private resume uploads are not enabled by the server.');
 const profile=await teacherCall<unknown>('teacher_v2_snapshot',{p_user_id:id});
 if(!isTeacherSnapshot(profile)||!resumeDraftWritable(profile,id))
  throw new Error('Save an editable Teacher Registration draft before uploading.');
 const reservation=await teacherCall<unknown>('teacher_v2_resume_reserve',{
  p_filename:file.name,p_content_type:file.type,p_size_bytes:file.size
 });
 if(!isOwnResumeReservation(reservation,id))
  throw new Error('Server did not return a valid owner-specific resume reservation.');
 const {error:uploadError}=await supabase.storage.from(TEACHER_RESUME_BUCKET)
  .upload(reservation.storage_path,file,{contentType:file.type,upsert:false,cacheControl:'0'});
 if(uploadError)throw new Error('Private resume upload was denied. The reservation was not finalized.');
 const finalized=await teacherCall<unknown>('teacher_v2_resume_finalize',{
  p_document_id:reservation.document_id
 });
 if(finalized!==true)throw new Error('Resume uploaded but server verification did not complete; contact an administrator.');
}
