import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { requireSupabase } from '../lib/supabase';
import { AlertCircle, RefreshCw, Search, Users, ChevronDown, GraduationCap } from 'lucide-react';

type StudentRecord = {
  user_id: string;
  student_name: string;
  class_level: string;
  roll_no: string;
  school_name: string;
  created_at: string;
};

const PAGE_SIZE = 50;

export const AdminStudentManagement: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [hasMore, setHasMore] = useState(false);

  const loadStudents = useCallback(async (append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const client = requireSupabase();
      const from = append ? students.length : 0;
      const { data, error: queryError } = await client
        .from('student_profiles')
        .select('user_id, student_name, class_level, roll_no, school_name, created_at')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (queryError) throw queryError;
      const rows = (data ?? []) as StudentRecord[];
      setStudents((current) => append ? [...current, ...rows] : rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'विद्यार्थियों का डेटा लोड नहीं हो सका।');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [students.length]);

  useEffect(() => { void loadStudents(false); }, []);

  const filteredStudents = useMemo(() => students.filter((student) => {
    const matchesClass = classFilter === 'all' || student.class_level === classFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [
      student.student_name, student.roll_no, student.school_name, student.user_id
    ].some((value) => value?.toLowerCase().includes(term));
    return matchesClass && matchesSearch;
  }), [students, classFilter, search]);

  const classCounts = useMemo(() => students.reduce<Record<string, number>>((counts, student) => {
    counts[student.class_level] = (counts[student.class_level] ?? 0) + 1;
    return counts;
  }, {}), [students]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold text-slate-500">PEOPLE & REPORTS</p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Student Management</h2>
          <p className="mt-1 text-sm text-slate-500">पंजीकृत विद्यार्थियों की सूची और कक्षा-वार रिकॉर्ड।</p>
        </div>
        <button type="button" onClick={() => void loadStudents(false)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Users className="h-4 w-4 text-sky-800" /> Loaded Student Records</div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{loading ? '…' : students.length}</p>
          <p className="mt-1 text-[10px] text-slate-400">कुल रिकॉर्ड का पहला पेज और लोड किए गए अगले पेज</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><GraduationCap className="h-4 w-4 text-sky-800" /> Class Distribution</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['6','7','8','9','10','11','12'].map((level) => <span key={level} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">Class {level}: {classCounts[level] ?? 0}</span>)}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="नाम, रोल नंबर, स्कूल या Student ID खोजें" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
        </label>
        <label className="relative sm:w-48">
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 pr-9 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500">
            <option value="all">All Classes</option>
            {['6','7','8','9','10','11','12'].map((level) => <option key={level} value={level}>Class {level}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </label>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-extrabold text-slate-900">Registered Students</h3>
          <span className="text-[11px] font-semibold text-slate-500">{filteredStudents.length} shown</span>
        </div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">विद्यार्थियों का रिकॉर्ड लोड हो रहा है…</div>
          : filteredStudents.length === 0 ? <div className="p-10 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">कोई विद्यार्थी रिकॉर्ड नहीं मिला</p><p className="mt-1 text-xs text-slate-500">Search या class filter बदलकर देखें।</p></div>
          : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-bold">Student</th><th className="px-4 py-3 font-bold">Class</th><th className="px-4 py-3 font-bold">Roll No.</th><th className="px-4 py-3 font-bold">School</th><th className="px-4 py-3 font-bold">Registered</th><th className="px-4 py-3 font-bold">Student ID</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{filteredStudents.map((student) => <tr key={student.user_id} className="hover:bg-sky-50/40"><td className="px-4 py-3 font-bold text-slate-800">{student.student_name}</td><td className="px-4 py-3"><span className="rounded-lg bg-sky-50 px-2 py-1 font-bold text-sky-900">{student.class_level}</span></td><td className="px-4 py-3 text-slate-700">{student.roll_no}</td><td className="px-4 py-3 text-slate-700">{student.school_name}</td><td className="px-4 py-3 text-slate-500">{student.created_at ? new Date(student.created_at).toLocaleDateString('en-IN') : '—'}</td><td className="max-w-[180px] truncate px-4 py-3 font-mono text-[10px] text-slate-400" title={student.user_id}>{student.user_id}</td></tr>)}</tbody>
          </table></div>}
        {!loading && hasMore && <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => void loadStudents(true)} disabled={loadingMore} className="rounded-xl bg-[#082d65] px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-900 disabled:opacity-50">{loadingMore ? 'Loading…' : 'Load More Students'}</button></div>}
      </div>
      <p className="text-[10px] leading-5 text-slate-400">यह पहला चरण केवल रिकॉर्ड देखने, खोजने और कक्षा के अनुसार फ़िल्टर करने के लिए है। किसी विद्यार्थी का डेटा इस स्क्रीन से बदला या हटाया नहीं जाता।</p>
    </section>
  );
};
