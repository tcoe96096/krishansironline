/** Private Teacher v2 resumes: no public URLs and no browser-generated object keys. */
export const TEACHER_RESUME_BUCKET='teacher-resumes-private';
export const TEACHER_RESUME_MAX_BYTES=5*1024*1024;
export const DOCX_MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const PDF_MIME='application/pdf';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type TeacherResumeCandidate={name:string;type:string;size:number};
export type TeacherResumeReservation={document_id:string;storage_path:string};

/** Extension, declared type and length are early UX checks; server and scanner
 * must still examine actual document bytes before trusting a resume. */
export function validateTeacherResume(file:TeacherResumeCandidate):string|null{
 const name=file.name.trim();
 if(name.length<5||name.length>180||name.includes('/')||name.includes('\\')||name.includes('..')||/[\u0000-\u001f\u007f]/.test(name))
   return 'Choose a named PDF or DOCX document (up to 180 characters).';
 const expected=name.toLowerCase().endsWith('.pdf')?PDF_MIME:
  name.toLowerCase().endsWith('.docx')?DOCX_MIME:null;
 if(!expected||file.type!==expected)return 'Only matching PDF or DOCX files are allowed.';
 if(!Number.isSafeInteger(file.size)||file.size<1||file.size>TEACHER_RESUME_MAX_BYTES)
   return 'Resume must be between 1 byte and 5 MB.';
 return null;
}
export function isOwnResumeReservation(value:unknown,userId:string,expectedMime:string):value is TeacherResumeReservation{
 if(!value||typeof value!=='object'||!uuid.test(userId))return false;
 const r=value as Record<string,unknown>;
 if(typeof r.document_id!=='string'||!uuid.test(r.document_id)||typeof r.storage_path!=='string')return false;
 const key=r.storage_path;
 const extension=expectedMime===PDF_MIME?'.pdf':expectedMime===DOCX_MIME?'.docx':null;
 return extension!==null&&key===userId.toLowerCase()+'/'+r.document_id.toLowerCase()+extension;
}
export function resumeDraftWritable(profile:{user_id:string;status:string;submitted_at:string|null}|null,id:string){
 return !!profile&&profile.user_id===id&&profile.status==='pending'&&profile.submitted_at===null;
}
