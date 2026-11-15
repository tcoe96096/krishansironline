import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowRight, BarChart3, CalendarClock, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, ClipboardList, Download, Eye, FileBarChart2,
  FileDown, GraduationCap, LockKeyhole, Printer, RefreshCw, Search,
  ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp, Users, X
} from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import type { TestAttempt } from '../services/testService';
import { escapeSpreadsheetCell } from '../services/resultMetrics';
import { SmartResultReportCard, openSmartResultPrint } from './SmartResultReportCard';
import type { ResultReportTheme } from './SmartResultReportCard';

type TestInfo = { id: string; title: { en?: string; hi?: string } | string; class_level: string; subject: string };
type StudentInfo = { user_id: string; student_name: string; roll_no: string; class_level: string; school_name: string };
type Status = 'all' | 'submitted' | 'in_progress' | 'expired';
type Sort = 'latest' | 'highest' | 'lowest';
const PAGE_SIZE = 15;

const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
));
const validPct = (value: number | null) => Number.isFinite(Number(value)) ? Number(value ?? 0) : 0;

export const AdminTestResults: React.FC<{ demoMode?: boolean }> = ({ demoMode = false }) => {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [tests, setTests] = useState<TestInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [testFilter, setTestFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [sort, setSort] = useState<Sort>('latest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TestAttempt | null>(null);
  const [cardTheme, setCardTheme] = useState<ResultReportTheme>('modern');

  const load = useCallback(async () => {
    if (demoMode) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const client = requireSupabase();
      const [attemptResult, testResult, studentResult] = await Promise.all([
        client.from('test_attempts')
          .select('id,student_id,test_id,attempt_number,status,started_at,expires_at,submitted_at,score,total_marks,percentage,correct_count,attempted_count')
          .order('started_at', { ascending: false }).limit(1000),
        client.from('tests').select('id,title,class_level,subject').order('updated_at', { ascending: false }),
        client.from('student_profiles').select('user_id,student_name,roll_no,class_level,school_name')
      ]);
      if (attemptResult.error) throw attemptResult.error;
      if (testResult.error) throw testResult.error;
      if (studentResult.error) throw studentResult.error;
      setAttempts((attemptResult.data ?? []) as TestAttempt[]);
      setTests((testResult.data ?? []) as TestInfo[]);
      setStudents((studentResult.data ?? []) as StudentInfo[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'परिणाम लोड नहीं हो सके।');
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [query, status, testFilter, classFilter, sort]);

  const testById = useMemo(() => new Map(tests.map((test) => [test.id, test])), [tests]);
  const studentById = useMemo(() => new Map(students.map((student) => [student.user_id, student])), [students]);
  const titleOf = (test?: TestInfo): string => !test ? 'पुराना टेस्ट' :
    typeof test.title === 'string' ? test.title : (test.title.hi || test.title.en || test.id);
  const allClasses = useMemo(() => Array.from(new Set(tests.map((t) => t.class_level).concat(students.map((s) => s.class_level)))).filter(Boolean).sort(), [tests, students]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const collection = attempts.filter((attempt) => {
      const test = testById.get(attempt.test_id);
      const student = studentById.get(attempt.student_id);
      const searchable = [student?.student_name, student?.roll_no, student?.school_name,
        student?.class_level, test?.subject, titleOf(test), attempt.attempt_number]
        .filter((item) => item != null).join(' ').toLocaleLowerCase();
      return (status === 'all' || attempt.status === status) &&
        (testFilter === 'all' || attempt.test_id === testFilter) &&
        (classFilter === 'all' || student?.class_level === classFilter || test?.class_level === classFilter) &&
        (!normalized || searchable.includes(normalized));
    });
    if (sort === 'highest') collection.sort((a, b) => (b.status === 'submitted' ? validPct(b.percentage) : -1) - (a.status === 'submitted' ? validPct(a.percentage) : -1));
    if (sort === 'lowest') collection.sort((a, b) => (a.status === 'submitted' ? validPct(a.percentage) : 101) - (b.status === 'submitted' ? validPct(b.percentage) : 101));
    return collection;
  }, [attempts, testById, studentById, query, status, testFilter, classFilter, sort]);
  const completed = useMemo(() => attempts.filter((a) => a.status === 'submitted'), [attempts]);
  const average = completed.length ? completed.reduce((sum, a) => sum + validPct(a.percentage), 0) / completed.length : null;
  const best = completed.length ? Math.max(...completed.map((a) => validPct(a.percentage))) : null;
  const paginationCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const statusName = (value: TestAttempt['status']) => value === 'submitted' ? 'पूर्ण' : value === 'expired' ? 'समय समाप्त' : 'जारी';
  const statusBadge = (value: TestAttempt['status']) => value === 'submitted'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : value === 'in_progress' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-100 text-slate-600';
  const pctText = (value: number | null) => Number(value ?? 0).toFixed(1) + '%';
  const dateText = (value: string | null) => value ? new Date(value).toLocaleString('hi-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const exportCsv = () => {
    if (!filtered.length) return;
    const data = [
      ['Student Name','Roll Number','Class','School','Test','Subject','Attempt','Status','Score','Total Marks','Percentage','Started At','Submitted At'],
      ...filtered.map((attempt) => {
        const student = studentById.get(attempt.student_id);
        const test = testById.get(attempt.test_id);
        return [student?.student_name, student?.roll_no, student?.class_level, student?.school_name,
          titleOf(test), test?.subject, attempt.attempt_number, attempt.status,
          attempt.status === 'submitted' ? attempt.score : '', attempt.status === 'submitted' ? attempt.total_marks : '',
          attempt.status === 'submitted' ? attempt.percentage : '', attempt.started_at, attempt.submitted_at];
      })
    ];
    const csv = '\uFEFF' + data.map((row) => row.map(escapeSpreadsheetCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'krishan-sir-results-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const printReport = (rows: TestAttempt[]) => {
    if (!rows.length) return;
    const popup = window.open('', '_blank', 'width=1100,height=850');
    if (!popup) { setError('Print window blocked. कृपया Browser में Pop-ups Allow करें।'); return; }
    popup.opener = null;
    const body = rows.map((item) => {
      const student = studentById.get(item.student_id);
      const test = testById.get(item.test_id);
      const cells = [student?.student_name, student?.roll_no, student?.class_level, titleOf(test),
        item.attempt_number, statusName(item.status), item.status === 'submitted' ? item.score : '—',
        item.status === 'submitted' ? item.total_marks : '—',
        item.status === 'submitted' ? pctText(item.percentage) : '—', dateText(item.submitted_at || item.started_at)];
      return '<tr>' + cells.map((cell) => '<td>' + escapeHtml(cell) + '</td>').join('') + '</tr>';
    }).join('');
    const html = [
      '<!doctype html><html><head><meta charset="utf-8"><title>Krishan Sir - Assessment Report</title>',
      '<style>body{font:12px system-ui,Arial,sans-serif;padding:28px;color:#0b2545}',
      'h1{font-size:23px}p{color:#475569}table{width:100%;border-collapse:collapse;font-size:10px;margin-top:20px}',
      'th,td{padding:8px;border:1px solid #cbd5e1;text-align:left}th{background:#eaf4ff}',
      '@page{size:landscape;margin:15mm}</style></head><body>',
      '<h1>Krishan Sir Online — Assessment Results</h1>',
      '<p>Generated: ', escapeHtml(new Date().toLocaleString('en-IN')), ' · Displayed records: ', rows.length,
      ' · Admin-only report · Submitted scores are server recorded</p>',
      '<table><thead><tr>', ['Student','Roll','Class','Test','Attempt','Status','Score','Total','%','Date'].map((label) => '<th>' + label + '</th>').join(''),
      '</tr></thead><tbody>', body, '</tbody></table>',
      '<script>window.onload=function(){window.print();};<\/script></body></html>'
    ].join('');
    popup.document.write(html);
    popup.document.close();
  };

  const testPerformance = useMemo(() => {
    const groups = new Map<string, { test: string; sum: number; count: number }>();
    completed.forEach((attempt) => {
      const previous = groups.get(attempt.test_id) || { test: titleOf(testById.get(attempt.test_id)), sum: 0, count: 0 };
      previous.sum += validPct(attempt.percentage);
      previous.count += 1;
      groups.set(attempt.test_id, previous);
    });
    return Array.from(groups.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [completed, testById]);

  if (demoMode) return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50 p-7 text-sm text-sky-900">
      <LockKeyhole size={27}/><h2 className="mt-3 text-xl font-extrabold">Result Management — Protected Preview</h2>
      <p className="mt-2">Demo mode में वास्तविक विद्यार्थी डेटा नहीं दिखाया जाता। Admin Login के बाद अधिकृत Result Dashboard खुलेगा।</p>
    </section>
  );

  return (
    <section className="space-y-6 pb-12">
      <div className="overflow-hidden rounded-[26px] bg-gradient-to-br from-[#061f47] via-[#0b3b75] to-[#087b8a] p-6 text-white shadow-lg shadow-slate-900/10 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-extrabold tracking-wider text-cyan-100"><Sparkles size={14}/> KRISHAN SIR • ADMIN INTELLIGENCE</p>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Smart Results & Reports</h2>
            <p className="mt-2 text-sm leading-6 text-sky-100">सुरक्षित विद्यार्थी परिणाम, परीक्षा-वार विश्लेषण, स्मार्ट फ़िल्टर और Report Export के लिए नया Admin Control Centre।</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-3"><ShieldCheck size={25} aria-label="Admin restricted"/></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold">SERVER-VERIFIED SCORES</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold">ADMIN-ONLY</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold">READ-ONLY RECORDS</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-lg font-extrabold text-slate-900">Assessment Overview</h3><p className="text-xs text-slate-500">आँकड़े लोड हुए अधिकतम 1,000 नवीनतम प्रयासों पर आधारित हैं।</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>{loading ? 'Loading…' : 'Refresh Data'}</button>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">{error}</p>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'कुल प्रयास', value: attempts.length, icon: ClipboardList, accent: 'bg-sky-50 text-sky-800' },
          { label: 'पूर्ण परिणाम', value: completed.length, icon: CheckCircle2, accent: 'bg-emerald-50 text-emerald-800' },
          { label: 'औसत स्कोर', value: average === null ? '—' : pctText(average), icon: Activity, accent: 'bg-teal-50 text-teal-800' },
          { label: 'सर्वश्रेष्ठ स्कोर', value: best === null ? '—' : pctText(best), icon: TrendingUp, accent: 'bg-amber-50 text-amber-800' }
        ].map(({ label, value, icon: Icon, accent }) =>
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <span className={'flex h-10 w-10 items-center justify-center rounded-xl ' + accent}><Icon size={20}/></span>
            <p className="mt-4 text-2xl font-extrabold tabular-nums text-slate-900">{loading ? '…' : value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
          </div>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(275px,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between"><h3 className="text-base font-extrabold text-slate-900">Test Performance Overview</h3><BarChart3 className="text-sky-800" size={20}/></div>
          <p className="mt-1 text-xs text-slate-500">सबसे अधिक Attempt हुए 5 Tests का औसत प्रतिशत। यह पूरे प्लेटफॉर्म की Ranking नहीं है।</p>
          <div className="mt-5 space-y-4">
            {testPerformance.length ? testPerformance.map((entry) => {
              const avg = entry.sum / entry.count;
              return <div key={entry.test}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-slate-700">{entry.test}</span><span className="shrink-0 font-extrabold text-sky-900">{pctText(avg)} · {entry.count} attempts</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div style={{ width: Math.max(0, Math.min(100, avg)) + '%' }} className="h-full rounded-full bg-gradient-to-r from-sky-800 to-teal-400"/></div>
              </div>;
            }) : <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">पूर्ण परिणाम उपलब्ध होने पर वास्तविक ग्राफ दिखाई देगा।</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between"><h3 className="text-base font-extrabold text-slate-900">Attempt Lifecycle</h3><CalendarClock size={20} className="text-sky-800"/></div>
          <p className="mt-1 text-xs text-slate-500">Database में दर्ज वास्तविक Attempt Status।</p>
          <div className="mt-5 space-y-4">
            {[
              { label: 'Submitted', count: completed.length, cls: 'bg-emerald-500' },
              { label: 'In progress', count: attempts.filter((a) => a.status === 'in_progress').length, cls: 'bg-amber-400' },
              { label: 'Expired', count: attempts.filter((a) => a.status === 'expired').length, cls: 'bg-slate-400' }
            ].map((item) => <div key={item.label}>
              <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700"><span>{item.label}</span><span>{item.count}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={'h-full rounded-full ' + item.cls} style={{width: attempts.length ? (item.count / attempts.length * 100) + '%' : '0%'}}/></div>
            </div>)}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-teal-700"><SlidersHorizontal size={14}/> RESULT MANAGEMENT</p>
            <h3 className="mt-1 text-lg font-extrabold text-slate-900">Student Result Records</h3>
            <p className="mt-1 text-xs text-slate-500">रोल नंबर, स्कूल, कक्षा, टेस्ट और Score से खोजें। कोई Result अपने आप Modify नहीं होगा।</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!filtered.length} onClick={exportCsv} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-900 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-50"><Download size={16}/> Export CSV</button>
            <button type="button" disabled={!filtered.length} onClick={() => printReport(filtered)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"><Printer size={16}/> Print / PDF</button>
          </div>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(190px,1fr)_170px_150px_190px_130px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"/>
            <span className="sr-only">Search results</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="विद्यार्थी, रोल, स्कूल, टेस्ट…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"/>
          </label>
          <label><span className="sr-only">Result status</span><select value={status} onChange={(event) => setStatus(event.target.value as Status)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"><option value="all">सभी स्थितियाँ</option><option value="submitted">पूर्ण</option><option value="in_progress">जारी</option><option value="expired">समय समाप्त</option></select></label>
          <label><span className="sr-only">Class filter</span><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"><option value="all">सभी कक्षाएँ</option>{allClasses.map((c) => <option key={c} value={c}>कक्षा {c}</option>)}</select></label>
          <label><span className="sr-only">Test filter</span><select value={testFilter} onChange={(event) => setTestFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"><option value="all">सभी टेस्ट</option>{tests.map((test) => <option key={test.id} value={test.id}>{titleOf(test)}</option>)}</select></label>
          <label><span className="sr-only">Sort results</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"><option value="latest">नवीनतम</option><option value="highest">अधिक अंक</option><option value="lowest">कम अंक</option></select></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{filtered.length} matching records · latest 1,000 loaded maximum</span>
          {(query || status !== 'all' || classFilter !== 'all' || testFilter !== 'all' || sort !== 'latest') &&
            <button type="button" onClick={() => { setQuery(''); setStatus('all'); setClassFilter('all'); setTestFilter('all'); setSort('latest'); }} className="font-bold text-sky-800 underline hover:text-sky-900">Clear filters</button>}
        </div>

        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[750px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>{['विद्यार्थी', 'परीक्षा', 'स्थिति', 'स्कोर', 'दिनांक', 'विवरण'].map((label) => <th key={label} scope="col" className="px-4 py-3 font-extrabold">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">परिणाम लोड हो रहे हैं…</td></tr>
              : visible.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">कोई परिणाम उपलब्ध नहीं है। दूसरे फ़िल्टर से खोजें।</td></tr>
              : visible.map((attempt) => {
                const student = studentById.get(attempt.student_id);
                const test = testById.get(attempt.test_id);
                return <tr key={attempt.id} className="transition hover:bg-sky-50/50">
                  <td className="px-4 py-3"><p className="font-bold text-slate-900">{student?.student_name || 'विद्यार्थी विवरण अनुपलब्ध'}</p><p className="mt-1 text-[11px] text-slate-500">रोल: {student?.roll_no || '—'} · कक्षा {student?.class_level || '—'}</p></td>
                  <td className="px-4 py-3"><p className="max-w-[240px] truncate font-bold text-slate-800" title={titleOf(test)}>{titleOf(test)}</p><p className="mt-1 text-[11px] text-slate-500">{test?.subject || '—'} · Attempt #{attempt.attempt_number}</p></td>
                  <td className="px-4 py-3"><span className={'inline-flex rounded-full border px-2 py-1 font-bold ' + statusBadge(attempt.status)}>{statusName(attempt.status)}</span></td>
                  <td className="px-4 py-3 font-extrabold tabular-nums text-slate-900">{attempt.status === 'submitted' ? <>{attempt.score ?? 0}/{attempt.total_marks ?? 0}<p className="mt-1 text-[11px] font-semibold text-teal-700">{pctText(attempt.percentage)}</p></> : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{dateText(attempt.submitted_at || attempt.started_at)}</td>
                  <td className="px-4 py-3"><button type="button" onClick={() => setSelected(attempt)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-sky-800 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700"><Eye size={14}/> View</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))} className="rounded-lg border border-slate-200 p-2 text-slate-700 disabled:opacity-40"><ChevronLeft size={17}/></button>
            <span className="font-semibold">Page {page} / {paginationCount}</span>
            <button type="button" aria-label="Next page" disabled={page >= paginationCount} onClick={() => setPage((n) => Math.min(paginationCount, n + 1))} className="rounded-lg border border-slate-200 p-2 text-slate-700 disabled:opacity-40"><ChevronRight size={17}/></button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <div className="flex gap-3"><ShieldCheck size={20} className="shrink-0 text-sky-800"/><div><h4 className="text-sm font-extrabold text-sky-950">Result Data Protection</h4><p className="mt-1 text-xs leading-5 text-sky-900">यह Stage A Dashboard केवल अधिकृत Records पढ़ता है। अंक बदलना, Result Approve/Release करना, Rank बनाना या Student Data Delete करना इसमें उपलब्ध नहीं है। इन कार्यों का अलग सत्यापित Workflow अगले Stage में बनेगा।</p></div></div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/75 p-3 sm:p-6" onClick={() => setSelected(null)}>
          <div role="dialog" aria-modal="true" aria-label="Student result details" onClick={(event) => event.stopPropagation()} className="my-auto w-full max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-lg">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                Report Theme
                <select value={cardTheme} onChange={(event) => setCardTheme(event.target.value as ResultReportTheme)} className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2 text-xs">
                  <option value="modern">Modern Digital</option>
                  <option value="classic">Classic Academic</option>
                  <option value="minimal">Minimal Pro</option>
                </select>
              </label>
              <button type="button" onClick={() => setSelected(null)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><X size={17}/> Close</button>
            </div>
            {selected.status === 'submitted' ? (
              <SmartResultReportCard
                data={{
                  attempt: selected,
                  title: titleOf(testById.get(selected.test_id)),
                  subject: testById.get(selected.test_id)?.subject,
                  student: {
                    name: studentById.get(selected.student_id)?.student_name || 'विद्यार्थी',
                    rollNo: studentById.get(selected.student_id)?.roll_no,
                    classLevel: studentById.get(selected.student_id)?.class_level,
                    school: studentById.get(selected.student_id)?.school_name
                  },
                  theme: cardTheme
                }}
                onPrint={() => {
                  const student = studentById.get(selected.student_id);
                  if (!openSmartResultPrint({
                    attempt: selected, title: titleOf(testById.get(selected.test_id)),
                    subject: testById.get(selected.test_id)?.subject,
                    student: {
                      name: student?.student_name || 'विद्यार्थी', rollNo: student?.roll_no,
                      classLevel: student?.class_level, school: student?.school_name
                    }, theme: cardTheme
                  })) setError('Print window blocked. कृपया Pop-ups Allow करें।');
                }}
              />
            ) : (
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <h3 className="text-lg font-extrabold text-slate-900">{titleOf(testById.get(selected.test_id))}</h3>
                <p className="mt-3 text-sm text-slate-600">Result status: <strong>{statusName(selected.status)}</strong></p>
                <p className="mt-2 text-xs text-slate-500">इस प्रयास का पूरा परिणाम अभी नहीं है। बिना Submit के कोई अंक या Result Card तैयार नहीं किया जाएगा।</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
