import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ClipboardCheck, RefreshCw, UserRound, Trophy, PlayCircle, Clock3, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyTestAttempts, getPublishedTests, type TestAttempt, type PublishedTest } from '../services/testService';
import { getMyLearningProgress, type StudentLearningProgress } from '../services/learningProgressService';

export const StudentDashboard: React.FC = () => {
  const { profile, profileLoading, refreshProfile } = useAuth();
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [tests, setTests] = useState<PublishedTest[]>([]);
  const [learningProgress, setLearningProgress] = useState<StudentLearningProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true); setError('');
    try {
      const [history, catalogue] = await Promise.all([getMyTestAttempts(), getPublishedTests()]);
      setAttempts(history); setTests(catalogue);
      // Progress storage may not be deployed yet; never let it block test history/dashboard.
      const progress = await getMyLearningProgress().catch((progressError) => {
        console.warn('Learning progress is temporarily unavailable:', progressError);
        return [] as StudentLearningProgress[];
      });
      setLearningProgress(progress); await refreshProfile();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'डैशबोर्ड डेटा लोड नहीं हो सका।');
    } finally { setLoading(false); }
  };
  useEffect(() => { void loadDashboard(); }, []);

  const completed = attempts.filter(x => x.status === 'submitted');
  const inProgress = attempts.filter(x => x.status === 'in_progress');
  const available = profile ? tests.filter(x => x.class_level === String(profile.class_level)) : [];
  const average = completed.length ? Math.round(completed.reduce((s,x) => s + Number(x.percentage || 0),0) / completed.length) : 0;
  const attemptByTest = useMemo(() => new Map(attempts.map(x => [x.test_id,x])),[attempts]);

  return <section className="space-y-5" aria-label="Student dashboard">
    <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#082d65] via-[#104b83] to-[#087d9b] p-5 text-white shadow-lg sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-100">KRISHAN SIR • STUDENT SPACE</p><h3 className="mt-2 text-2xl font-extrabold sm:text-3xl">नमस्ते, {profile?.student_name || 'विद्यार्थी'}!</h3><p className="mt-1 text-sm text-blue-100">आपकी पढ़ाई, टेस्ट और परिणाम—एक ही स्थान पर।</p></div><div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/20"><GraduationCap className="h-8 w-8"/></div></div>
      {profile && <div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/15 px-3 py-1.5">कक्षा {profile.class_level}</span><span className="rounded-full bg-white/15 px-3 py-1.5">रोल नं. {profile.roll_no}</span><span className="rounded-full bg-white/15 px-3 py-1.5">{profile.school_name}</span></div>}
    </div>
    {profileLoading && <p className="text-sm text-slate-500">प्रोफाइल लोड हो रही है…</p>}
    {!profile && !profileLoading && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">विद्यार्थी प्रोफाइल उपलब्ध नहीं है। Admin से संपर्क करें।</p>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        {label:'उपलब्ध टेस्ट',value:available.length,icon:BookOpen,tone:'text-sky-700 bg-sky-50'},
        {label:'पूर्ण टेस्ट',value:completed.length,icon:ClipboardCheck,tone:'text-emerald-700 bg-emerald-50'},
        {label:'जारी टेस्ट',value:inProgress.length,icon:RefreshCw,tone:'text-amber-700 bg-amber-50'},
        {label:'औसत स्कोर',value:average+'%',icon:Trophy,tone:'text-violet-700 bg-violet-50'}
      ].map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className={'mb-3 flex h-9 w-9 items-center justify-center rounded-xl '+item.tone}><item.icon className="h-5 w-5"/></div><p className="text-2xl font-extrabold text-slate-900">{item.value}</p><p className="mt-1 text-xs font-medium text-slate-500">{item.label}</p></div>)}
    </div>
    <div className="flex items-center justify-between gap-3"><div><h4 className="text-lg font-extrabold text-slate-900">मेरे लिए उपलब्ध टेस्ट</h4><p className="text-xs text-slate-500">आपकी कक्षा के प्रकाशित टेस्ट</p></div><button type="button" onClick={()=>void loadDashboard()} disabled={loading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-sky-800 disabled:opacity-50">{loading?'लोड हो रहा है…':'↻ रिफ्रेश'}</button></div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p className="text-sm text-slate-500">टेस्ट लोड हो रहे हैं…</p> : available.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">अभी आपकी कक्षा के लिए कोई प्रकाशित टेस्ट उपलब्ध नहीं है।</p> :
      <div className="grid gap-3 md:grid-cols-2">{available.map(test => {
        const attempt=attemptByTest.get(test.id); const title=test.title.hi || test.title.en;
        return <article key={test.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-800">कक्षा {test.class_level}</span>{attempt?.status==='submitted' && <span className="text-xs font-bold text-emerald-700">पूर्ण</span>}</div>
          <h5 className="mt-3 font-extrabold text-slate-900">{title}</h5><p className="mt-1 text-xs text-slate-500">{test.subject} · {test.questions.length} प्रश्न · {test.total_marks} अंक · {test.duration_minutes} मिनट</p>
          <a href={`${import.meta.env.BASE_URL}online-tests/?test=${encodeURIComponent(test.id)}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b3979] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#124887]"><PlayCircle className="h-4 w-4"/>{attempt?.status==='in_progress'?'टेस्ट जारी रखें':'टेस्ट शुरू करें'}</a>
        </article>;
      })}</div>}
    <div><div className="mb-3"><h4 className="text-lg font-extrabold text-slate-900">मेरी पढ़ाई की प्रगति</h4><p className="text-xs text-slate-500">अध्याय पढ़ते समय आपकी स्थिति अपने आप सेव होती है।</p></div>{loading?<p className="text-sm text-slate-500">प्रगति लोड हो रही है…</p>:learningProgress.length===0?<p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">अभी पढ़ाई की प्रगति उपलब्ध नहीं है। अध्ययन सामग्री खोलने पर आपकी प्रगति यहां दिखाई देगी।</p>:<div className="grid gap-3 md:grid-cols-2">{learningProgress.slice(0,6).map(item=><article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-slate-800">{item.chapter_title}</p><p className="mt-1 text-xs text-slate-500">कक्षा {item.class_level} · {item.subject}</p></div><span className="shrink-0 text-sm font-extrabold text-sky-800">{item.progress_percent}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-700" style={{width:item.progress_percent+'%'}}/></div><p className="mt-2 text-[11px] text-slate-500">अंतिम बार खोला: {new Date(item.last_opened_at).toLocaleDateString('hi-IN')}</p></article>)}</div>}</div>
    <div><h4 className="mb-3 text-lg font-extrabold text-slate-900">मेरे टेस्ट परिणाम</h4>{loading?<p className="text-sm text-slate-500">परिणाम लोड हो रहे हैं…</p>:attempts.length===0?<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">अभी कोई टेस्ट प्रयास उपलब्ध नहीं है।</p>:<div className="space-y-2">{attempts.map(attempt=><div key={attempt.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{tests.find(t=>t.id===attempt.test_id)?.title.hi || attempt.test_id}</p><p className="text-xs text-slate-500">{new Date(attempt.started_at).toLocaleDateString('hi-IN')} · प्रयास {attempt.attempt_number}</p></div><div className="shrink-0 text-right"><p className="font-extrabold text-slate-900">{attempt.status==='submitted'?`${attempt.score??0}/${attempt.total_marks??0}`:attempt.status==='in_progress'?'जारी':'समाप्त'}</p><p className="text-[11px] text-slate-500">{attempt.status==='submitted'?`${attempt.percentage??0}%`:attempt.status==='in_progress'?'अधूरा':'समय समाप्त'}</p></div></div>)}</div>}</div>
    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><Clock3 className="mr-1 inline h-4 w-4"/>आपकी प्रगति और परिणाम आपके सुरक्षित विद्यार्थी खाते से जुड़े हैं।</div>
  </section>;
};
