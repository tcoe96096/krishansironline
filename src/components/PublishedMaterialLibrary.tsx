import React, {useEffect,useMemo,useState} from 'react';
import {BookOpen, ExternalLink, RefreshCw} from 'lucide-react';
import {requireSupabase} from '../lib/supabase';

type Item={id:string;class_level:string;subject:string;title:string;description:string;kind:string;resource_url:string|null};
export const PublishedMaterialLibrary:React.FC<{classLevel:string;subject:string;english:boolean}> = ({classLevel,subject,english})=>{
  const [materials,setMaterials]=useState<Item[]>([]);
  const [reload,setReload]=useState(0);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{
    let mounted=true;
    setLoading(true);
    void (async()=>{
      try{
        const result=await requireSupabase().from('study_material_items')
          .select('id,class_level,subject,title,description,kind,resource_url')
          .eq('status','published').order('updated_at',{ascending:false}).limit(200);
        if(!mounted)return;
        if(result.error){setMaterials([]);return;}
        setMaterials((result.data||[]) as Item[]);
      }catch{if(mounted)setMaterials([]);}
      finally{if(mounted)setLoading(false);}
    })();
    return()=>{mounted=false;};
  },[reload]);
  const filtered=useMemo(()=>materials.filter(item=>item.class_level===classLevel && (subject==='all'||item.subject===subject)),[materials,classLevel,subject]);
  if(!filtered.length)return null;
  return <section aria-label={english?'Published resources':'प्रकाशित संसाधन'} className="mb-8 rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="flex items-center gap-2 text-base font-extrabold text-sky-950"><BookOpen size={19}/>{english?'Additional Published Resources':'अतिरिक्त प्रकाशित अध्ययन सामग्री'}</h3>
        <p className="mt-1 text-xs text-slate-600">{english?'Super Admin approved resources matched to this class and subject.':'Super Admin से स्वीकृत कक्षा एवं विषय के संसाधन।'}</p></div>
      <button disabled={loading} onClick={()=>setReload(n=>n+1)} className="inline-flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-2 text-xs font-bold text-sky-900 disabled:opacity-50"><RefreshCw size={14}/>{english?'Refresh':'रिफ्रेश'}</button>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {filtered.map(item=><article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-semibold text-teal-800">Class {item.class_level} · {item.subject} · {item.kind.toUpperCase()}</p>
        <h4 className="mt-1 text-sm font-bold text-slate-900">{item.title}</h4>
        {item.description&&<p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-600">{item.description}</p>}
        {item.resource_url?.startsWith('https://')&&<a href={item.resource_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800"><ExternalLink size={14}/>{english?'Open resource':'संसाधन खोलें'}</a>}
      </article>)}
    </div>
  </section>;
};
