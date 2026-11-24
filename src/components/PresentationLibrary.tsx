import React,{useEffect,useState} from 'react';
import {Presentation as PresentationIcon, Play, Download, X, ChevronLeft, ChevronRight} from 'lucide-react';
import {downloadPresentation,fetchSlide,listPresentations,presentationError,type Presentation} from '../services/presentationService';

export function PresentationViewer({item,onClose,en=true,admin=false}:{item:Presentation;onClose:()=>void;en?:boolean;admin?:boolean}) {
  const [index,setIndex]=useState(1),[url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{
    let cancelled=false, objectUrl='';
    setUrl('');setError('');
    void fetchSlide(item.id,index).then(blob=>{if(!cancelled){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}}).catch(e=>{if(!cancelled)setError(presentationError(e));});
    return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[item.id,index]);
  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='ArrowLeft')setIndex(i=>Math.max(1,i-1));if(e.key==='ArrowRight')setIndex(i=>Math.min(item.slide_count,i+1));};
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[item.slide_count,onClose]);
  const download=async()=>{setBusy(true);try{await downloadPresentation(item);}catch(e){setError(presentationError(e));}finally{setBusy(false);}};
  return <div role="dialog" aria-modal="true" aria-label={item.title} className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white">
    <header className="flex items-center justify-between gap-3 bg-slate-900 p-3"><h3 className="min-w-0 truncate font-bold">{item.title}</h3><div className="flex items-center gap-2">{(admin||item.allow_download)&&<button type="button" disabled={busy} onClick={()=>void download()} aria-label={en?'Download PPT':'PPT डाउनलोड'} className="rounded-lg bg-slate-700 p-2"><Download size={20}/></button>}<button type="button" autoFocus onClick={onClose} aria-label={en?'Close player':'बंद करें'} className="rounded-lg bg-slate-700 p-2"><X size={20}/></button></div></header>
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2">
      {url?<img className="max-h-full max-w-full object-contain" src={url} alt={(en?'Slide ':'स्लाइड ')+index} draggable={false}/>:<p role="status" className="p-4 text-center">{error||(en?'Loading slide…':'स्लाइड खुल रही है…')}</p>}
    </div>
    {error&&url&&<p role="alert" className="p-2 text-center text-red-200">{error}</p>}
    <footer className="flex items-center justify-center gap-6 bg-slate-900 p-3">
      <button type="button" disabled={index===1} onClick={()=>setIndex(i=>i-1)} aria-label={en?'Previous slide':'पिछली स्लाइड'} className="rounded-lg bg-slate-700 p-2 disabled:opacity-30"><ChevronLeft/></button>
      <span aria-live="polite">{index} / {item.slide_count}</span>
      <button type="button" disabled={index===item.slide_count} onClick={()=>setIndex(i=>i+1)} aria-label={en?'Next slide':'अगली स्लाइड'} className="rounded-lg bg-slate-700 p-2 disabled:opacity-30"><ChevronRight/></button>
    </footer>
  </div>;
}

export function PresentationLibrary({classLevel,subject,search,language}:{classLevel:string;subject:string;search:string;language:string}) {
  const en=language==='en';
  const [items,setItems]=useState<Presentation[]>([]),[active,setActive]=useState<Presentation|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{let cancelled=false;void listPresentations().then(data=>{if(!cancelled)setItems(data);}).catch(()=>{if(!cancelled)setError(en?'Presentations are currently unavailable.':'प्रस्तुतियाँ अभी उपलब्ध नहीं हैं।');}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[en]);
  const filtered=items.filter(p=>p.class_level===classLevel&&(subject==='all'||p.subject===subject)&&(!search.trim()||(p.title+' '+p.chapter).toLowerCase().includes(search.trim().toLowerCase())));
  if(!filtered.length&&!loading&&!error)return null;
  return <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-6">
    <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><PresentationIcon size={22}/>{en?'PowerPoint Learning Zone':'पावरपॉइंट अध्ययन अनुभाग'}</h3>
    {loading&&<p role="status" className="mt-2 text-sm">{en?'Loading presentations…':'प्रस्तुतियाँ लोड हो रही हैं…'}</p>}
    {error&&<p role="status" className="mt-2 text-sm text-slate-600">{error}</p>}
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(p=><article key={p.id} className="rounded-xl border bg-white p-4">
      <p className="text-xs font-semibold text-sky-800">{p.subject} · {p.chapter}</p><h4 className="mt-2 font-bold text-slate-900">{p.title}</h4><p className="mt-1 text-xs text-slate-500">{p.slide_count} {en?'slides':'स्लाइड'}</p>
      <button type="button" onClick={()=>setActive(p)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-sky-900 p-2.5 text-sm font-bold text-white"><Play size={16}/>{en?'Play PPT':'PPT चलाएँ'}</button>
    </article>)}</div>
    {active&&<PresentationViewer key={active.id} item={active} en={en} onClose={()=>setActive(null)}/>}
  </section>;
}
