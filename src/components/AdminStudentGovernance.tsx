import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, ClipboardCheck, Database, History, Loader2, RefreshCw, ShieldAlert, UserRoundSearch } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';

type StudentOption = {
  user_id: string;
  student_name: string;
  class_level: string;
  roll_no: string;
  school_name: string;
};

type CheckResult = {
  label: string;
  detail: string;
  status: 'ok' | 'warning' | 'error';
};

const statusStyle: Record<CheckResult['status'], string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
};

/**
 * Safe first-stage governance workspace.
 * Lifecycle actions remain unavailable until the reviewed Preview schema/RLS
 * is installed. This avoids pretending that Approval or Account Control exists.
 */
export const AdminStudentGovernance: React.FC = () => {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [schemaReady, setSchemaReady] = useState<boolean | null>(null);
  const [schemaMessage, setSchemaMessage] = useState('');
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const client = requireSupabase();
      const { data, error: queryError } = await client
        .from('student_profiles')
        .select('user_id,student_name,class_level,roll_no,school_name')
        .order('created_at', { ascending: false })
        .limit(200);
      if (queryError) throw queryError;
      const rows = (data ?? []) as StudentOption[];
      setStudents(rows);
      setSelectedId(current => current || rows[0]?.user_id || '');
      const lifecycleProbe = await client.from('student_profiles')
        .select('user_id,approval_status,account_status,deleted_at').limit(1);
      if (lifecycleProbe.error) {
        setSchemaReady(false);
        setSchemaMessage('Preview Database में Approval / Account Lifecycle fields अभी उपलब्ध नहीं हैं। Schema और RLS review पूरा होने तक ये actions सुरक्षित रूप से बंद रहेंगे।');
      } else {
        setSchemaReady(true);
        setSchemaMessage('Lifecycle fields उपलब्ध हैं। अगले चरण में server-verified action permissions और audit transaction की पुष्टि आवश्यक है।');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Student Governance डेटा लोड नहीं हो सका।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedStudent = useMemo(
    () => students.find(student => student.user_id === selectedId) ?? null,
    [students, selectedId],
  );

  const runDiagnostics = async () => {
    if (!selectedStudent) return;
    setChecking(true);
    setChecks([]);
    setError('');
    try {
      const client = requireSupabase();
      const [profile, attempts, progress, activity] = await Promise.all([
        client.from('student_profiles').select('user_id,student_name,class_level,roll_no,school_name')
          .eq('user_id', selectedStudent.user_id).maybeSingle(),
        client.from('test_attempts').select('id,status,started_at')
          .eq('student_id', selectedStudent.user_id).order('started_at', { ascending: false }).limit(100),
        client.from('student_learning_progress').select('id,progress_percent,last_opened_at')
          .eq('student_id', selectedStudent.user_id).order('last_opened_at', { ascending: false }).limit(100),
        client.from('student_daily_activity').select('id,activity_date,study_minutes')
          .eq('student_id', selectedStudent.user_id).order('activity_date', { ascending: false }).limit(30),
      ]);

      const next: CheckResult[] = [
        profile.error
          ? { label: 'Student Profile', detail: profile.error.message, status: 'error' }
          : profile.data
            ? { label: 'Student Profile', detail: 'Profile record मौजूद है।', status: 'ok' }
            : { label: 'Student Profile', detail: 'Auth ID के लिए Profile record नहीं मिला।', status: 'error' },
        attempts.error
          ? { label: 'Test History Access', detail: attempts.error.message, status: 'error' }
          : { label: 'Test History Access', detail: (attempts.data?.length ?? 0) + ' हाल के attempts पढ़े गए।', status: 'ok' },
        progress.error
          ? { label: 'Learning Progress Access', detail: progress.error.message, status: 'error' }
          : { label: 'Learning Progress Access', detail: (progress.data?.length ?? 0) + ' progress records पढ़े गए।', status: 'ok' },
        activity.error
          ? { label: 'Daily Activity Access', detail: activity.error.message, status: 'error' }
          : { label: 'Daily Activity Access', detail: (activity.data?.length ?? 0) + ' activity records पढ़े गए।', status: 'ok' },
        schemaReady
          ? { label: 'Approval / Account Lifecycle', detail: 'Lifecycle columns मौजूद हैं; action RPC और audit verification अभी अलग से आवश्यक है।', status: 'warning' }
          : { label: 'Approval / Account Lifecycle', detail: 'Preview schema अभी उपलब्ध नहीं है; कोई approval या account status अनुमानित नहीं किया गया।', status: 'warning' },
      ];
      setChecks(next);
      setLastChecked(new Date().toLocaleString('en-IN'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Diagnostics पूरी नहीं हो सकी।');
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sky-900"><ShieldAlert className="h-5 w-5" /><h3 className="text-sm font-extrabold">Student Governance & Diagnostics</h3></div>
          <p className="mt-1 text-xs text-slate-500">Approval, account lifecycle, diagnostics और audit के लिए सुरक्षित Preview workspace</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${schemaReady ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
        <div className="flex items-start gap-2"><Database className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>{schemaReady ? 'Lifecycle schema detected' : 'Lifecycle schema pending'}</strong><p className="mt-1">{schemaMessage || 'Database जाँच जारी है…'}</p></div></div>
      </div>

      {error && <div role="alert" className="mt-3 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Diagnostics के लिए विद्यार्थी चुनें</span>
          <select value={selectedId} onChange={event => { setSelectedId(event.target.value); setChecks([]); }} disabled={loading || !students.length} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800">
            {students.map(student => <option key={student.user_id} value={student.user_id}>{student.student_name} · Class {student.class_level} · {student.roll_no}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button type="button" onClick={() => void runDiagnostics()} disabled={!selectedStudent || checking} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#082d65] px-4 py-3 text-xs font-bold text-white hover:bg-sky-900 disabled:opacity-50 lg:w-auto">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />} Run Diagnostics
          </button>
        </div>
      </div>

      {checks.length > 0 && <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between"><h4 className="text-xs font-extrabold text-slate-800">Diagnostic Report · {selectedStudent?.student_name}</h4><span className="text-[10px] text-slate-400">{lastChecked}</span></div>
        {checks.map(check => <div key={check.label} className={`flex items-start gap-2 rounded-lg border p-3 ${statusStyle[check.status]}`}>
          {check.status === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <div><p className="text-xs font-bold">{check.label}</p><p className="mt-0.5 text-[11px] leading-5">{check.detail}</p></div>
        </div>)}
      </div>}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><ClipboardCheck className="h-4 w-4 text-sky-800" /><p className="mt-2 text-xs font-bold text-slate-800">Approval Centre</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Hybrid approval queue — lifecycle schema and server-side enforcement pending.</p></div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><ShieldAlert className="h-4 w-4 text-sky-800" /><p className="mt-2 text-xs font-bold text-slate-800">Account Control</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Activate, suspend, soft-delete and restore will unlock after permission/RLS verification.</p></div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><History className="h-4 w-4 text-sky-800" /><p className="mt-2 text-xs font-bold text-slate-800">Activity & Audit</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Append-only Admin audit history will be enabled with the Preview schema.</p></div>
      </div>
    </section>
  );
};
