import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, ClipboardList, Users, Trophy, Clock3 } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import type { TestAttempt } from '../services/testService';

type TestInfo = { id: string; title: { en?: string; hi?: string } | string; class_level: string; subject: string };
type StudentInfo = { user_id: string; student_name: string; roll_no: string; class_level: string; school_name: string };

export const AdminTestResults: React.FC<{ demoMode?: boolean }> = ({ demoMode = false }) => {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [tests, setTests] = useState<TestInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [testFilter, setTestFilter] = useState('all');

  const load = useCallback(async () => {
    if (demoMode) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const client = requireSupabase();
      const [attemptResult, testResult, studentResult] = await Promise.all([
        client.from('test_attempts').select('id,student_id,test_id,attempt_number,status,started_at,expires_at,submitted_at,score,total_marks,percentage,correct_count,attempted_count').order('started_at', { ascending: false }).limit(1000),
        client.from('tests').select('id,title,class_level,subject').order('updated_at', { ascending: false }),
        client.from('student_profiles').select('user_id,student_name,roll_no,class_level,school_name'),
      ]);
      if (attemptResult.error) throw attemptResult.error;
      if (testResult.error) throw testResult.error;
      if (studentResult.error) throw studentResult.error;
      setAttempts((attemptResult.data ?? []) as TestAttempt[]);
      setTests((testResult.data ?? []) as TestInfo[]);
      setStudents((studentResult.data ?? []) as StudentInfo[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'परिणाम लोड नहीं हो सके।');
    } finally { setLoading(false); }
  }, [demoMode]);

  useEffect(() => { void load(); }, [load]);

  const testById = useMemo(() => new Map(tests.map(test => [test.id, test])), [tests]);
  const studentById = useMemo(() => new Map(students.map(student => [student.user_id, student])), [students]);
  const filtered = useMemo(() => attempts.filter(attempt => {
    const test = testById.get(attempt.test_id);
    const student = studentById.get(attempt.student_id);
    const text = [student?.student_name, student?.roll_no, student?.school_name, test?.subject, test?.class_level, test?.title && typeof test.title === 'object' ? test.title.hi : test?.title, test?.title && typeof test.title === 'object' ? test.title.en : ''].filter(Boolean).join(' ').toLowerCase();
    return (status === 'all' || attempt.status === status) && (testFilter === 'all' || attempt.test_id === testFilter) && (!query.trim() || text.includes(query.trim().toLowerCase()));
  }), [attempts, testById, studentById, status, testFilter, query]);

  const completed = attempts.filter(item => item.status === 'submitted');
  const average = completed.length ? Math.round(completed.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / completed.length) : 0;
  const titleOf = (test?: TestInfo) => !test ? 'टेस्ट उपलब्ध नहीं' : typeof test.title === 'string' ? test.title : test.title.hi || test.title.en || test.id;

  const exportCsv = () => {
    const escape = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
    const rows = [
      ['Student Name','Roll Number','Class','School','Test','Subject','Attempt','Status','Score','Total Marks','Percentage','Started At','Submitted At'],
      ...filtered.map(item => {
        const student = studentById.get(item.student_id);
        const test = testById.get(item.test_id);
        return [student?.student_name,student?.roll_no,student?.class_level,student?.school_name,titleOf(test),test?.subject,item.attempt_number,item.status,item.score,item.total_marks,item.percentage,item.started_at,item.submitted_at].map(escape);
      })
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(value => Array.isArray(value) ? value.join(',') : value).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'krishan-sir-test-results.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  if (demoMode) return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">Demo mode में live विद्यार्थी परिणाम नहीं दिखाए जाते।</section>;

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Assessment · Admin only</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">Results & Reports</h2><p className="mt-1 text-sm text-slate-500">विद्यार्थियों के टेस्ट प्रयास, स्कोर और परिणामों की सुरक्षित रिपोर्ट।</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"><RefreshCw className="h-4 w-4"/>{loading ? 'लोड…' : 'Refresh'}</button><button type="button" onClick={exportCsv} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-xl bg-[#082d65] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><Download className="h-4 w-4"/>Export CSV</button></div></div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[{label:'कुल प्रयास',value:attempts.length,icon:ClipboardList},{label:'पूर्ण परिणाम',value:completed.length,icon:Trophy},{label:'जारी प्रयास',value:attempts.filter(x=>x.status==='in_progress').length,icon:Clock3},{label:'औसत स्कोर',value:average+'%',icon:Users}].map(card=>{const Icon=card.icon;return <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{card.label}</span><Icon className="h-4 w-4 text-sky-800"/></div><p className="mt-3 text-2xl font-extrabold text-slate-900">{loading?'…':card.value}</p></div>;})}
    </div>
    <div className="grid gap-3 md:grid-cols-[1fr_190px_220px]">
      <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="विद्यार्थी, रोल नंबर, स्कूल या टेस्ट खोजें" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-400"/></label>
      <select value={status} onChange={event=>setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">सभी स्थितियाँ</option><option value="submitted">पूर्ण</option><option value="in_progress">जारी</option><option value="expired">समय समाप्त</option></select>
      <select value={testFilter} onChange={event=>setTestFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">सभी टेस्ट</option>{tests.map(test=><option key={test.id} value={test.id}>{titleOf(test)}</option>)}</select>
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h3 className="text-sm font-extrabold text-slate-900">Test Attempt Records</h3><p className="text-xs text-slate-500">अधिकतम नवीनतम 1,000 प्रयास</p></div><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">{filtered.length} रिकॉर्ड</span></div>
      {loading ? <p className="p-8 text-center text-sm text-slate-500">परिणाम लोड हो रहे हैं…</p> : filtered.length === 0 ? <div className="p-9 text-center"><ClipboardList className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 text-sm font-bold text-slate-700">अभी कोई परिणाम रिकॉर्ड उपलब्ध नहीं है</p><p className="mt-1 text-xs text-slate-500">टेस्ट प्रयास जमा होने के बाद रिपोर्ट यहाँ दिखाई देगी।</p></div> :
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['विद्यार्थी','टेस्ट','प्रयास','स्थिति','स्कोर','तिथि'].map(label=><th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(item=>{const student=studentById.get(item.student_id);const test=testById.get(item.test_id);return <tr key={item.id} className="hover:bg-slate-50/70"><td className="px-4 py-3"><p className="font-bold text-slate-800">{student?.student_name || 'विद्यार्थी विवरण उपलब्ध नहीं'}</p><p className="mt-1 text-[10px] text-slate-500">रोल: {student?.roll_no || '—'} · कक्षा {student?.class_level || '—'}</p></td><td className="px-4 py-3"><p className="font-semibold text-slate-800">{titleOf(test)}</p><p className="mt-1 text-[10px] text-slate-500">{test?.subject || '—'}</p></td><td className="px-4 py-3">{item.attempt_number}</td><td className="px-4 py-3"><span className={'rounded-full px-2.5 py-1 text-[10px] font-bold '+(item.status==='submitted'?'bg-emerald-50 text-emerald-700':item.status==='in_progress'?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-600')}>{item.status==='submitted'?'पूर्ण':item.status==='in_progress'?'जारी':'समय समाप्त'}</span></td><td className="px-4 py-3 font-extrabold text-slate-800">{item.status==='submitted'?<>{item.score ?? 0}/{item.total_marks ?? 0}<span className="ml-1 text-[10px] font-medium text-slate-500">({item.percentage ?? 0}%)</span></>:'—'}</td><td className="px-4 py-3 text-slate-600">{new Date(item.started_at).toLocaleString('hi-IN',{dateStyle:'medium',timeStyle:'short'})}</td></tr>;})}</tbody></table></div>}
    </div>
  </section>;
};
