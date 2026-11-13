import React,{useCallback,useEffect,useState} from 'react';
import {Layers3,PlayCircle,RefreshCw,ClipboardList} from 'lucide-react';
import {requireSupabase} from '../lib/supabase';
import {getMyTestAttempts,getPublishedTests,type TestAttempt,type PublishedTest} from '../services/testService';
type Series={id:string;title:{hi?:string;en?:string};description:{hi?:string;en?:string};class_level:string;subject:string;test_ids:string[];updated_at:string};
export const StudentMockTestSeries:React.FC<{classLevel?:string}> = ({classLevel})=>{
 const [rows,setRows]=useState<Series[]>([]),[attempts,setAttempts]=useState<TestAttempt[]>([]),[tests,setTests]=useState<PublishedTest[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{if(!classLevel){setRows([]);setLoading(false);return}setLoading(true);setError('');try{const [seriesResult,history,publishedTests]=await Promise.all([requireSupabase().from('mock_test_series').select('id,title,description,class_level,subject,test_ids,updated_at').eq('class_level',classLevel).eq('is_published',true).order('updated_at',{ascending:false}),getMyTestAttempts(),getPublishedTests(classLevel)]);if(seriesResult.error)throw seriesResult.error;setRows((seriesResult.data??[]) as Series[]);setAttempts(history);setTests(publishedTests)}catch(e){setError(e instanceof Error?e.message:'Mock Test Series लोड नहीं हो सकीं।')}finally{setLoading(false)}},[classLevel]);
 useEffect(()=>{void load()},[load]);
 return <section className="space-y-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-800"><Layers3 className="h-5 w-5"/></span><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700">PRACTICE PATHWAYS</p><h3 className="text-sm font-extrabold text-slate-900">Mock Test Series</h3><p className="text-[10px] text-slate-500">आपकी कक्षा के लिए चुनी गई अभ्यास श्रृंखलाएँ</p></div></div><button onClick={()=>void load()} disabled={loading} className="rounded-lg border border-slate-200 bg-white p-2"><RefreshCw className="h-4 w-4"/></button></div>
 {error&&<p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
 {loading?<p className="py-4 text-xs text-slate-500">Series लोड हो रही हैं…</p>:rows.length===0?<p className="rounded-xl border border-dashed border-indigo-200 bg-white p-4 text-xs text-slate-500">अभी आपकी कक्षा के लिए कोई Mock Test Series प्रकाशित नहीं हुई है।</p>:<div className="grid gap-3 md:grid-cols-2">{rows.map(s=>{
 const doneIds=new Set(attempts.filter(a=>a.status==='submitted'&&s.test_ids.includes(a.test_id)).map(a=>a.test_id));
 const activeIds=new Set(attempts.filter(a=>a.status==='in_progress'&&s.test_ids.includes(a.test_id)).map(a=>a.test_id));
 const activeId=s.test_ids.find(id=>activeIds.has(id));
 const nextId=s.test_ids.find(id=>!doneIds.has(id));
 const nextActive=Boolean(activeId);
 const percent=Math.round(doneIds.size/Math.max(1,s.test_ids.length)*100);
 const testById=new Map(tests.map(test=>[test.id,test]));
 const nextLabel=(id:string)=>{const test=testById.get(id);return test?.title?.hi||test?.title?.en||'प्रकाशित टेस्ट विवरण उपलब्ध नहीं';};
 return <article key={s.id} className="rounded-xl border border-indigo-100 bg-white p-3">
 <p className="text-sm font-extrabold text-slate-900">{s.title?.hi||s.title?.en||'Mock Test Series'}</p>
 <p className="mt-1 text-xs text-slate-500">{s.description?.hi||s.description?.en||s.subject}</p>
 <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500"><span className="flex items-center gap-2"><ClipboardList className="h-3.5 w-3.5"/>{doneIds.size}/{s.test_ids.length} Tests पूर्ण · {s.subject}</span><strong className="text-indigo-700">{percent}%</strong></div>
 <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{width:percent+'%'}}/></div>
 <ol className="mt-3 space-y-1">{s.test_ids.map((id,i)=><li key={id} className="flex items-center justify-between gap-2 text-[10px]"><span className="min-w-0 truncate text-slate-600">{i+1}. {nextLabel(id)}</span><span className={doneIds.has(id)?'font-bold text-emerald-700':activeIds.has(id)?'font-bold text-amber-700':'text-slate-400'}>{activeIds.has(id)?'जारी':doneIds.has(id)?'पूर्ण':'बाकी'}</span></li>)}</ol>
 <a href={import.meta.env.BASE_URL+'online-tests/'} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-700 px-3 py-2.5 text-xs font-bold text-white"><PlayCircle className="h-4 w-4"/>{doneIds.size===s.test_ids.length?'Series दोबारा देखें':nextActive?'जारी टेस्ट खोलें':'अगला टेस्ट चुनें'}{activeId?' · '+nextLabel(activeId):nextId?' · '+nextLabel(nextId):''}</a></article>;
})}</div>}
 <p className="text-[10px] text-slate-400">प्रगति आपके सुरक्षित Test Attempts से निकाली जाती है। सूची में प्रकाशित टेस्ट के वास्तविक शीर्षक दिखते हैं। Series क्रम अभ्यास के लिए है; अभी अगले टेस्ट पर तकनीकी लॉक लागू नहीं है। टेस्ट शुरू करने और attempt limit लागू करने का काम मौजूदा सुरक्षित Test Engine करता है।</p></section>
};