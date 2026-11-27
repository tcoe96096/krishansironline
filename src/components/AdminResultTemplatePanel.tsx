import React, {useEffect,useState,useRef} from 'react';
import {useAuth} from '../context/AuthContext';
import {canPublishResultTemplate,getPublishedResultTemplate,publishResultTemplate,type ResultTemplateTheme,type ResultTemplateOptions} from '../services/resultTemplateService';

export function AdminResultTemplatePanel(){
  const {user}=useAuth();
  const owner=useRef(user?.id); owner.current=user?.id;
  const [allowed,setAllowed]=useState(false);
  const [readyOwner,setReadyOwner]=useState<string>();
  const [status,setStatus]=useState('Checking template permissions…');
  const [theme,setTheme]=useState<ResultTemplateTheme>('modern');
  const [options,setOptions]=useState<ResultTemplateOptions>({brandTitle:'KRISHAN SIR ONLINE LEARNING'});
  const [version,setVersion]=useState<number|null>(null);
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let alive=true;
    setAllowed(false);setReadyOwner(undefined);setVersion(null);setReason('');setBusy(false);
    setTheme('modern');setOptions({brandTitle:'KRISHAN SIR ONLINE LEARNING'});
    setStatus('Checking template permissions…');
    if(!user?.id)return;
    void (async()=>{
      try {
        const ok=await canPublishResultTemplate();
        if(!alive)return;
        if(!ok){setStatus('Template publication is limited to authorized Super Admins.');return;}
        const current=await getPublishedResultTemplate();
        if(!alive)return;
        if(current){setTheme(current.theme);setOptions(current.options);setVersion(current.version);}
        setAllowed(true);setReadyOwner(user.id);setStatus('');
      } catch {if(alive)setStatus('Template backend is not available. Existing results remain unchanged.');}
    })();
    return()=>{alive=false;};
  },[user?.id]);
  const save=async()=>{
    if(!allowed||!user||readyOwner!==user.id||busy||reason.trim().length<12)return;
    const actor=user.id;
    if(!confirm('Publish the shared report card design? This does not publish student results.'))return;
    setBusy(true);setStatus('');
    try{
      const next=await publishResultTemplate(theme,options,reason);
      if(owner.current!==actor)return;
      setVersion(next);setReason('');setStatus('Template published. Version '+next+'. No student results were sent.');
    }catch{if(owner.current===actor)setStatus('Publication was not confirmed. Refresh to check the current version before retrying.');}
    finally{if(owner.current===actor)setBusy(false);}
  };
  const field=(key:'brandTitle'|'tagline'|'footerNote',label:string,maxLength:number)=><label className="block text-xs font-semibold text-slate-700">{label}<input className="mt-1 block w-full rounded-lg border p-2 text-sm" value={options[key]??''} maxLength={maxLength} disabled={busy} onChange={e=>setOptions(prev=>({...prev,[key]:e.target.value}))}/></label>;
  return <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
    <h3 className="font-bold text-slate-900">Report Card Template</h3>
    <p className="text-xs text-slate-600">Shared design only. Individual approved result PDFs and student publication are separate.</p>
    {status&&<p role="status" className="text-sm text-slate-600">{status}</p>}
    {allowed&&readyOwner===user?.id&&<><div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3"><label className="block text-xs font-semibold">Theme<select value={theme} disabled={busy} onChange={e=>setTheme(e.target.value as ResultTemplateTheme)} className="mt-1 block w-full rounded-lg border p-2"><option value="modern">Modern</option><option value="classic">Classic</option><option value="minimal">Minimal</option></select></label>
      {field('brandTitle','Institution heading',80)}{field('tagline','Tagline',110)}{field('footerNote','Footer note',180)}
      <label className="block text-xs font-semibold">Reason for publication (12–1000 characters)<textarea className="mt-1 block w-full rounded-lg border p-2" value={reason} maxLength={1000} disabled={busy} onChange={e=>setReason(e.target.value)}/></label>
      </div><div aria-label="Design sample with no student data" className={'rounded-xl border p-5 text-center '+(theme==='modern'?'border-sky-700 bg-sky-50':theme==='classic'?'border-amber-800 bg-amber-50':'border-slate-300 bg-white')}>
      <p className="text-xs uppercase tracking-wider">Design sample · No student data</p><h4 className="mt-3 text-xl font-bold">{options.brandTitle||'KRISHAN SIR ONLINE LEARNING'}</h4><p className="text-xs">{options.tagline}</p><p className="my-8 border-y py-5 font-semibold">REPORT CARD</p><p className="text-xs">{options.footerNote}</p></div>
      </div><div className="flex flex-wrap items-center gap-3"><button type="button" disabled={busy||reason.trim().length<12} onClick={()=>void save()} className="rounded-xl bg-sky-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy?'Publishing…':'Publish Design'}</button><span className="text-xs text-slate-500">Published version: {version??'Not yet published'}</span></div></>}
  </section>;
}
