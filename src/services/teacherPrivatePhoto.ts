import {requireSupabase} from '../lib/supabase';
import {hasWebpContainerHeader} from '../lib/teacherPhotoContentValidation';
import {teacherCall,type TeacherSnapshot} from './teacherManagement';
import {isTeacherSnapshot} from '../lib/teacherSnapshotValidation';
import {TEACHER_PHOTO_BUCKET,TEACHER_PHOTO_MAX_BYTES,TEACHER_PHOTO_MIME,privateTeacherPhotoPath,teacherPhotoWriteAllowed,validatePrivatePhotoInput} from '../lib/teacherPhotoStoragePolicy';

/** Authenticated, private Storage only; never generate public URLs or persist blobs locally.
 * A second independent Storage RLS check must protect upload, overwrite and read.
 */
async function currentTeacher(forWrite:boolean){
 const supabase=requireSupabase();
 const {data,error}=await supabase.auth.getUser();
 const id=data.user?.id;
 if(error||!id)throw new Error('Teacher login required for private photographs.');
 const caps=await teacherCall<unknown>('teacher_v2_beta_capabilities');
 if(!caps||typeof caps!=='object'||(caps as {photos?:unknown}).photos!==true)
   throw new Error('Teacher private photos are not enabled by the server.');
 const profile=await teacherCall<unknown>('teacher_v2_snapshot',{p_user_id:id});
 if(!isTeacherSnapshot(profile)||profile.user_id!==id)
   throw new Error('Verified teacher profile required for photographs.');
 if(forWrite&&!teacherPhotoWriteAllowed(profile as TeacherSnapshot,id))
   throw new Error('Save an editable registration draft before uploading a photograph.');
 return {supabase,path:privateTeacherPhotoPath(id)};
}
async function normalizedWebp(file:File):Promise<Blob>{
 if(!validatePrivatePhotoInput(file))throw new Error('Choose a JPG, PNG or WebP photo up to 3 MB.');
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file);}catch{throw new Error('The selected file is not a readable photograph.');}
 try{
  if(bitmap.width<1||bitmap.height<1||bitmap.width*bitmap.height>16000000)
    throw new Error('Photo dimensions are not supported.');
  const scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));
  canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Photo processing is unavailable in this browser.');
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Photo conversion failed.')),TEACHER_PHOTO_MIME,0.85));
  if(blob.type!==TEACHER_PHOTO_MIME||blob.size<1||blob.size>TEACHER_PHOTO_MAX_BYTES)
    throw new Error('Converted photograph is not a valid WebP under 3 MB.');
  return blob; // Re-encoding strips source EXIF and ignores original filenames.
 }finally{bitmap.close();}
}
export async function uploadOwnTeacherPhoto(file:File){
 const {supabase,path}=await currentTeacher(true);
 const image=await normalizedWebp(file);
 const {error}=await supabase.storage.from(TEACHER_PHOTO_BUCKET).upload(path,image,{
  contentType:TEACHER_PHOTO_MIME,cacheControl:'0',upsert:true
 });
 if(error)throw new Error('Private photo upload was denied or unavailable.');
}
export async function readOwnTeacherPhoto():Promise<Blob|null>{
 const {supabase,path}=await currentTeacher(false);
 const {data,error}=await supabase.storage.from(TEACHER_PHOTO_BUCKET).download(path);
 if(error){
  // Only a documented missing-object status is treated as an empty profile.
  const code=String((error as {statusCode?:string|number;status?:number}).statusCode??(error as {status?:number}).status??'');
  if(code==='404')return null;
  throw new Error('Private photo read was denied or unavailable.');
 }
 if(!data||!['image/webp','application/octet-stream'].includes(data.type)||data.size<12||data.size>TEACHER_PHOTO_MAX_BYTES)
   throw new Error('Invalid private photo response.');
 if(!hasWebpContainerHeader(new Uint8Array(await data.slice(0,12).arrayBuffer())))
   throw new Error('Private photo contents are not a valid WebP container.');
 return data;
}
