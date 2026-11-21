import React,{useRef,useState} from 'react';
import {teacherResumeUiEnabled} from '../lib/teacherBetaFlags';
import {uploadOwnTeacherResume} from '../services/teacherPrivateResume';
import {validateTeacherResume} from '../lib/teacherResumePolicy';

/** Owner registration upload only. No local document persistence or public link. */
export function TeacherPrivateResumeV2({onUploaded}:{onUploaded:()=>void}){
 const fileInput=useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
 if(!teacherResumeUiEnabled)return null;
 async function upload(file:File|null){
  if(!file||busy)return;
  const problem=validateTeacherResume(file);
  if(problem){setStatus(problem);return;}
  setBusy(true);setStatus('Uploading private resume for server verification…');
  try{
   await uploadOwnTeacherResume(file);
   setStatus('Resume uploaded. Document security review is still required.');
   onUploaded();
  }catch(e){setStatus(e instanceof Error?e.message:'Resume upload was not confirmed.');}
  finally{setBusy(false);}
 }
 return <section aria-label="Private teacher resume upload" className="rounded-2xl border border-slate-200 bg-sky-50 p-4">
   <h3 className="text-sm font-bold text-slate-900">Upload Resume / Biodata</h3>
   <p className="mt-1 text-xs text-slate-700">PDF or DOCX only, up to 5 MB. Available after saving an editable registration draft.</p>
   <button type="button" disabled={busy} onClick={()=>fileInput.current?.click()}
    className="mt-3 rounded-lg bg-sky-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
    Select and upload private resume
   </button>
   <input ref={fileInput} aria-label="Select private teacher resume" type="file" className="sr-only"
    disabled={busy} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    onChange={e=>{const file=e.target.files?.[0]??null;e.target.value='';void upload(file);}}/>
   {status&&<p role="status" className="mt-2 text-xs text-slate-700">{status}</p>}
   <p className="mt-2 text-[11px] text-slate-600">Stored privately; no public link or automatic approval. The server must confirm the upload, then a separate security scan is required before document review.</p>
 </section>;
}
