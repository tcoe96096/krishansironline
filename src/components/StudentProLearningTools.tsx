import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, Brain, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Flame, Layers3, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import {
  getMyBookmarks, getMyDailyActivity, getMyMistakes, getPublishedFlashcardDecks,
  getMyFlashcardProgress, removeBookmark, setMistakeMastered, saveFlashcardProgress,
  type StudentBookmark, type DailyActivity, type StudentMistake, type FlashcardDeck,
  type FlashcardProgress,
} from '../services/proLearningService';

type Props = { classLevel?: string };
type Tab = 'streak' | 'mistakes' | 'bookmarks' | 'flashcards';
const todayIndia = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const bilingual = (value?: { hi?: string; en?: string } | string) =>
  typeof value === 'string' ? value : value?.hi || value?.en || '';
const optionLabel = (question: Record<string, any>, index: number) => {
  const options = question?.options?.hi || question?.options?.en || [];
  return Array.isArray(options) ? String(options[index] ?? '—') : '—';
};

export const StudentProLearningTools: React.FC<Props> = ({ classLevel }) => {
  const [tab, setTab] = useState<Tab>('streak');
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [mistakes, setMistakes] = useState<StudentMistake[]>([]);
  const [bookmarks, setBookmarks] = useState<StudentBookmark[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [progress, setProgress] = useState<FlashcardProgress[]>([]);
  const [deckIndex, setDeckIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [a, m, b, d, p] = await Promise.all([
        getMyDailyActivity(), getMyMistakes(), getMyBookmarks(),
        getPublishedFlashcardDecks(classLevel), getMyFlashcardProgress(),
      ]);
      setActivity(a); setMistakes(m); setBookmarks(b); setDecks(d); setProgress(p);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pro Learning डेटा लोड नहीं हो सका।');
    } finally { setLoading(false); }
  }, [classLevel]);
  useEffect(() => { void load(); }, [load]);

  const activeStreak = useMemo(() => {
    const dates = new Set(activity.map(item => item.activity_date));
    const today = todayIndia();
    const cursor = new Date(today + 'T12:00:00+05:30');
    if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (dates.has(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(cursor))) {
      count += 1; cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [activity]);

  const deck = decks[deckIndex];
  const card = deck?.cards?.[cardIndex];
  const cardProgress = progress.find(item => item.deck_id === deck?.id && item.card_id === card?.id);
  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'streak', label: 'Daily Streak', icon: Flame },
    { id: 'mistakes', label: 'Mistake Notebook', icon: Brain },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'flashcards', label: 'Flashcards', icon: Layers3 },
  ];

  const markMastered = async (item: StudentMistake) => {
    try {
      await setMistakeMastered(item.id, !item.mastered);
      setMistakes(current => current.map(row => row.id === item.id
        ? { ...row, mastered: !row.mastered } : row));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'स्थिति सेव नहीं हुई।'); }
  };
  const deleteBookmark = async (item: StudentBookmark) => {
    try { await removeBookmark(item.id); setBookmarks(current => current.filter(row => row.id !== item.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'बुकमार्क हटाया नहीं जा सका।'); }
  };
  const reviewCard = async (state: 'learning' | 'known') => {
    if (!deck || !card) return;
    try {
      await saveFlashcardProgress({ deckId: deck.id, cardId: card.id, state, previousCount: cardProgress?.review_count ?? 0 });
      setProgress(current => {
        const rest = current.filter(row => !(row.deck_id === deck.id && row.card_id === card.id));
        return [...rest, { deck_id: deck.id, card_id: card.id, review_state: state,
          review_count: (cardProgress?.review_count ?? 0) + 1, last_reviewed_at: new Date().toISOString() }];
      });
      setFlipped(false);
      if (cardIndex < deck.cards.length - 1) setCardIndex(cardIndex + 1);
      else if (deckIndex < decks.length - 1) { setDeckIndex(deckIndex + 1); setCardIndex(0); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Flashcard प्रगति सेव नहीं हुई।'); }
  };

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-indigo-700">PRO LEARNING SUITE</p>
        <h3 className="mt-1 text-lg font-extrabold text-slate-900">आपका Smart Study Workspace</h3>
        <p className="mt-1 text-xs text-slate-500">रिवीजन, गलतियों का सुधार और नियमित पढ़ाई—एक जगह</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5"/>{loading ? 'लोड…' : 'Refresh'}</button>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setTab(item.id)} className={'inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition '+(tab === item.id ? 'bg-[#0b3979] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}><Icon className="h-4 w-4"/>{item.label}</button>; })}</div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    {loading ? <p className="py-8 text-center text-sm text-slate-500">आपका Pro Learning डेटा लोड हो रहा है…</p> : <>
      {tab === 'streak' && <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 p-5"><Flame className="h-8 w-8 text-orange-600"/><p className="mt-3 text-3xl font-black text-slate-900">{activeStreak} दिन</p><p className="text-xs font-bold text-orange-800">Current Study Streak</p><p className="mt-2 text-xs text-slate-600">लगातार सक्रिय अध्ययन दिवस</p></div>
        <div className="rounded-2xl border border-slate-200 p-4"><h4 className="font-bold text-slate-800">हाल के अध्ययन दिवस</h4><div className="mt-3 grid grid-cols-7 gap-2">{Array.from({length:28},(_,i)=>{const d=new Date(todayIndia()+'T12:00:00+05:30');d.setDate(d.getDate()-(27-i));const key=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(d);const active=activity.some(a=>a.activity_date===key);return <div key={key} title={key} className={'aspect-square rounded-md '+(active?'bg-emerald-500':'bg-slate-100')}/>;})}</div><p className="mt-3 text-[11px] text-slate-500">कुल सक्रिय दिन: {activity.length} · पूर्ण टेस्ट: {activity.reduce((s,a)=>s+a.tests_completed,0)} · अध्याय पूरे: {activity.reduce((s,a)=>s+a.lessons_completed,0)}</p></div>
      </div>}
      {tab === 'mistakes' && <div className="space-y-3">{mistakes.length===0?<div className="rounded-xl border border-dashed border-slate-300 p-7 text-center"><Brain className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-2 text-sm font-bold text-slate-700">अभी Mistake Notebook खाली है</p><p className="mt-1 text-xs text-slate-500">टेस्ट में गलत दिए गए उत्तर यहाँ अपने आप आएँगे।</p></div>:mistakes.map(item=><article key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><p className="text-xs font-bold text-slate-500">प्रश्न {item.question_index+1}</p><span className={'rounded-full px-2 py-1 text-[10px] font-bold '+(item.mastered?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800')}>{item.mastered?'सीख लिया':'दोबारा अभ्यास करें'}</span></div><p className="mt-2 text-sm font-bold text-slate-900">{bilingual(item.question_snapshot?.question)}</p><p className="mt-2 text-xs text-rose-700">आपका उत्तर: {optionLabel(item.question_snapshot,item.selected_option ?? -1)}</p><p className="mt-1 text-xs text-emerald-700">सही उत्तर: {optionLabel(item.question_snapshot,item.correct_option)}</p>{bilingual(item.explanation) && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">{bilingual(item.explanation)}</p>}<button type="button" onClick={()=>void markMastered(item)} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">{item.mastered?'फिर से अभ्यास में रखें':'सीख लिया — Mark Mastered'}</button></article>)}</div>}
      {tab === 'bookmarks' && <div className="space-y-2">{bookmarks.length===0?<div className="rounded-xl border border-dashed border-slate-300 p-7 text-center"><Bookmark className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-2 text-sm font-bold text-slate-700">अभी कोई Bookmark नहीं है</p><p className="mt-1 text-xs text-slate-500">टेस्ट और अध्ययन सामग्री से जरूरी चीजें सेव करें।</p></div>:bookmarks.map(item=><div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{item.title}</p><p className="mt-1 text-[10px] uppercase text-slate-500">{item.item_type} · {new Date(item.created_at).toLocaleDateString('hi-IN')}</p></div><button type="button" onClick={()=>void deleteBookmark(item)} className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">हटाएँ</button></div>)}</div>}
      {tab === 'flashcards' && <div className="space-y-3">{!card?<div className="rounded-xl border border-dashed border-slate-300 p-7 text-center"><Layers3 className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-2 text-sm font-bold text-slate-700">Flashcard decks जल्द उपलब्ध होंगे</p><p className="mt-1 text-xs text-slate-500">Admin द्वारा प्रकाशित कार्ड यहाँ दिखाई देंगे।</p></div>:<><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold text-indigo-700">{bilingual(deck.title)}</p><p className="text-[11px] text-slate-500">{deck.subject} · {deck.chapter || 'Revision'}</p></div><span className="text-xs font-bold text-slate-500">Card {cardIndex+1}/{deck.cards.length}</span></div><button type="button" onClick={()=>setFlipped(v=>!v)} className="flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 p-6 text-center shadow-inner"><span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700">{flipped?'ANSWER / उत्तर':'QUESTION / प्रश्न'}</span><span className="mt-4 text-lg font-extrabold leading-8 text-slate-900">{bilingual(flipped?card.back:card.front)}</span><span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-indigo-700"><RotateCcw className="h-3.5 w-3.5"/>Tap to flip</span></button><div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={()=>{setCardIndex(Math.max(0,cardIndex-1));setFlipped(false);}} disabled={cardIndex===0} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"><ChevronLeft className="h-4 w-4"/>पिछला</button><div className="flex gap-2"><button type="button" onClick={()=>void reviewCard('learning')} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">फिर दोहराएँ</button><button type="button" onClick={()=>void reviewCard('known')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4"/>याद हो गया</button></div><button type="button" onClick={()=>{setCardIndex(Math.min(deck.cards.length-1,cardIndex+1));setFlipped(false);}} disabled={cardIndex===deck.cards.length-1} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">अगला<ChevronRight className="h-4 w-4"/></button></div><p className="text-[11px] text-slate-500">आपकी कार्ड प्रगति अपने आप सेव होती है।</p></>}</div>}
    </>}
  </section>;
};
