import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Layers3,PlayCircle,RefreshCw,ClipboardList} from 'lucide-react';
import {requireSupabase} from '../lib/supabase';
import {getMyTestAttempts,getPublishedTests,type TestAttempt,type PublishedTest} from '../services/testService';
const safeText=(value:unknown):string=>typeof value==='string'?value:'';
type Series={id:string;title:{hi?:string;en?:string};description:{hi?:string;en?:string};class_level:string;subject:string;test_ids:string[];updated_at:string};
export const StudentMockTestSeries:React.FC<{classLevel?:string}> = ({classLevel})=>{
 const [rows,setRows]=useState<Series[]>([]),[attempts,setAttempts]=useState<TestAttempt[]>([]),[tests,setTests]=useState<PublishedTest[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 // A class switch, refresh or unmount invalidates older asynchronous responses.
 const requestId=useRef(0);
 // Keep previous-class attempts and catalogue out of render until the new class loads.
 const [loadedClass,setLoadedClass]=useState<string|undefined>(undefined);
 const load=useCallback(async()=>{
  const current=++requestId.current;
  if(!classLevel){setRows([]);setAttempts([]);setTests([]);setError('');setLoading(false);return;}
  setLoading(true);setError('');setLoadedClass(undefined);setRows([]);setAttempts([]);setTests([]);
  try{
   const [seriesResult,history,publishedTests]=await Promise.all([requireSupabase().from('mock_test_series').select('id,title,description,class_level,subject,test_ids,updated_at').eq('class_level',classLevel).eq('is_published',true).order('updated_at',{ascending:false}),getMyTestAttempts(),getPublishedTests(classLevel)]);
   if(current!==requestId.current)return;
   if(seriesResult.error)throw seriesResult.error;
   const seenSeriesIds=new Set<string>();
   // A malformed successful API payload must not crash the dashboard or expose stale class data.
   const safeSeries=Array.isArray(seriesResult.data)?seriesResult.data:[];
   setRows((safeSeries as Series[]).filter(series=>{
    if(!series||series.class_level!==classLevel||typeof series.id!=='string'||!series.id.trim())return false;
    const id=series.id.trim();
    if(seenSeriesIds.has(id))return false;
    seenSeriesIds.add(id);
    return true;
   }));setAttempts(Array.isArray(history)?history:[]);setTests(Array.isArray(publishedTests)?publishedTests:[]);setLoadedClass(classLevel);
  }catch(e){if(current===requestId.current){setRows([]);setAttempts([]);setTests([]);setLoadedClass(classLevel);setError('Mock Test Series अभी लोड नहीं हो सकीं। कृपया दोबारा प्रयास करें। / Could not load mock test series. Please retry.');}}
  finally{if(current===requestId.current)setLoading(false);}
 },[classLevel]);
 useEffect(()=>{void load();return()=>{requestId.current++;};},[load]);
 // Hide previous-class rows synchronously during render, before the class-change effect runs.
 const classPending=Boolean(classLevel)&&loadedClass!==classLevel;
 const visibleRows=!classPending?rows.filter(series=>series.class_level===classLevel):[];
 return <section aria-busy={loading||classPending} className="space-y-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-800"><Layers3 className="h-5 w-5"/></span><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700">PRACTICE PATHWAYS</p><h3 className="text-sm font-extrabold text-slate-900">Mock Test Series</h3><p className="text-[10px] text-slate-500">आपकी कक्षा के लिए चुनी गई अभ्यास श्रृंखलाएँ</p></div></div><button type="button" onClick={()=>void load()} disabled={loading} aria-label="Mock Test Series फिर लोड करें" title="Refresh Mock Test Series" className="rounded-lg border border-slate-200 bg-white p-2"><RefreshCw className="h-4 w-4"/></button></div>
 {!classPending&&error&&<p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
 {loading||classPending?<p role="status" aria-live="polite" className="py-4 text-xs text-slate-500">Series लोड हो रही हैं… / Loading series…</p>:error?<p className="rounded-xl border border-rose-100 bg-white p-4 text-xs text-slate-600">सूची उपलब्ध नहीं है। Refresh से दोबारा प्रयास करें। / List unavailable. Use Refresh to retry.</p>:!classLevel?<p className="rounded-xl border border-dashed border-indigo-200 bg-white p-4 text-xs text-slate-500">Mock Test Series देखने के लिए पहले अपनी कक्षा चुनें। / Select your class to view series.</p>:visibleRows.length===0?<p className="rounded-xl border border-dashed border-indigo-200 bg-white p-4 text-xs text-slate-500">अभी आपकी कक्षा के लिए कोई Mock Test Series प्रकाशित नहीं हुई है। / No series published for your class yet.</p>:<div className="grid gap-3 md:grid-cols-2">{visibleRows.map(s=>{
 // Fail closed if a malformed catalogue response includes another class or an invalid test ID.
 const testById=new Map(tests.filter(test=>test&&test.class_level===classLevel&&typeof test.id==='string'&&test.id.trim()!=='').map(test=>[test.id,test]));
 // Treat malformed or legacy series payloads as empty rather than crashing the student dashboard.
 const uniqueSeriesIds=[...new Set((Array.isArray(s.test_ids)?s.test_ids:[]).filter((id):id is string=>typeof id==='string').map(id=>id.trim()).filter(Boolean))];
 const availableIds=uniqueSeriesIds.filter(id=>testById.has(id));
 const availableSet=new Set(availableIds);
 const doneIds=new Set(attempts.filter(a=>a&&a.status==='submitted'&&availableSet.has(a.test_id)).map(a=>a.test_id));
 // Expired in-progress rows are not resumable; the server remains authoritative on launch.
 const now=Date.now();
 const activeIds=new Set(attempts.filter(a=>a&&a.status==='in_progress'&&availableSet.has(a.test_id)&&Number.isFinite(Date.parse(a.expires_at))&&Date.parse(a.expires_at)>now).map(a=>a.test_id));
 const activeId=availableIds.find(id=>activeIds.has(id)&&!doneIds.has(id));
 const nextId=availableIds.find(id=>!doneIds.has(id))||availableIds[0];
 const nextActive=Boolean(activeId);
 const launchId=activeId||nextId;
 const percent=availableIds.length?Math.round(doneIds.size/availableIds.length*100):0;
 const nextLabel=(id:string)=>{const test=testById.get(id);return safeText(test?.title?.hi)||safeText(test?.title?.en)||'प्रकाशित टेस्ट विवरण उपलब्ध नहीं';};
 return <article key={s.id} className="rounded-xl border border-indigo-100 bg-white p-3">
 <p className="text-sm font-extrabold text-slate-900">{safeText(s.title?.hi)||safeText(s.title?.en)||'Mock Test Series'}</p>
 <p className="mt-1 text-xs text-slate-500">{safeText(s.description?.hi)||safeText(s.description?.en)||safeText(s.subject)}</p>
 <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500"><span className="flex items-center gap-2"><ClipboardList className="h-3.5 w-3.5"/>{doneIds.size}/{availableIds.length} उपलब्ध Tests पूर्ण · {safeText(s.subject)}</span><strong className="text-indigo-700">{percent}%</strong></div>
 <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" role="progressbar" aria-label="श्रृंखला प्रगति / Series completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${doneIds.size} / ${availableIds.length} उपलब्ध टेस्ट पूर्ण / available tests completed`} style={{width:percent+'%'}}/></div>
 <ol className="mt-3 space-y-1">{availableIds.map((id,i)=><li key={id} className="flex items-center justify-between gap-2 text-[10px]"><span className="min-w-0 truncate text-slate-600">{i+1}. {nextLabel(id)}</span><span className={doneIds.has(id)?'font-bold text-emerald-700':activeIds.has(id)?'font-bold text-amber-700':'text-slate-400'}>{doneIds.has(id)?'पूर्ण / Completed':activeIds.has(id)?'जारी / In progress':'बाकी / Pending'}</span></li>)}</ol>
 {availableIds.length===0?<p className="mt-3 rounded-lg bg-slate-100 px-3 py-2.5 text-center text-xs font-semibold text-slate-600">अभी इस Series में कोई उपलब्ध टेस्ट नहीं है। / No available tests in this series.</p>:<a href={import.meta.env.BASE_URL+'online-tests/?testId='+encodeURIComponent(launchId||'')} aria-label={`टेस्ट खोलें / Open test: ${nextLabel(launchId!)}`} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-700 px-3 py-2.5 text-xs font-bold text-white"><PlayCircle className="h-4 w-4"/>{doneIds.size===availableIds.length?'टेस्ट फिर खोलें / Open test again':nextActive?'जारी टेस्ट खोलें / Resume test':'अगला टेस्ट चुनें / Open next test'}{activeId?' · '+nextLabel(activeId):nextId?' · '+nextLabel(nextId):''}</a>}</article>;
})}</div>}
 <p className="text-[10px] text-slate-400">प्रगति आपके सुरक्षित Test Attempts से निकाली जाती है। सूची में प्रकाशित टेस्ट के वास्तविक शीर्षक दिखते हैं। Series क्रम अभ्यास के लिए है; अभी अगले टेस्ट पर तकनीकी लॉक लागू नहीं है। टेस्ट शुरू करने और attempt limit लागू करने का काम मौजूदा सुरक्षित Test Engine करता है।</p></section>
};