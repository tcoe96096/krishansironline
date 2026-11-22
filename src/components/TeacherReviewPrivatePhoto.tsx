import React,{useEffect,useState} from 'react';
import {requireSupabase} from '../lib/supabase';
import {TEACHER_PHOTO_BUCKET,TEACHER_PHOTO_MAX_BYTES} from '../lib/teacherPhotoStoragePolicy';
import {teacherPhotoUiEnabled} from '../lib/teacherBetaFlags';

/** Read a private photo only during explicit Super Admin teacher review.
 * Authorization is enforced in storage.objects RLS by public.is_super_admin().
 * No signed/public links, browser persistence, or unrestricted photo listing.
 */
export function TeacherReviewPrivatePhoto({teacherUserId}:{teacherUserId:string}){
 const [url,setUrl]=useState<string|null>(null);
 const [state,setState]=useState('Loading verified teacher photo…');
 useEffect(()=>{
  if(!teacherPhotoUiEnabled)return;
  let active=true;let objectUrl:string|null=null;
  setUrl(null);setState('Loading verified teacher photo…');
  void requireSupabase().storage.from(TEACHER_PHOTO_BUCKET)
   .download(teacherUserId+'/profile.webp')
   .then(({data,error})=>{
    if(!active)return;
    if(error||!data){setState('Private photo not available for this teacher.');return;}
    if(!['image/webp','application/octet-stream'].includes(data.type)||data.size<1||data.size>TEACHER_PHOTO_MAX_BYTES){
     setState('Invalid private teacher photograph.');return;
    }
    objectUrl=URL.createObjectURL(data);
    setUrl(objectUrl);setState('');
   })
   .catch(()=>{if(active)setState('Private photo could not be loaded.');});
  return ()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[teacherUserId]);
 if(!teacherPhotoUiEnabled)return null;
 return <section aria-label="Private teacher photo for administrator review" className="rounded-xl border border-sky-100 bg-white p-4">
  <h4 className="text-sm font-bold text-slate-900">Private registered photograph</h4>
  <div className="mt-3 flex items-center gap-3">
   <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
    {url?<img alt="Teacher registered photograph" src={url} className="h-full w-full object-cover"/>:<span className="text-[11px] text-slate-500">Not available</span>}
   </div>
   <p role="status" className="text-xs leading-5 text-slate-600">{state||'Photo supplied by applicant; verify identity independently. The photograph is not proof of approval.'}</p>
  </div>
 </section>;
}
