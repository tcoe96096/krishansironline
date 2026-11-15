import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { SmartResultReportCard, openSmartResultPrint } from './SmartResultReportCard';
import { displayAttemptStatus } from '../services/attemptDisplayStatus';
import { studyMaterialUrl } from '../services/learningLinks';
import type { DisplayAttemptStatus } from '../services/attemptDisplayStatus';
import type { ResultReportTheme } from './SmartResultReportCard';
import { getMyTestAttempts, getPublishedTests, type TestAttempt, type PublishedTest } from '../services/testService';
import {
  Activity, ArrowRight, Award, BookOpen, CalendarDays, CheckCircle2, ChevronRight,
  Clock3, ExternalLink, FileText, GraduationCap, LockKeyhole, Printer, RefreshCw,
  Search, ShieldCheck, Sparkles, Target, TrendingUp, X, XCircle
} from 'lucide-react';

type ResultTab = 'history' | 'insights' | 'external';
type ResultFilter = 'all' | DisplayAttemptStatus;
const officialPortals = [
  { id: 'cbse', name: 'CBSE Results', hi: 'सीबीएसई परिणाम', subtitle: 'Central Board of Secondary Education', url: 'https://results.cbse.nic.in/' },
  { id: 'nta', name: 'National Testing Agency', hi: 'राष्ट्रीय परीक्षा एजेंसी', subtitle: 'NTA official examinations portal', url: 'https://www.nta.ac.in/' },
] as const;

const htmlSafe = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (character) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character
));

const formatPercent = (value: number | null | undefined) => Number(value ?? 0).toFixed(1) + '%';
const isCompleted = (attempt: TestAttempt) => attempt.status === 'submitted';
const statusStyle: Record<ResultFilter, string> = {
  all: 'bg-slate-100 text-slate-700',
  submitted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  in_progress: 'bg-amber-50 text-amber-800 border-amber-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200',
  overdue: 'bg-orange-50 text-orange-800 border-orange-200'
};

