import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Plus, Save, Send, Trash2, RefreshCw, Layers3 } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';

type Card = { id: string; front: { en: string; hi: string }; back: { en: string; hi: string } };
type Deck = { id: string; title: { en?: string; hi?: string }; description: { en?: string; hi?: string }; class_level: string | null; subject: string; chapter: string | null; cards: Card[]; is_published: boolean; updated_at: string };
const emptyCard = (): Card => ({ id: 'card-'+Math.random().toString(36).slice(2,9), front:{en:'',hi:''}, back:{en:'',hi:''} });
const field = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500';

export const AdminFlashcardManagement: React.FC = () => {
  const [decks,setDecks]=useState<Deck[]>([]);
  const [selected,setSelected]=useState<string>('');
  const [titleEn,setTitleEn]=useState(''); const [titleHi,setTitleHi]=useState('');
  const [descriptionEn,setDescriptionEn]=useState(''); const [descriptionHi,setDescriptionHi]=useState('');
  const [classLevel,setClassLevel]=useState('10'); const [subject,setSubject]=useState(''); const [chapter,setChapter]=useState('');
  const [cards,setCards]=useState<Card[]>([emptyCard()]);
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState(''); const [notice,setNotice]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try { const {data,error}=await requireSupabase().from('flashcard_decks').select('id,title,description,class_level,subject,chapter,cards,is_published,updated_at').order('updated_at',{ascending:false});
      if(error)throw error;setDecks((data??[]) as Deck[]);
    } catch(e){setError(e instanceof Error?e.message:'Flashcard decks लोड नहीं हो सके।');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  const reset=()=>{setSelected('');setTitleEn('');setTitleHi('');setDescriptionEn('');setDescriptionHi('');setClassLevel('10');setSubject('');setChapter('');setCards([emptyCard()]);setNotice('');};
  const edit=(deck:Deck)=>{setSelected(deck.id);setTitleEn(deck.title?.en??'');setTitleHi(deck.title?.hi??'');setDescriptionEn(deck.description?.en??'');setDescriptionHi(deck.description?.hi??'');setClassLevel(deck.class_level??'all');setSubject(deck.subject);setChapter(deck.chapter??'');setCards(deck.cards?.length?deck.cards:[emptyCard()]);setNotice('');};
  const updateCard=(index:number,side:'front'|'back',lang:'en'|'hi',value:string)=>setCards(old=>old.map((c,i)=>i===index?{...c,[side]:{...c[side],[lang]:value}}:c));
  const save=async(publish:boolean)=>{
    if(!titleEn.trim()&&!titleHi.trim()){setError('Deck का हिन्दी या English शीर्षक आवश्यक है।');return;}
    if(!subject.trim()){setError('Subject दर्ज करें।');return;}
    if(!cards.length||cards.some(c=>!c.front.en.trim()&&!c.front.hi.trim()||!c.back.en.trim()&&!c.back.hi.trim())){setError('हर कार्ड में प्रश्न और उत्तर (Hindi या English) भरें।');return;}
    setSaving(true);setError('');setNotice('');
    try{
      const payload={title:{en:titleEn.trim(),hi:titleHi.trim()},description:{en:descriptionEn.trim(),hi:descriptionHi.trim()},class_level:classLevel==='all'?null:classLevel,subject:subject.trim(),chapter:chapter.trim()||null,cards,is_published:publish,updated_at:new Date().toISOString()};
      const query=selected?requireSupabase().from('flashcard_decks').update(payload).eq('id',selected):requireSupabase().from('flashcard_decks').insert(payload);
      const {error}=await query;if(error)throw error;
      setNotice(publish?'Deck प्रकाशित कर दिया गया।':'Draft सुरक्षित कर दिया गया।');reset();await load();
    }catch(e){setError(e instanceof Error?e.message:'Deck सेव नहीं हुआ।');}
    finally{setSaving(false);}
  };
  const remove=async(deck:Deck)=>{if(!window.confirm('क्या यह flashcard deck हटाना चाहते हैं?'))return;const {error}=await requireSupabase().from('flashcard_decks').delete().eq('id',deck.id);if(error)setError(error.message);else{setNotice('Deck हटा दिया गया।');await load();}};
  const togglePublish=async(deck:Deck)=>{const {error}=await requireSupabase().from('flashcard_decks').update({is_published:!deck.is_published,updated_at:new Date().toISOString()}).eq('id',deck.id);if(error)setError(error.message);else await load();};

  return <section className="mt-6 space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700">REVISION CONTENT</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">Flashcard Deck Manager</h3><p className="mt-1 text-xs text-slate-500">Academic Management के भीतर bilingual revision decks बनाएँ और प्रकाशित करें।</p></div><button type="button" onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold"><RefreshCw className="h-4 w-4"/>Refresh</button></div>
    {(error||notice)&&<p role="status" className={'rounded-lg p-3 text-xs '+(error?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700')}>{error||notice}</p>}
    <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><h4 className="text-sm font-extrabold text-slate-800">Existing Decks</h4><span className="text-[10px] text-slate-400">{decks.length}</span></div>
        {loading?<p className="py-5 text-xs text-slate-500">Loading…</p>:decks.length===0?<p className="py-5 text-xs text-slate-500">अभी कोई deck नहीं बना है।</p>:<div className="mt-3 space-y-2">{decks.map(d=><div key={d.id} className="rounded-lg border border-slate-100 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{d.title?.hi||d.title?.en||'Untitled'}</p><p className="mt-1 text-[10px] text-slate-500">Class {d.class_level??'All'} · {d.subject} · {d.cards?.length??0} cards</p></div><span className={'rounded-full px-2 py-1 text-[9px] font-bold '+(d.is_published?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700')}>{d.is_published?'Published':'Draft'}</span></div><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={()=>edit(d)} className="rounded-md bg-slate-100 px-2 py-1.5 text-[10px] font-bold">Edit</button><button type="button" onClick={()=>void togglePublish(d)} className="rounded-md bg-indigo-50 px-2 py-1.5 text-[10px] font-bold text-indigo-700">{d.is_published?'Unpublish':'Publish'}</button><button type="button" onClick={()=>void remove(d)} className="rounded-md bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-700">Delete</button></div></div>)}</div>}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-indigo-700"/><h4 className="text-sm font-extrabold text-slate-800">{selected?'Edit Deck':'Create New Deck'}</h4></div><button type="button" onClick={reset} className="text-[10px] font-bold text-slate-500">Clear</button></div>
        <div className="grid gap-2 sm:grid-cols-2"><input className={field} value={titleHi} onChange={e=>setTitleHi(e.target.value)} placeholder="Deck शीर्षक · हिन्दी"/><input className={field} value={titleEn} onChange={e=>setTitleEn(e.target.value)} placeholder="Deck title · English"/><input className={field} value={descriptionHi} onChange={e=>setDescriptionHi(e.target.value)} placeholder="विवरण · हिन्दी"/><input className={field} value={descriptionEn} onChange={e=>setDescriptionEn(e.target.value)} placeholder="Description · English"/><select className={field} value={classLevel} onChange={e=>setClassLevel(e.target.value)}>{['6','7','8','9','10','11','12'].map(x=><option key={x} value={x}>Class {x}</option>)}<option value="all">All Classes</option></select><input className={field} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject"/><input className={field+' sm:col-span-2'} value={chapter} onChange={e=>setChapter(e.target.value)} placeholder="Chapter / Topic"/></div>
        <div className="mt-4 flex items-center justify-between"><h5 className="text-xs font-extrabold text-slate-800">Cards ({cards.length})</h5><button type="button" onClick={()=>setCards(old=>[...old,emptyCard()])} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-[10px] font-bold text-indigo-700"><Plus className="h-3.5 w-3.5"/>Add Card</button></div>
        <div className="mt-2 max-h-[460px] space-y-3 overflow-y-auto">{cards.map((card,i)=><div key={card.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-extrabold text-slate-500">CARD {i+1}</span><button type="button" disabled={cards.length===1} onClick={()=>setCards(old=>old.filter((_,j)=>j!==i))} className="rounded-md p-1 text-rose-600 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5"/></button></div><div className="grid gap-2 sm:grid-cols-2">{(['front','back'] as const).map(side=><div key={side} className="space-y-2"><p className="text-[10px] font-bold uppercase text-slate-500">{side==='front'?'Question / प्रश्न':'Answer / उत्तर'}</p><textarea className={field} rows={2} value={card[side].hi} onChange={e=>updateCard(i,side,'hi',e.target.value)} placeholder="हिन्दी"/><textarea className={field} rows={2} value={card[side].en} onChange={e=>updateCard(i,side,'en',e.target.value)} placeholder="English"/></div>)}</div></div>)}</div>
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" disabled={saving} onClick={()=>void save(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold disabled:opacity-50"><Save className="h-4 w-4"/>Save Draft</button><button type="button" disabled={saving} onClick={()=>void save(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Send className="h-4 w-4"/>Publish Deck</button></div>
      </div>
    </div>
  </section>;
};
