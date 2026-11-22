/** Private teacher-photo contracts. No filename, user_id or path is accepted from a caller. */
export const TEACHER_PHOTO_BUCKET='teacher-profile-photos-private';
export const TEACHER_PHOTO_MIME='image/webp';
export const TEACHER_PHOTO_MAX_BYTES=3*1024*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type TeacherPhotoProfile={user_id:string;status:'pending'|'approved'|'rejected'|'suspended';submitted_at:string|null};
export function privateTeacherPhotoPath(authenticatedUserId:string){
 if(!uuid.test(authenticatedUserId))throw new Error('Authenticated teacher identity required.');
 return authenticatedUserId.toLowerCase()+'/profile.webp';
}
export function teacherPhotoWriteAllowed(profile:TeacherPhotoProfile|null,authenticatedUserId:string){
 return !!profile&&profile.user_id===authenticatedUserId&&profile.status==='pending'&&profile.submitted_at===null;
}
export function validatePrivatePhotoInput(file:{size:number;type:string}){
 return ['image/jpeg','image/png','image/webp'].includes(file.type)&&Number.isSafeInteger(file.size)
  &&file.size>0&&file.size<=TEACHER_PHOTO_MAX_BYTES;
}