export const ResultsPortal: React.FC = () => {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const en = language === 'en';
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [tests, setTests] = useState<PublishedTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ResultTab>('history');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ResultFilter>('all');
  const [selected, setSelected] = useState<TestAttempt | null>(null);
  const [cardTheme, setCardTheme] = useState<ResultReportTheme>('modern');
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      setAttempts([]);
      setTests([]);
      setSelected(null);
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    Promise.all([getMyTestAttempts(), getPublishedTests()])
      .then(([history, catalogue]) => {
        if (!mounted) return;
        setAttempts(history);
        setTests(catalogue);
        // Only an attempt already returned for this authenticated student can open.
        // Guessing another student's resultId never fetches their record.
        const requested = new URLSearchParams(window.location.search).get('resultId');
        const owned = requested ? history.find((attempt) => attempt.id === requested && attempt.status === 'submitted') : null;
        if (owned) { setTab('history'); setSelected(owned); }
      })
      .catch((cause) => {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Results are unavailable');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [user?.id, refreshCount]);

  const nameOf = (testId: string) => {
    const test = tests.find((item) => item.id === testId);
    return (en ? test?.title.en : test?.title.hi) || test?.title.en || test?.title.hi || (en ? 'Previous test' : 'पिछला टेस्ट');
  };
  const dateOf = (value: string | null) => value
    ? new Date(value).toLocaleDateString(en ? 'en-IN' : 'hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const completed = useMemo(() => attempts.filter(isCompleted), [attempts]);
  const summary = useMemo(() => {
    const values = completed.map((item) => Number(item.percentage || 0)).filter(Number.isFinite);
    const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const best = values.length ? Math.max(...values) : null;
    const chronological = [...completed].sort((a, b) => +new Date(a.submitted_at || a.started_at) - +new Date(b.submitted_at || b.started_at));
    const latest = chronological.length ? Number(chronological[chronological.length - 1].percentage ?? 0) : null;
    return { average, best, latest, chronological };
  }, [completed]);
  const nowEpochMs = Date.now();
  const filtered = useMemo(() => attempts.filter((item) =>
    (filter === 'all' || displayAttemptStatus(item, nowEpochMs) === filter) &&
    (!query.trim() || (nameOf(item.test_id) + ' ' + item.attempt_number).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  ), [attempts, filter, query, tests, en, nowEpochMs]);

  const resultCardData = (attempt: TestAttempt) => ({
    attempt,
    title: nameOf(attempt.test_id),
    subject: tests.find((test) => test.id === attempt.test_id)?.subject,
    student: {
      name: profile?.student_name || (en ? 'Student' : 'विद्यार्थी'),
      classLevel: profile?.class_level,
      rollNo: profile?.roll_no,
      school: profile?.school_name
    },
    isEnglish: en,
    theme: cardTheme
  });

  const printResult = (attempt: TestAttempt) => {
    if (!isCompleted(attempt) || !user || !openSmartResultPrint(resultCardData(attempt))) {
      setError(en ? 'Allow pop-ups to print the report.' : 'रिपोर्ट प्रिंट करने के लिए Pop-ups की अनुमति दें।');
    }
  };

  return (
    <section id="results" className="min-h-[75vh] bg-[#f3f7fc] pb-20 pt-8 sm:pt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#061f47] via-[#0a3972] to-[#087b8a] px-6 py-8 text-white shadow-xl shadow-sky-950/10 sm:px-10 sm:py-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[44px] border-white/5" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-cyan-100"><Sparkles size={14}/>{en ? 'SMART LEARNING PLATFORM' : 'स्मार्ट लर्निंग प्लेटफॉर्म'}</div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{en ? 'My Result Hub' : 'मेरा स्मार्ट रिजल्ट हब'}</h1>
              <p className="mt-3 text-sm leading-relaxed text-sky-100 sm:text-base">{en ? 'Your private scores, exam history, progress and official external result links — in one place.' : 'आपके निजी अंक, टेस्ट हिस्ट्री, अध्ययन प्रगति और बाहरी आधिकारिक रिजल्ट लिंक — एक ही जगह।'}</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              {en ? 'Private & secured' : 'निजी और सुरक्षित'}
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {([
            ['history', en ? 'My Results' : 'मेरे परिणाम', FileText],
            ['insights', en ? 'Performance' : 'प्रदर्शन विश्लेषण', TrendingUp],
            ['external', en ? 'External Results' : 'अन्य परीक्षा परिणाम', ExternalLink]
          ] as const).map(([key, text, Icon]) => (
            <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key}
              className={'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ' +
                (tab === key ? 'bg-[#0a3972] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100')}>
              <Icon size={17}/>{text}
            </button>
          ))}
        </div>

        {tab === 'external' ? (
          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_300px]">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{en ? 'Official Result Portals' : 'आधिकारिक परिणाम पोर्टल'}</h2>
              <p className="mt-2 text-sm text-slate-600">{en ? 'Open the official provider website securely. External marks are not imported into your account.' : 'संबंधित संस्था की आधिकारिक वेबसाइट सुरक्षित रूप से खोलें। बाहरी अंक आपके खाते में स्वतः नहीं जोड़े जाते।'}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {officialPortals.map((item) => (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" key={item.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-800"><GraduationCap size={23}/></span>
                    <h3 className="mt-4 font-extrabold text-slate-900">{en ? item.name : item.hi}</h3>
                    <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-sky-800">{en ? 'Open official portal' : 'आधिकारिक पोर्टल खोलें'} <ExternalLink size={14}/></span>
                  </a>
                ))}
              </div>
            </div>
            <aside className="h-fit rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <LockKeyhole size={25} className="text-sky-800"/>
              <h3 className="mt-3 font-bold text-slate-900">{en ? 'Privacy first' : 'आपकी गोपनीयता पहले'}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{en ? 'Enter roll numbers, passwords or other identifiers only on the official examination website, never on an unverified link.' : 'रोल नंबर, पासवर्ड या अन्य व्यक्तिगत विवरण केवल परीक्षा संस्था की आधिकारिक वेबसाइट पर भरें।'}</p>
              <p className="mt-3 text-xs text-sky-800">{en ? 'Additional providers are added only after official URL and authorization review.' : 'अन्य संस्थाओं के लिंक आधिकारिक URL सत्यापन के बाद ही जोड़े जाएँगे।'}</p>
            </aside>
          </div>
        ) : !user ? (
          <div className="mx-auto mt-7 max-w-2xl rounded-3xl border border-sky-200 bg-white p-8 text-center shadow-sm">
            <LockKeyhole className="mx-auto h-11 w-11 text-sky-800" />
            <h2 className="mt-4 text-xl font-extrabold text-slate-900">{en ? 'Sign in to view your personal results' : 'अपने परिणाम देखने के लिए लॉगिन करें'}</h2>
            <p className="mt-2 text-sm text-slate-600">{en ? 'Use Student Login from the website header. Only your own exam history is accessible.' : 'वेबसाइट के Student Login से प्रवेश करें। यहाँ केवल आपके अपने परिणाम दिखाई देंगे।'}</p>
          </div>
        ) : (
          <>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{en ? 'YOUR LEARNING OVERVIEW' : 'आपकी अध्ययन रिपोर्ट'}</p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-900">{profile?.student_name || (en ? 'Student account' : 'विद्यार्थी खाता')}</h2>
                <p className="text-xs text-slate-500">{en ? 'Class' : 'कक्षा'} {profile?.class_level || '—'}</p>
              </div>
              <button type="button" onClick={() => setRefreshCount((n) => n + 1)} disabled={loading}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>{en ? 'Refresh data' : 'रिफ्रेश करें'}</button>
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: en ? 'Completed tests' : 'पूर्ण टेस्ट', value: String(completed.length), icon: CheckCircle2, accent: 'text-emerald-700 bg-emerald-50' },
                { label: en ? 'Average score' : 'औसत अंक', value: summary.average === null ? '—' : formatPercent(summary.average), icon: Activity, accent: 'text-sky-800 bg-sky-50' },
                { label: en ? 'Personal best' : 'सर्वश्रेष्ठ प्रदर्शन', value: summary.best === null ? '—' : formatPercent(summary.best), icon: Award, accent: 'text-amber-800 bg-amber-50' },
                { label: en ? 'Latest score' : 'नवीनतम स्कोर', value: summary.latest === null ? '—' : formatPercent(summary.latest), icon: Target, accent: 'text-teal-800 bg-teal-50' }
              ].map(({label, value, icon: Icon, accent}) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <span className={'flex h-10 w-10 items-center justify-center rounded-xl ' + accent}><Icon size={20}/></span>
                  <p className="mt-4 text-2xl font-extrabold tabular-nums text-slate-900">{loading ? '…' : value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            {tab === 'insights' ? (
              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-extrabold text-slate-900">{en ? 'Your progress over time' : 'समय के साथ आपकी प्रगति'}</h3>
                    <TrendingUp size={21} className="text-teal-700"/>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{en ? 'Completed attempts, oldest to newest. This is personal progress, not a class rank.' : 'पूरे किए गए टेस्ट, पुराने से नए क्रम में। यह आपकी निजी प्रगति है, कक्षा रैंक नहीं।'}</p>
                  {summary.chronological.length ? (
                    <div className="mt-8 flex h-52 items-end gap-2 border-b border-slate-200 pb-1 sm:gap-3" role="img" aria-label={en ? 'Bar chart of your completed test percentages' : 'पूर्ण टेस्टों के प्रतिशत का बार चार्ट'}>
                      {summary.chronological.slice(-12).map((item) => {
                        const percentage = Math.max(0, Math.min(100, Number(item.percentage || 0)));
                        return <div key={item.id} title={nameOf(item.test_id) + ': ' + formatPercent(percentage)} className="group relative flex h-full min-w-0 flex-1 items-end">
                          <div style={{height: Math.max(2, percentage) + '%'}} className="w-full rounded-t-lg bg-gradient-to-t from-sky-800 to-teal-400 transition-colors group-hover:from-sky-950" />
                          <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">{formatPercent(percentage)}</span>
                        </div>;
                      })}
                    </div>
                  ) : <p className="mt-7 rounded-xl bg-slate-50 p-7 text-center text-sm text-slate-600">{en ? 'Complete a test to see your progress graph.' : 'प्रगति ग्राफ देखने के लिए एक टेस्ट पूरा करें।'}</p>}
                  <p className="mt-4 text-xs text-slate-500">{en ? 'Calculated only from your saved server-verified submissions.' : 'केवल आपके सर्वर पर दर्ज किए गए पूर्ण परिणामों से गणना।'}</p>
                </div>
                <div className="rounded-3xl bg-[#092d63] p-6 text-white shadow-sm">
                  <Sparkles className="h-8 w-8 text-teal-300" />
                  <h3 className="mt-4 text-lg font-extrabold">{en ? 'Your next learning step' : 'अगला अध्ययन कदम'}</h3>
                  <p className="mt-3 text-sm leading-7 text-sky-100">{summary.latest === null
                    ? (en ? 'Start a practice test to establish your first progress record.' : 'पहला प्रगति रिकॉर्ड बनाने के लिए अभ्यास टेस्ट शुरू करें।')
                    : (en ? 'Review your latest test and revisit topics that need practice. Use your saved materials and test history.' : 'अपने पिछले टेस्ट की समीक्षा करें और जिन विषयों में अभ्यास चाहिए, उन्हें दोहराएँ।')}</p>
                  <div className="mt-6 flex flex-wrap gap-2"><a href={studyMaterialUrl(import.meta.env.BASE_URL, summary.chronological.length ? tests.find((test) => test.id === summary.chronological[summary.chronological.length-1].test_id) : null)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-sky-900 hover:bg-sky-50"><BookOpen size={16}/>{en ? 'Revise study materials' : 'अध्ययन सामग्री दोहराएँ'}</a><a href={import.meta.env.BASE_URL + 'online-tests/'} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/25 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">{en ? 'Practice tests' : 'अभ्यास टेस्ट'}<ArrowRight size={16}/></a></div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">{en ? 'Test history' : 'टेस्ट परिणाम इतिहास'}</h3>
                    <p className="mt-1 text-xs text-slate-500">{en ? 'Your attempts are saved separately. A score appears only after completed submission.' : 'हर प्रयास अलग सुरक्षित है। अंक केवल टेस्ट जमा होने के बाद दिखाई देंगे।'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="relative flex min-w-0 flex-1 items-center sm:flex-none">
                      <Search size={16} aria-hidden="true" className="absolute left-3 text-slate-400"/>
                      <span className="sr-only">{en ? 'Search tests' : 'टेस्ट खोजें'}</span>
                      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={en ? 'Search tests…' : 'टेस्ट खोजें…'} className="h-11 w-full min-w-[150px] rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 sm:w-48"/>
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="sr-only">{en ? 'Filter results' : 'परिणाम फ़िल्टर'}</span>
                      <select value={filter} onChange={(event) => setFilter(event.target.value as ResultFilter)} className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400">
                        <option value="all">{en ? 'All attempts' : 'सभी प्रयास'}</option>
                        <option value="submitted">{en ? 'Completed' : 'पूर्ण'}</option>
                        <option value="in_progress">{en ? 'In progress' : 'जारी'}</option>
                        <option value="expired">{en ? 'Expired' : 'समय समाप्त'}</option>
                        <option value="overdue">{en ? 'Overdue (pending sync)' : 'अवधि पार (लंबित)'}</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {loading ? <p role="status" className="py-12 text-center text-sm text-slate-500">{en ? 'Loading your results…' : 'परिणाम लोड हो रहे हैं…'}</p>
                  : filtered.length === 0 ? <div className="rounded-2xl bg-slate-50 px-5 py-12 text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-slate-400"/>
                    <p className="mt-3 font-bold text-slate-800">{en ? 'No matching results' : 'कोई परिणाम नहीं मिला'}</p>
                    <p className="mt-1 text-xs text-slate-500">{en ? 'Try another filter or complete a test.' : 'दूसरा फ़िल्टर चुनें या एक टेस्ट पूरा करें।'}</p>
                  </div> : filtered.map((item) => (
                    <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-sky-200 hover:bg-sky-50/40 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <span className={'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ' + statusStyle[displayAttemptStatus(item, nowEpochMs)]}>
                          {displayAttemptStatus(item, nowEpochMs) === 'submitted' ? (en ? 'Completed' : 'पूर्ण') : displayAttemptStatus(item, nowEpochMs) === 'in_progress' ? (en ? 'In progress' : 'जारी') : displayAttemptStatus(item, nowEpochMs) === 'overdue' ? (en ? 'Overdue — not finalized' : 'अवधि पार — लंबित') : (en ? 'Expired' : 'समय समाप्त')}
                        </span>
                        <h4 className="mt-2 text-base font-extrabold text-slate-900">{nameOf(item.test_id)}</h4>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1"><CalendarDays size={13}/>{dateOf(item.submitted_at || item.started_at)}</span>
                          <span>{en ? 'Attempt' : 'प्रयास'} #{item.attempt_number}</span>
                        </div>
                      </div>
                      {isCompleted(item) ? <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right">
                          <p className="text-lg font-extrabold tabular-nums text-slate-900">{Number(item.score ?? 0)}<span className="text-sm font-semibold text-slate-400"> / {Number(item.total_marks ?? 0)}</span></p>
                          <p className="text-xs font-bold text-teal-700">{formatPercent(item.percentage)}</p>
                        </div>
                        <button type="button" onClick={() => setSelected(item)} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-sky-900 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">{en ? 'View report' : 'रिपोर्ट देखें'}<ChevronRight size={16}/></button>
                      </div> : <a href={import.meta.env.BASE_URL + 'online-tests/'} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-sky-800 hover:bg-slate-50">{displayAttemptStatus(item, nowEpochMs) === 'in_progress' ? (en ? 'Open test' : 'टेस्ट खोलें') : (en ? 'View tests' : 'टेस्ट देखें')}<ArrowRight size={15}/></a>}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {selected && user && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/75 p-3 sm:p-6" onClick={() => setSelected(null)}>
            <div role="dialog" aria-modal="true" aria-label={en ? 'Smart Result Report Card' : 'स्मार्ट परिणाम पत्र'} onClick={(event) => event.stopPropagation()} className="my-auto w-full max-w-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-lg">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  {en ? 'Card design' : 'रिपोर्ट कार्ड थीम'}
                  <select value={cardTheme} onChange={(event) => setCardTheme(event.target.value as ResultReportTheme)} className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400">
                    <option value="modern">{en ? 'Modern' : 'मॉडर्न'}</option>
                    <option value="classic">{en ? 'Classic' : 'क्लासिक'}</option>
                    <option value="minimal">{en ? 'Minimal' : 'मिनिमल'}</option>
                  </select>
                </label>
                <button type="button" aria-label={en ? 'Close report' : 'रिपोर्ट बंद करें'} onClick={() => setSelected(null)} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-100"><X size={17}/>{en ? 'Close' : 'बंद करें'}</button>
              </div>
              <SmartResultReportCard data={resultCardData(selected)} onPrint={() => printResult(selected)}/>
               <a href={studyMaterialUrl(import.meta.env.BASE_URL, tests.find((test)=>test.id===selected.test_id))} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white p-3 text-sm font-extrabold text-sky-900 hover:bg-sky-50"><BookOpen size={17}/>{en ? 'Study related chapters' : 'संबंधित अध्याय पढ़ें'}<ArrowRight size={16}/></a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
