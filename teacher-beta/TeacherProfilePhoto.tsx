import React, {useRef, useState} from 'react';
import {Camera, ImagePlus, UserRound, X} from 'lucide-react';

/** Images are selected during registration and shown on the dashboard.
 * Browser-local visual preview only. No uploads, API calls, or persistence.
 * On real activation, verified private photo storage requires separate approval.
 */
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg','image/png','image/webp']);
export function validateTeacherPhoto(file:{type:string;size:number}):string|null {
  if(!PHOTO_TYPES.has(file.type))return 'Choose a JPG, PNG or WebP photograph.';
  if(!Number.isFinite(file.size)||file.size<=0||file.size>MAX_PHOTO_BYTES)return 'Photograph must be under 3 MB.';
  return null;
}

export function TeacherProfilePhoto({teacherName,photoUrl}:{teacherName:string;photoUrl:string|null}) {
  return <section aria-label="Teacher profile photograph" className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-center">
    <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-sky-900 text-white shadow-md">
      {photoUrl?<img src={photoUrl} alt={`${teacherName} teacher photo (local preview)`} className="h-full w-full object-cover"/>:<UserRound className="h-14 w-14" aria-hidden="true"/>}
    </div>
    <h3 className="mt-3 text-sm font-bold text-slate-900">Teacher Profile Photo</h3>
    <p className="mt-1 text-xs text-slate-600">{photoUrl?'Registration photo · browser-only preview':'No registration photo is saved yet'}</p>
  </section>;
}

export function TeacherPhotoPicker({
  teacherName,photoUrl,onPhotoSelected,onRemove,disabled=false,
}:{teacherName:string;photoUrl:string|null;onPhotoSelected:(file:File)=>void;onRemove:()=>void;disabled?:boolean}) {
  const camera=useRef<HTMLInputElement>(null), gallery=useRef<HTMLInputElement>(null);
  const [message,setMessage]=useState('Choose your profile photo during registration.');
  const choose=(event:React.ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    const error=validateTeacherPhoto(file);
    if(error){setMessage(error);return;}
    onPhotoSelected(file);
    setMessage('Photo selected for this preview; NOT uploaded or saved. It will appear on the Dashboard Demo.');
  };
  return <section aria-label="Registration profile photo" className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
    <p className="text-sm font-bold text-slate-900">Teacher Photograph / शिक्षक का फोटो</p>
    <p className="mt-1 text-xs text-slate-600">Take a photo or choose one from your gallery while registering.</p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-sky-900 text-white">
        {photoUrl?<img src={photoUrl} alt={`${teacherName} registration photo preview`} className="h-full w-full object-cover"/>:<UserRound className="h-10 w-10" aria-hidden="true"/>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled} onClick={()=>camera.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          <Camera className="h-4 w-4" aria-hidden="true"/>Take Photo
        </button>
        <button type="button" disabled={disabled} onClick={()=>gallery.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-sky-800 px-3 py-2 text-xs font-bold text-sky-900 disabled:cursor-not-allowed disabled:opacity-50">
          <ImagePlus className="h-4 w-4" aria-hidden="true"/>Choose Photo
        </button>
        {photoUrl&&<button type="button" disabled={disabled} onClick={()=>{onRemove();setMessage('Photo cleared from this preview.');}} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700">
          <X className="h-4 w-4" aria-hidden="true"/>Remove
        </button>}
      </div>
    </div>
    <input ref={camera} type="file" className="sr-only" aria-label="Capture teacher photograph" accept="image/jpeg,image/png,image/webp" capture="user" disabled={disabled} onChange={choose}/>
    <input ref={gallery} type="file" className="sr-only" aria-label="Select teacher photograph" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={choose}/>
    <p role="status" className="mt-3 text-xs text-slate-600">{disabled?'Private photo uploads require owner-approved backend activation.':message}</p>
    <p className="mt-1 text-[11px] text-amber-800">Visual preview only · No database/storage upload or teacher verification</p>
  </section>;
}
