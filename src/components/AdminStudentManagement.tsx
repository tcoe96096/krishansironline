import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowUpRight, BookOpen, CalendarDays, ChevronDown,
  ClipboardList, Download, Eye, GraduationCap, Loader2, MapPin, Pencil,
  RefreshCw, Save, Search, Trophy, Users, X,
} from 'lucide-react';
import { requireSupabase } from '../lib/supabase';

type StudentRecord = {
  user_id: string;
  student_name: string;
  class_level: string;
  roll_no: string;
  school_name: string;
  created_at: string;
  updated_at?: string;
  country?: string | null;
  state?: string | null;
  district?: string | null;
  area_type?: string | null;
  locality_name?: string | null;
  pin_code?: string | null;
};

type TestAttempt = {
  id: string;
  student_id: string;
  test_id: string;
  attempt_number: number;
  status: 'in_progress' | 'submitted' | 'expired';
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_marks: number | null;
  percentage: number | null;
  correct_count: number | null;
  attempted_count: number | null;
};

type TestInfo = {
  id: string;
  title: { en?: string; hi?: string } | string;
  class_level: string;
  subject: string;
  chapter: string;
};

type LearningProgress = {
  id: string;
  material_id: string;
  class_level: string;
  subject: string;
  chapter_title: string;
  progress_percent: number;
  last_opened_at: string;
  completed_at: string | null;
};

type ProfileForm = {
  student_name: string;
  class_level: string;
  roll_no: string;
  school_name: string;
  country: string;
  state: string;
  district: string;
  area_type: string;
  locality_name: string;
  pin_code: string;
};

type DetailTab = 'overview' | 'tests' | 'learning';

const PAGE_SIZE = 50;
const CLASSES = ['6', '7', '8', '9', '10', '11', '12'];

const dateLabel = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const profileToForm = (student: StudentRecord): ProfileForm => ({
  student_name: student.student_name || '',
  class_level: student.class_level || '6',
  roll_no: student.roll_no || '',
  school_name: student.school_name || '',
  country: student.country || 'India',
  state: student.state || '',
  district: student.district || '',
  area_type: student.area_type || '',
  locality_name: student.locality_name || '',
  pin_code: student.pin_code || '',
});

const testTitle = (test?: TestInfo) => {
  if (!test) return 'टेस्ट विवरण उपलब्ध नहीं';
  return typeof test.title === 'string' ? test.title : test.title.hi || test.title.en || test.id;
};

const csvCell = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"';

