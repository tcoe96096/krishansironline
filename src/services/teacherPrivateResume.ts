import {requireSupabase} from '../lib/supabase';
import {teacherCall} from './teacherManagement';
import {isTeacherSnapshot} from '../lib/teacherSnapshotValidation';
import {TEACHER_RESUME_BUCKET,isOwnResumeReservation,resumeDraftWritable,validateTeacherResume} from '../lib/teacherResumePolicy';
import {validateTeacherResumeContent} from '../lib/teacherResumeContentPreflight';

/** Store private teacher resumes only in an authenticated server-reserved key.
 * Client flags are UX only; server RPC and Storage RLS are authoritative.
 * A successful Storage response is NOT an accepted resume until finalize returns true.
 */
export async function uploadOwnTeacherResume(file:File):Promise<void>{
 const validation=validateTeacherResume(file);
 if(validation)throw new Error(validation);
 // Browser-side container preflight rejects obvious malformed and spoofed
 // documents BEFORE creating a server reservation. This is NOT a malware scan.
 // A separate independently operated scanner must still inspect stored bytes
 // before any reviewer opens a PDF/DOCX; uploads remain quarantined meanwhile.
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!validateTeacherResumeContent(bytes,file.type))
  throw new Error('Document contents do not match the selected PDF/DOCX type.');
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
 if(!isOwnResumeReservation(reservation,id,file.type))
  throw new Error('Server did not return a valid owner-specific resume reservation.');
 const {error:uploadError}=await supabase.storage.from(TEACHER_RESUME_BUCKET)
  .upload(reservation.storage_path,file,{contentType:file.type,upsert:false,cacheControl:'0'});
 if(uploadError)throw new Error('Private resume upload was denied. The reservation was not finalized.');
 const finalized=await teacherCall<unknown>('teacher_v2_resume_finalize',{
  p_document_id:reservation.document_id
 });
 if(finalized!==true)throw new Error('Resume uploaded but server verification did not complete; contact an administrator.');
}
