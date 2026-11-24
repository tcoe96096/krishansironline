import React,{useEffect,useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {PPT_CLASSES,PPT_SUBJECTS,archivePresentation,downloadPresentation,listPresentations,presentationError,updatePresentation,uploadPresentation,type Presentation,type PresentationDetails} from '../services/presentationService';
import {PresentationViewer} from './PresentationLibrary';

const blank:PresentationDetails={class_level:'10',subject:'History',chapter:'',title:''};
const input='w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';
const btn='rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50';
export function AdminStudyPresentations({demoMode=false}:{demoMode?:boolean}){
  const {isAdmin,adminLoading,user}=useAuth();
  const [items,setItems]=useState<Presentation[]>([]),[details,setDetails]=useState(blank),[file,setFile]=useState<File|null>(null),[fileKey,setFileKey]=useState(0),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[preview,setPreview]=useState<Presentation|null>(null),[editing,setEditing]=useState<string|null>(null);
  const enabled=!!user&&isAdmin&&!adminLoading&&!demoMode;
  const refresh=async()=>{setItems(await listPresentations(true));};
  useEffect(()=>{if(!enabled){setItems([]);return;}let cancelled=false;const load=()=>void listPresentations(true).then(x=>{if(!cancelled)setItems(x);}).catch(e=>{if(!cancelled)setError(presentationError(e));});load();const timer=window.setInterval(load,15000);return()=>{cancelled=true;window.clearInterval(timer);};},[enabled,user?.id]);
  const run=async(action:()=>Promise<void>,message:string)=>{if(!enabled||busy)return;setBusy(true);setError('');setNotice('');try{await action();setNotice(message);await refresh();}catch(e){setError(presentationError(e));}finally{setBusy(false);}};
  const reset=()=>{setEditing(null);setDetails(blank);setFile(null);setFileKey(x=>x+1);};
  const save=()=>void run(async()=>{if(editing){await updatePresentation(editing,details);}else{if(!file)throw new Error('PPTX file required.');await uploadPresentation(details,file);}reset();},editing?'Details saved.':'PPT uploaded privately; slide conversion queued.');
  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <div><p className="text-xs font-bold text-sky-800">STUDY MATERIAL MANAGEMENT</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">PPT Upload &amp; Publishing</h2><p className="mt-2 text-sm text-slate-600">कक्षा, विषय और अध्याय चुनें। PPT अपलोड करें, स्लाइड तैयार होने पर Preview देखकर Publish करें। Download डिफॉल्ट में बंद है।</p></div>
    {!enabled?<p role="status" className="rounded-lg bg-slate-100 p-3 text-sm">Authorized Admin access required. Demo mode cannot upload or publish.</p>:<>
    <form onSubmit={e=>{e.preventDefault();save();}} className="grid gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Class<select className={input} value={details.class_level} onChange={e=>setDetails(d=>({...d,class_level:e.target.value}))}>{PPT_CLASSES.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="text-sm font-semibold">Subject<select className={input} value={details.subject} onChange={e=>setDetails(d=>({...d,subject:e.target.value}))}>{PPT_SUBJECTS.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="text-sm font-semibold">Chapter<input className={input} required maxLength={150} value={details.chapter} onChange={e=>setDetails(d=>({...d,chapter:e.target.value}))}/></label>
      <label className="text-sm font-semibold">Presentation title<input className={input} required maxLength={200} value={details.title} onChange={e=>setDetails(d=>({...d,title:e.target.value}))}/></label>
      {!editing&&<label className="text-sm font-semibold sm:col-span-2">PPTX file (max 50 MB)<input key={fileKey} type="file" accept=".pptx" required onChange={e=>setFile(e.target.files?.[0]||null)} className={input}/></label>}
      <div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={busy} className="rounded-lg bg-sky-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy?'Working…':editing?'Save changes':'Upload PPT'}</button>{editing&&<button type="button" className={btn} disabled={busy} onClick={reset}>Cancel</button>}</div>
    </form>
    {notice&&<p role="status" className="text-sm text-emerald-800">{notice}</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex items-center justify-between"><h3 className="font-bold">Uploaded presentations ({items.length})</h3><button type="button" className={btn} disabled={busy} onClick={()=>void run(async()=>{},'Refreshed.')}>Refresh</button></div>
    {items.map(p=><article key={p.id} className="space-y-3 rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2"><div><h4 className="font-bold">{p.title}</h4><p className="text-xs text-slate-600">Class {p.class_level} · {p.subject} · {p.chapter}</p></div><span className="text-xs font-bold">{p.status} · {p.published?'Published':'Draft'}{p.slide_count>0?' · '+p.slide_count+' slides':''}</span></div>
      {p.status==='queued'&&<p className="text-xs text-slate-500">Waiting for the configured conversion worker. Refresh automatically every 15 seconds.</p>}
      {p.status==='error'&&<p className="text-xs text-red-700">Conversion failed. Retry or upload a corrected PPT.</p>}
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={p.allow_download} disabled={busy} onChange={e=>{const value=e.target.checked;void run(()=>updatePresentation(p.id,{allow_download:value}),value?'Public download enabled.':'Public download disabled.');}}/>Allow public/student download</label>
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={busy||p.status!=='ready'} onClick={()=>setPreview(p)}>Preview</button>
        <button className={btn} disabled={busy||p.status!=='ready'} onClick={()=>void run(()=>updatePresentation(p.id,{published:!p.published}),p.published?'Unpublished.':'Published.')}>{p.published?'Unpublish':'Publish'}</button>
        <button className={btn} disabled={busy} onClick={()=>void run(()=>downloadPresentation(p),'Download requested.')}>Admin download</button>
        <button className={btn} disabled={busy} onClick={()=>{setEditing(p.id);setDetails({class_level:p.class_level,subject:p.subject,chapter:p.chapter,title:p.title});}}>Edit</button>
        {p.status==='error'&&<button className={btn} disabled={busy} onClick={()=>void run(()=>updatePresentation(p.id,{status:'queued'}),'Queued again.')}>Retry conversion</button>}
        <button className={btn+' text-red-700'} disabled={busy||p.status==='queued'||p.status==='processing'} onClick={()=>{if(window.confirm('Delete this presentation and its files?'))void run(()=>archivePresentation(p),'Deleted.');}}>Delete</button>
      </div></article>)}
    </>}
    {preview&&enabled&&<PresentationViewer item={preview} admin onClose={()=>setPreview(null)}/>}
  </section>;
}
