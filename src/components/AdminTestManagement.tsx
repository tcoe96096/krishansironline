import React, { useCallback, useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import { ArrowLeft, Plus, Save, Send, RefreshCw, Trash2, Eye, EyeOff, ClipboardList } from 'lucide-react';

type Bilingual = { en: string; hi: string };
type DraftQuestion = { question: Bilingual; options: { en: string[]; hi: string[] }; marks: number };
type TestRow = { id: string; title: Bilingual; class_level: string; subject: string; chapter: string; duration_minutes: number; total_marks: number; attempt_limit: number; is_published: boolean; questions: DraftQuestion[] };

const blankQuestion = (): DraftQuestion => ({ question: { en: '', hi: '' }, options: { en: ['', '', '', ''], hi: ['', '', '', ''] }, marks: 1 });

export const AdminTestManagement: React.FC = () => {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState<Bilingual>({ en: '', hi: '' });
  const [classLevel, setClassLevel] = useState('10');
  const [subject, setSubject] = useState('Social Science');
  const [chapter, setChapter] = useState('');
  const [duration, setDuration] = useState(40);
  const [attemptLimit, setAttemptLimit] = useState(1);
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [answers, setAnswers] = useState<number[]>([0]);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  const loadTests = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error: queryError } = await requireSupabase().from('tests')
        .select('id,title,class_level,subject,chapter,duration_minutes,total_marks,attempt_limit,is_published,questions')
        .order('updated_at', { ascending: false });
      if (queryError) throw queryError;
      setTests((data ?? []) as TestRow[]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Tests load नहीं हो पाए।'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadTests(); }, [loadTests]);

  const updateQuestion = (index: number, updater: (q: DraftQuestion) => DraftQuestion) =>
    setQuestions(current => current.map((q, i) => i === index ? updater(q) : q));

  const addQuestion = () => { setQuestions(v => [...v, blankQuestion()]); setAnswers(v => [...v, 0]); };
  const removeQuestion = (index: number) => {
    setQuestions(v => v.filter((_, i) => i !== index));
    setAnswers(v => v.filter((_, i) => i !== index));
  };

  const saveDraft = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      if (!title.en.trim() || !title.hi.trim() || !chapter.trim() || !questions.length) throw new Error('दोनों भाषाओं में शीर्षक, अध्याय और कम-से-कम एक प्रश्न आवश्यक है।');
      const totalMarks = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);
      if (questions.some(q => !Number.isFinite(Number(q.marks)) || Number(q.marks) <= 0)) throw new Error('हर प्रश्न के अंक शून्य से अधिक होने चाहिए।');
      if (questions.some(q => !q.question.en.trim() || !q.question.hi.trim() || q.options.en.some(x => !x.trim()) || q.options.hi.some(x => !x.trim()))) throw new Error('हर प्रश्न और उसके सभी विकल्प Hindi तथा English में भरें।');
      const id = editingTestId || ('test-' + Date.now().toString(36));
      const test = {
        id, title, class_level: classLevel, subject: subject.trim(), chapter: chapter.trim(),
        duration_minutes: duration, total_marks: totalMarks, attempt_limit: attemptLimit,
        questions: questions.map((q, i) => ({ id: 'q' + (i + 1), chapter: chapter.trim(), question: q.question, options: q.options, marks: q.marks, type: 'mcq' }))
      };
      const { data, error: invokeError } = await requireSupabase().functions.invoke('admin-test-import', { body: { test, answer_key: answers } });
      if (invokeError) throw invokeError;
      if (!data?.ok) throw new Error(data?.error || 'Draft save की पुष्टि नहीं हुई।');
      setNotice('Test Draft सुरक्षित रूप से सेव हो गया। Publish करने से पहले सूची में जाँचें।');
      setTitle({ en: '', hi: '' }); setChapter(''); setQuestions([blankQuestion()]); setAnswers([0]); setEditingTestId(null);
      await loadTests();
    } catch (e) { setError(e instanceof Error ? e.message : 'Test save नहीं हुआ।'); }
    finally { setSaving(false); }
  };

  const editDraft = async (test: TestRow) => {
    setError(''); setNotice('');
    try {
      const { data, error: fetchError } = await requireSupabase()
        .rpc('admin_get_test_for_edit', { p_test_id: test.id });
      if (fetchError) throw fetchError;
      const payload = data as { test: TestRow; answer_key: number[] } | null;
      if (!payload?.test || !Array.isArray(payload.answer_key)) throw new Error('Draft और private answer key उपलब्ध नहीं हैं।');
      const row = payload.test;
      setEditingTestId(row.id);
      setTitle(row.title);
      setClassLevel(row.class_level);
      setSubject(row.subject);
      setChapter(row.chapter);
      setDuration(row.duration_minutes);
      setAttemptLimit(row.attempt_limit);
      setQuestions((row.questions || []).map(q => ({...q, marks: Number(q.marks || 1)})));
      setAnswers(payload.answer_key);
      setNotice('Draft editing mode: बदलाव सेव करने पर Test दोबारा Draft होगा।');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Draft खोलना संभव नहीं हुआ।');
    }
  };

  const cancelEdit = () => {
    setEditingTestId(null); setTitle({en:'',hi:''}); setChapter('');
    setQuestions([blankQuestion()]); setAnswers([0]);
    setNotice('Editing रद्द कर दी गई।');
  };

  const togglePublish = async (test: TestRow) => {
    setSaving(true); setError(''); setNotice('');
    try {
      const { error: rpcError } = await requireSupabase().rpc('admin_set_test_published', { p_test_id: test.id, p_publish: !test.is_published });
      if (rpcError) throw rpcError;
      setNotice(!test.is_published ? 'Test प्रकाशित कर दिया गया।' : 'Test Unpublish कर दिया गया।');
      await loadTests();
    } catch (e) { setError(e instanceof Error ? e.message : 'Publish status बदल नहीं पाया।'); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Assessment · Admin only</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">Online Test Builder</h2><p className="mt-1 text-sm text-slate-500">Bilingual MCQ बनाएं, Draft सेव करें और जाँच के बाद Publish करें।</p></div><button onClick={() => void loadTests()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4"/>Refresh</button></div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="mb-4 flex items-center gap-2 font-extrabold text-slate-900"><Plus className="h-5 w-5 text-sky-700"/>{editingTestId ? 'Edit Test Draft' : 'Create New Test'}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Test Title (English)<input value={title.en} onChange={e=>setTitle(v=>({...v,en:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">टेस्ट शीर्षक (हिंदी)<input value={title.hi} onChange={e=>setTitle(v=>({...v,hi:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Class<select value={classLevel} onChange={e=>setClassLevel(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm">{['6','7','8','9','10','11','12'].map(x=><option key={x} value={x}>Class {x}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Subject<input value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Chapter / अध्याय<input value={chapter} onChange={e=>setChapter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Duration (minutes)<input type="number" min="1" max="600" value={duration} onChange={e=>setDuration(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Attempt limit<input type="number" min="1" max="20" value={attemptLimit} onChange={e=>setAttemptLimit(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm" /></label>
      </div>
      <div className="mt-6 space-y-4">
        {questions.map((q,i)=><div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-extrabold text-slate-800">Question {i+1}</h4><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Marks / अंक<input type="number" min="0.25" max="100" step="0.25" value={q.marks} onChange={e=>updateQuestion(i,v=>({...v,marks:Number(e.target.value)}))} className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"/></label>{questions.length>1&&<button onClick={()=>removeQuestion(i)} className="text-xs font-semibold text-rose-600"><Trash2 className="mr-1 inline h-3.5 w-3.5"/>Remove</button>}</div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">Question (English)<textarea value={q.question.en} onChange={e=>updateQuestion(i,v=>({...v,question:{...v.question,en:e.target.value}}))} className="mt-1 min-h-16 w-full rounded-lg border border-slate-300 p-2 text-sm"/></label>
            <label className="text-xs font-semibold text-slate-600">प्रश्न (हिंदी)<textarea value={q.question.hi} onChange={e=>updateQuestion(i,v=>({...v,question:{...v.question,hi:e.target.value}}))} className="mt-1 min-h-16 w-full rounded-lg border border-slate-300 p-2 text-sm"/></label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {q.options.en.map((opt,j)=><div key={j} className="rounded-lg border border-slate-200 bg-white p-3">
              <label className="text-[11px] font-bold text-slate-600">Option {j+1} (English)<input value={opt} onChange={e=>updateQuestion(i,v=>({...v,options:{...v.options,en:v.options.en.map((x,k)=>k===j?e.target.value:x)}}))} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"/></label>
              <label className="mt-2 block text-[11px] font-bold text-slate-600">विकल्प {j+1} (हिंदी)<input value={q.options.hi[j]} onChange={e=>updateQuestion(i,v=>({...v,options:{...v.options,hi:v.options.hi.map((x,k)=>k===j?e.target.value:x)}}))} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"/></label>
              <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-sky-900"><input type="radio" name={'answer-'+i} checked={answers[i]===j} onChange={()=>setAnswers(v=>v.map((x,k)=>k===i?j:x))}/>Correct answer / सही उत्तर</label>
            </div>)}
          </div>
        </div>)}
        <button onClick={addQuestion} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-sky-300 px-4 py-2.5 text-sm font-bold text-sky-800"><Plus className="h-4 w-4"/>Add Question</button>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500">{questions.length} questions · {questions.reduce((n,q)=>n+Number(q.marks||0),0)} marks · Saves are always Drafts</p><div className="flex flex-wrap gap-2">{editingTestId && <button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700">Cancel Edit</button>}<button disabled={saving} onClick={()=>void saveDraft()} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{saving?'Saving…':editingTestId?'Update Draft':'Save Draft'}</button></div></div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-sky-800"/><h3 className="font-extrabold text-slate-900">Saved Tests</h3></div>
      {loading?<p className="text-sm text-slate-500">Loading tests…</p>:tests.length===0?<p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">अभी कोई Test उपलब्ध नहीं है। ऊपर से पहला Draft बनाएँ।</p>:<div className="space-y-3">{tests.map(test=><div key={test.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div className="min-w-0"><p className="font-bold text-slate-900">{test.title?.hi || test.title?.en || test.id}</p><p className="mt-1 text-xs text-slate-500">Class {test.class_level} · {test.subject} · {test.chapter} · {test.questions?.length||0} questions</p><span className={'mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold '+(test.is_published?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700')}>{test.is_published?'Published':'Draft'}</span></div>{!test.is_published && <button disabled={saving} onClick={()=>void editDraft(test)} className="inline-flex items-center gap-2 rounded-lg border border-sky-300 px-3 py-2 text-xs font-bold text-sky-800 disabled:opacity-50">Edit Draft</button>}<button disabled={saving} onClick={()=>void togglePublish(test)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">{test.is_published?<><EyeOff className="h-4 w-4"/>Unpublish</>:<><Send className="h-4 w-4"/>Publish</>}</button></div>)}</div>}
    </section>
    <p className="text-xs leading-5 text-slate-500">सुरक्षा: सही उत्तर अलग private answer-key table में सेव होता है; Student catalogue में सही उत्तर नहीं भेजा जाता। Publish केवल Admin action है। PDF/Google Drive OCR import अभी उपलब्ध नहीं है।</p>
  </div>;
};
