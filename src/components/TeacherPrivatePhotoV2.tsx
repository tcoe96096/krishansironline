import React,{useEffect,useRef,useState} from 'react';
import {teacherPhotoUiEnabled} from '../lib/teacherBetaFlags';
import {uploadOwnTeacherPhoto,readOwnTeacherPhoto} from '../services/teacherPrivatePhoto';

/** Owner-only photo preview. No persistent browser storage or public URL. */
export function TeacherPrivatePhotoV2({canUpload=false}:{canUpload?:boolean}) {
 const input=useRef<HTMLInputElement>(null);
 const [photo,setPhoto]=useState<string|null>(null);
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
 useEffect(()=>{
  if(!teacherPhotoUiEnabled)return;
  let active=true,objectUrl:string|null=null;
  setPhoto(null);setStatus('');
  void readOwnTeacherPhoto().then(blob=>{
   if(active&&blob){objectUrl=URL.createObjectURL(blob);setPhoto(objectUrl);}
  }).catch(()=>{if(active)setStatus('Private profile photo is unavailable.');});
  return ()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[reload]);
 if(!teacherPhotoUiEnabled)return null;
 const upload=async(file:File|null)=>{
  if(!file||!canUpload||busy)return;
  setBusy(true);setStatus('Uploading private photo…');
  try{await uploadOwnTeacherPhoto(file);setStatus('Private photo saved.');setReload(n=>n+1);}
  catch(e){setStatus(e instanceof Error?e.message:'Private photo upload failed.');}
  finally{setBusy(false);}
 };
 return <section aria-label="Private teacher profile photo" className="rounded-2xl border border-sky-100 bg-white p-4">
  <h3 className="text-sm font-bold text-slate-900">My private registration photo</h3>
  <div className="mt-3 flex items-center gap-4">
   <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-950 text-white">
    {photo?<img src={photo} alt="My registered teacher photo" className="h-full w-full object-cover"/>:<span className="text-xs">No photo</span>}
   </div>
   <div className="space-y-2">
    {canUpload?<><button type="button" disabled={busy} className="rounded-lg bg-sky-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={()=>input.current?.click()}>Upload private photo</button>
     <input ref={input} aria-label="Upload registered teacher photo" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0]||null;e.target.value='';void upload(file);}}/>
     <p className="text-xs text-slate-600">JPG, PNG or WebP up to 3 MB. Image is converted to WebP without original metadata.</p></>:
     <p className="text-xs text-slate-600">To change this photo, use an editable registration draft. Approval is managed independently.</p>}
   </div>
  </div>
  {status&&<p className="mt-2 text-xs text-slate-700" role="status">{status}</p>}
  <p className="mt-2 text-[11px] text-slate-500">Stored in private authenticated Storage only. No public photo URL.</p>
 </section>;
}