export const AdminStudentManagement: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [tests, setTests] = useState<TestInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [studentAttempts, setStudentAttempts] = useState<TestAttempt[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [saving, setSaving] = useState(false);

  const loadStudents = useCallback(async (offset = 0) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const client = requireSupabase();
      const { data, error: queryError, count } = await client
        .from('student_profiles')
        .select('user_id,student_name,class_level,roll_no,school_name,created_at,updated_at,country,state,district,area_type,locality_name,pin_code', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (queryError) throw queryError;
      const rows = (data ?? []) as StudentRecord[];
      setStudents(current => offset === 0 ? rows : [...current, ...rows]);
      setTotalStudents(count ?? rows.length);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'विद्यार्थियों का डेटा लोड नहीं हो सका।');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadInsights = useCallback(async () => {
    try {
      const client = requireSupabase();
      const [attemptResult, testResult] = await Promise.all([
        client.from('test_attempts')
          .select('id,student_id,test_id,attempt_number,status,started_at,submitted_at,score,total_marks,percentage,correct_count,attempted_count')
          .order('started_at', { ascending: false }).limit(1000),
        client.from('tests').select('id,title,class_level,subject,chapter').order('updated_at', { ascending: false }),
      ]);
      if (attemptResult.error) throw attemptResult.error;
      if (testResult.error) throw testResult.error;
      setAttempts((attemptResult.data ?? []) as TestAttempt[]);
      setTests((testResult.data ?? []) as TestInfo[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'टेस्ट आँकड़े लोड नहीं हो सके।');
    }
  }, []);

  useEffect(() => {
    void loadStudents(0);
    void loadInsights();
  }, [loadStudents, loadInsights]);

  const filteredStudents = useMemo(() => students.filter(student => {
    const matchesClass = classFilter === 'all' || student.class_level === classFilter;
    const matchesDistrict = districtFilter === 'all' || (student.district || 'Not provided') === districtFilter;
    const term = search.trim().toLowerCase();
    const haystack = [
      student.student_name, student.roll_no, student.school_name, student.user_id,
      student.district, student.state, student.locality_name, student.pin_code,
    ].filter(Boolean).join(' ').toLowerCase();
    return matchesClass && matchesDistrict && (!term || haystack.includes(term));
  }), [students, classFilter, districtFilter, search]);

  const districts = useMemo(() => [...new Set(students.map(s => s.district || 'Not provided'))].sort(), [students]);
  const classCounts = useMemo(() => students.reduce<Record<string, number>>((counts, student) => {
    counts[student.class_level] = (counts[student.class_level] ?? 0) + 1;
    return counts;
  }, {}), [students]);
  const completedAttempts = attempts.filter(item => item.status === 'submitted');
  const averageScore = completedAttempts.length
    ? Math.round(completedAttempts.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / completedAttempts.length)
    : 0;
  const testById = useMemo(() => new Map(tests.map(test => [test.id, test])), [tests]);

  const exportCsv = () => {
    const header = ['Student Name', 'Class', 'Roll Number', 'School', 'District', 'State', 'Locality', 'PIN Code', 'Registered At', 'Student ID'];
    const rows = filteredStudents.map(student => [
      student.student_name, student.class_level, student.roll_no, student.school_name,
      student.district, student.state, student.locality_name, student.pin_code,
      student.created_at, student.user_id,
    ]);
    const csv = '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'krishan-sir-student-records.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openStudent = async (student: StudentRecord) => {
    setSelectedStudent(student);
    setForm(profileToForm(student));
    setDetailTab('overview');
    setEditing(false);
    setDetailLoading(true);
    setDetailError('');
    setStudentAttempts([]);
    setLearningProgress([]);
    try {
      const client = requireSupabase();
      const [attemptResult, progressResult] = await Promise.all([
        client.from('test_attempts')
          .select('id,student_id,test_id,attempt_number,status,started_at,submitted_at,score,total_marks,percentage,correct_count,attempted_count')
          .eq('student_id', student.user_id)
          .order('started_at', { ascending: false }).limit(200),
        client.from('student_learning_progress')
          .select('id,material_id,class_level,subject,chapter_title,progress_percent,last_opened_at,completed_at')
          .eq('student_id', student.user_id)
          .order('last_opened_at', { ascending: false }).limit(200),
      ]);
      if (attemptResult.error) throw attemptResult.error;
      if (progressResult.error) throw progressResult.error;
      setStudentAttempts((attemptResult.data ?? []) as TestAttempt[]);
      setLearningProgress((progressResult.data ?? []) as LearningProgress[]);
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'विद्यार्थी की गतिविधि लोड नहीं हो सकी।');
    } finally {
      setDetailLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!selectedStudent || !form) return;
    if (!form.student_name.trim() || !form.roll_no.trim() || !form.school_name.trim()) {
      setDetailError('नाम, रोल नंबर और स्कूल का नाम आवश्यक है।');
      return;
    }
    if (form.pin_code && !/^\d{6}$/.test(form.pin_code)) {
      setDetailError('PIN Code 6 अंकों का होना चाहिए।');
      return;
    }
    setSaving(true);
    setDetailError('');
    try {
      const client = requireSupabase();
      const updates = {
        student_name: form.student_name.trim(),
        class_level: form.class_level,
        roll_no: form.roll_no.trim(),
        school_name: form.school_name.trim(),
        country: form.country.trim() || 'India',
        state: form.state.trim() || null,
        district: form.district.trim() || null,
        area_type: form.area_type || null,
        locality_name: form.locality_name.trim() || null,
        pin_code: form.pin_code.trim() || null,
      };
      const { data, error: updateError } = await client.from('student_profiles')
        .update(updates).eq('user_id', selectedStudent.user_id)
        .select('user_id,student_name,class_level,roll_no,school_name,created_at,updated_at,country,state,district,area_type,locality_name,pin_code')
        .single();
      if (updateError) throw updateError;
      const updated = data as StudentRecord;
      setStudents(current => current.map(item => item.user_id === updated.user_id ? updated : item));
      setSelectedStudent(updated);
      setForm(profileToForm(updated));
      setEditing(false);
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'प्रोफाइल अपडेट नहीं हो सकी।');
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (key: keyof ProfileForm, value: string) => {
    setForm(current => current ? { ...current, [key]: value } : current);
  };

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071f49] via-[#0b3974] to-[#146b91] p-5 text-white shadow-lg sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[32px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-28 right-1/4 h-56 w-56 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-cyan-100">
              <GraduationCap className="h-3.5 w-3.5" /> PRO STUDENT INTELLIGENCE
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Pro Student Management</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">विद्यार्थियों की प्रोफाइल, कक्षा-वार आँकड़े, परीक्षा प्रदर्शन और अध्ययन प्रगति — एकीकृत Pro Workspace में।</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { void loadStudents(0); void loadInsights(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
            </button>
            <button type="button" onClick={exportCsv} disabled={!filteredStudents.length} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-[#082d65] transition hover:bg-cyan-50 disabled:opacity-50">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'कुल विद्यार्थी', value: totalStudents, note: 'Registered profiles', icon: Users },
            { label: 'कुल टेस्ट प्रयास', value: attempts.length, note: 'Latest 1,000 attempts', icon: ClipboardList },
            { label: 'पूर्ण टेस्ट', value: completedAttempts.length, note: 'Submitted attempts', icon: Trophy },
            { label: 'औसत प्रदर्शन', value: averageScore + '%', note: 'Submitted test average', icon: Activity },
          ].map(card => {
            const Icon = card.icon;
            return <div key={card.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-blue-100">{card.label}</span><Icon className="h-4 w-4 text-cyan-200" /></div>
              <p className="mt-3 text-2xl font-extrabold tabular-nums">{loading ? '…' : card.value}</p>
              <p className="mt-1 text-[10px] text-blue-200">{card.note}</p>
            </div>;
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="text-sm font-extrabold text-slate-900">Class Intelligence</h3><p className="mt-1 text-xs text-slate-500">लोड किए गए रिकॉर्ड के अनुसार कक्षा-वार संख्या</p></div>
            <GraduationCap className="h-5 w-5 text-sky-800" />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {CLASSES.map(level => <button key={level} type="button" onClick={() => setClassFilter(classFilter === level ? 'all' : level)} className={`rounded-xl border px-2 py-3 text-center transition ${classFilter === level ? 'border-sky-800 bg-sky-900 text-white' : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-sky-200 hover:bg-sky-50'}`}>
              <span className="block text-[10px] font-semibold opacity-75">Class</span><span className="mt-1 block text-lg font-extrabold">{level}</span><span className="mt-1 block text-[10px] font-bold">{classCounts[level] || 0}</span>
            </button>)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-sky-800" /><h3 className="text-sm font-extrabold text-slate-900">Student Location Insights</h3></div>
          <p className="mt-1 text-xs text-slate-500">विद्यार्थियों के उपलब्ध पते के अनुसार</p>
          <div className="mt-4 flex items-end justify-between"><div><p className="text-2xl font-extrabold text-slate-900">{districts.filter(d => d !== 'Not provided').length}</p><p className="text-[10px] text-slate-500">Districts represented in loaded records</p></div><div className="rounded-xl bg-sky-50 p-3 text-sky-900"><MapPin className="h-5 w-5" /></div></div>
        </div>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div><h3 className="text-sm font-extrabold text-slate-900">Student Directory</h3><p className="mt-1 text-xs text-slate-500">प्रोफाइल, टेस्ट प्रदर्शन और अध्ययन प्रगति देखने के लिए View Details चुनें।</p></div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500"><span className="rounded-lg bg-slate-100 px-3 py-2">{filteredStudents.length} shown</span><span className="rounded-lg bg-slate-100 px-3 py-2">{students.length} loaded / {totalStudents} total</span></div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_170px_190px]">
          <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="नाम, रोल नंबर, स्कूल, जिला या Student ID खोजें" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100" /></label>
          <label className="relative"><select value={classFilter} onChange={event => setClassFilter(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 pr-9 text-sm font-semibold text-slate-700"><option value="all">सभी कक्षाएँ</option>{CLASSES.map(level => <option key={level} value={level}>Class {level}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></label>
          <label className="relative"><select value={districtFilter} onChange={event => setDistrictFilter(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 pr-9 text-sm font-semibold text-slate-700"><option value="all">सभी जिले</option>{districts.map(district => <option key={district} value={district}>{district}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></label>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
          {loading ? <div className="p-12 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-sky-700" />विद्यार्थियों का रिकॉर्ड लोड हो रहा है…</div>
            : filteredStudents.length === 0 ? <div className="p-12 text-center"><Users className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">कोई विद्यार्थी रिकॉर्ड नहीं मिला</p><p className="mt-1 text-xs text-slate-500">Search या filters बदलकर देखें।</p></div>
            : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-bold">Student</th><th className="px-4 py-3 font-bold">Class / Roll</th><th className="px-4 py-3 font-bold">School</th><th className="px-4 py-3 font-bold">Location</th><th className="px-4 py-3 font-bold">Registered</th><th className="px-4 py-3 text-right font-bold">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{filteredStudents.map(student => <tr key={student.user_id} className="transition hover:bg-sky-50/50">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 text-xs font-extrabold text-sky-900">{student.student_name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()}</span><span className="min-w-0"><span className="block max-w-[210px] truncate font-bold text-slate-800">{student.student_name}</span><span className="mt-1 block max-w-[190px] truncate font-mono text-[9px] text-slate-400">{student.user_id}</span></span></div></td>
                <td className="px-4 py-3"><span className="rounded-lg bg-sky-50 px-2 py-1 font-bold text-sky-900">Class {student.class_level}</span><p className="mt-2 text-[10px] text-slate-500">Roll: {student.roll_no}</p></td>
                <td className="max-w-[190px] truncate px-4 py-3 font-medium text-slate-700" title={student.school_name}>{student.school_name}</td>
                <td className="px-4 py-3 text-slate-600">{[student.district, student.state].filter(Boolean).join(', ') || '—'}<p className="mt-1 text-[10px] text-slate-400">{student.locality_name || 'Location not provided'}</p></td>
                <td className="px-4 py-3 text-slate-500">{dateLabel(student.created_at)}</td>
                <td className="px-4 py-3 text-right"><button type="button" onClick={() => void openStudent(student)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-[10px] font-extrabold text-sky-900 transition hover:border-sky-300 hover:bg-sky-100"><Eye className="h-3.5 w-3.5" /> View Details <ArrowUpRight className="h-3 w-3" /></button></td>
              </tr>)}</tbody>
            </table></div>}
          {!loading && students.length < totalStudents && <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => void loadStudents(students.length)} disabled={loadingMore} className="inline-flex items-center gap-2 rounded-xl bg-[#082d65] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-sky-900 disabled:opacity-50">{loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{loadingMore ? 'Loading…' : 'Load More Students'}</button></div>}
        </div>
      </div>

      {selectedStudent && <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/50 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedStudent(null); }}>
        <aside className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-[#f7f9fc] shadow-2xl">
          <div className="relative shrink-0 bg-gradient-to-r from-[#082d65] to-[#0e668d] px-5 py-5 text-white sm:px-7">
            <button type="button" onClick={() => setSelectedStudent(null)} aria-label="Close student details" className="absolute right-4 top-4 rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white"><X className="h-5 w-5" /></button>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-100">Student Profile</p>
            <h3 className="mt-2 pr-10 text-xl font-extrabold">{selectedStudent.student_name}</h3>
            <p className="mt-1 text-xs text-blue-100">Class {selectedStudent.class_level} · Roll No. {selectedStudent.roll_no}</p>
            <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold">{selectedStudent.school_name}</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold">Registered {dateLabel(selectedStudent.created_at)}</span></div>
          </div>
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 pt-2 sm:px-6">
            {([{id:'overview',label:'Profile',icon:Users},{id:'tests',label:'Test History',icon:ClipboardList},{id:'learning',label:'Learning Progress',icon:BookOpen}] as const).map(tab => { const Icon = tab.icon; return <button key={tab.id} type="button" onClick={() => { setDetailTab(tab.id); setEditing(false); }} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-bold transition ${detailTab === tab.id ? 'border-sky-800 text-sky-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Icon className="h-4 w-4" />{tab.label}</button>; })}
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {detailError && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="h-4 w-4 shrink-0" />{detailError}</div>}
            {detailLoading ? <div className="grid min-h-[220px] place-items-center text-sm text-slate-500"><span><Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-sky-700" />विद्यार्थी गतिविधि लोड हो रही है…</span></div>
              : detailTab === 'overview' ? <div className="space-y-4">
                <div className="flex items-center justify-between"><div><h4 className="text-sm font-extrabold text-slate-900">Personal & Academic Details</h4><p className="mt-1 text-xs text-slate-500">मौजूदा Student Profile रिकॉर्ड</p></div><button type="button" onClick={() => { setEditing(value => !value); setDetailError(''); setForm(profileToForm(selectedStudent)); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" />{editing ? 'Cancel Edit' : 'Edit Profile'}</button></div>
                {editing && form ? <div className="grid gap-3 rounded-2xl border border-sky-100 bg-white p-4 sm:grid-cols-2">
                  {([{key:'student_name',label:'Student Name'},{key:'roll_no',label:'Roll Number'},{key:'school_name',label:'School Name'},{key:'country',label:'Country'},{key:'state',label:'State'},{key:'district',label:'District'},{key:'locality_name',label:'Village / City / Locality'},{key:'pin_code',label:'PIN Code'}] as const).map(field => <label key={field.key} className="block"><span className="mb-1.5 block text-[10px] font-bold text-slate-600">{field.label}</span><input value={form[field.key]} onChange={event => updateForm(field.key, event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-sky-500" /></label>)}
                  <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-slate-600">Class</span><select value={form.class_level} onChange={event => updateForm('class_level', event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">{CLASSES.map(level => <option key={level} value={level}>Class {level}</option>)}</select></label>
                  <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-slate-600">Area Type</span><select value={form.area_type} onChange={event => updateForm('area_type', event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs"><option value="">Not specified</option><option value="village">Village</option><option value="city">City</option><option value="town">Town</option><option value="other">Other</option></select></label>
                  <div className="flex flex-wrap gap-2 pt-2 sm:col-span-2"><button type="button" onClick={() => void saveProfile()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#082d65] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Profile</button><button type="button" onClick={() => { setEditing(false); setForm(profileToForm(selectedStudent)); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button></div>
                </div> : <div className="grid gap-3 sm:grid-cols-2">
                  {[{label:'Student Name',value:selectedStudent.student_name},{label:'Class',value:'Class '+selectedStudent.class_level},{label:'Roll Number',value:selectedStudent.roll_no},{label:'School',value:selectedStudent.school_name},{label:'Country',value:selectedStudent.country},{label:'State',value:selectedStudent.state},{label:'District',value:selectedStudent.district},{label:'Area Type',value:selectedStudent.area_type},{label:'Locality',value:selectedStudent.locality_name},{label:'PIN Code',value:selectedStudent.pin_code},{label:'Registered On',value:dateLabel(selectedStudent.created_at)},{label:'Last Profile Update',value:dateLabel(selectedStudent.updated_at)}].map(item => <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-semibold text-slate-400">{item.label}</p><p className="mt-1 break-words text-xs font-bold text-slate-800">{item.value || 'Not provided'}</p></div>)}
                </div>}
                <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student ID</p><p className="mt-2 break-all font-mono text-[10px] text-slate-600">{selectedStudent.user_id}</p></div>
              </div>
              : detailTab === 'tests' ? <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">{[{label:'Total Attempts',value:studentAttempts.length},{label:'Submitted',value:studentAttempts.filter(a => a.status === 'submitted').length},{label:'Average',value:(studentAttempts.filter(a => a.status === 'submitted').length ? Math.round(studentAttempts.filter(a => a.status === 'submitted').reduce((sum,a) => sum + Number(a.percentage || 0),0) / studentAttempts.filter(a => a.status === 'submitted').length) : 0)+'%'}].map(item => <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] text-slate-500">{item.label}</p><p className="mt-1 text-lg font-extrabold text-slate-900">{item.value}</p></div>)}</div>
                {studentAttempts.length ? studentAttempts.map(attempt => { const test = testById.get(attempt.test_id); return <div key={attempt.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-extrabold text-slate-800">{testTitle(test)}</p><p className="mt-1 text-[10px] text-slate-500">{test?.subject || '—'} · Class {test?.class_level || selectedStudent.class_level} · {test?.chapter || '—'}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold ${attempt.status === 'submitted' ? 'bg-emerald-50 text-emerald-700' : attempt.status === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{attempt.status === 'submitted' ? 'Submitted' : attempt.status === 'in_progress' ? 'In Progress' : 'Expired'}</span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px] text-slate-500"><span>Attempt #{attempt.attempt_number} · {dateLabel(attempt.started_at)}</span><span className="font-extrabold text-slate-800">{attempt.status === 'submitted' ? `${attempt.score ?? 0} / ${attempt.total_marks ?? 0} · ${attempt.percentage ?? 0}%` : 'Result pending'}</span></div></div>; }) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><ClipboardList className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">अभी कोई टेस्ट प्रयास उपलब्ध नहीं है</p></div>}
              </div>
              : <div className="space-y-3">
                {learningProgress.length ? learningProgress.map(progress => <div key={progress.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold text-slate-800">{progress.chapter_title || progress.material_id}</p><p className="mt-1 text-[10px] text-slate-500">{progress.subject} · Class {progress.class_level}</p></div><span className="text-sm font-extrabold text-sky-900">{progress.progress_percent}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-sky-700 to-cyan-500" style={{ width: `${Math.max(0, Math.min(100, progress.progress_percent))}%` }} /></div><p className="mt-2 text-[10px] text-slate-400">{progress.completed_at ? 'Completed ' + dateLabel(progress.completed_at) : 'Last opened ' + dateLabel(progress.last_opened_at)}</p></div>) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">Learning Progress अभी उपलब्ध नहीं है</p><p className="mt-1 text-xs text-slate-500">जब विद्यार्थी study material पर progress save करेंगे, विवरण यहाँ दिखेगा।</p></div>}
              </div>}
          </div>
          <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 text-[10px] text-slate-400 sm:px-6">Student profile, test attempts और learning progress — Supabase live records</div>
        </aside>
      </div>}
    </section>
  );
};
