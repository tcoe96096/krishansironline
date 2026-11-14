import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, ClipboardCheck, Database, History, Loader2, RefreshCw, ShieldAlert, UserRoundSearch, Users, UserCheck, UserX, Ban, Trash2, RotateCcw } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';

type StudentOption = {
  user_id: string;
  student_name: string;
  class_level: string;
  roll_no: string;
  school_name: string;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  account_status: 'active' | 'suspended' | 'deleted';
  approval_note: string | null;
  suspension_reason: string | null;
  deletion_reason: string | null;
  deleted_at: string | null;
  purge_after: string | null;
};

type AuditRow = {
  id: string;
  student_id: string | null;
  student_name: string | null;
  actor_id: string;
  action: string;
  reason: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  student_id: string;
  activity_date: string;
  study_minutes: number;
  lessons_opened: number;
  lessons_completed: number;
  tests_completed: number;
  questions_reviewed: number;
};

type CheckResult = {
  label: string;
  detail: string;
  status: 'ok' | 'warning' | 'error';
};

type Tab = 'overview' | 'approval' | 'account' | 'review' | 'diagnostics' | 'audit';

const statusStyle: Record<CheckResult['status'], string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
};

const approvalLabel = (value: StudentOption['approval_status']) =>
  value === 'approved' ? 'Approved' : value === 'rejected' ? 'Rejected' : 'Pending';
const accountLabel = (value: StudentOption['account_status']) =>
  value === 'active' ? 'Active' : value === 'suspended' ? 'Suspended' : 'Soft Deleted';

/** Admin-only student lifecycle workspace. All writes go through existing admin RLS;
 * an AFTER UPDATE database trigger records the immutable audit event atomically. */
export const AdminStudentGovernance: React.FC = () => {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [schemaReady, setSchemaReady] = useState<boolean | null>(null);
  const [schemaMessage, setSchemaMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastChecked, setLastChecked] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const client = requireSupabase();
      const [studentResult, auditResult, activityResult] = await Promise.all([
        client.from('student_profiles')
          .select('user_id,student_name,class_level,roll_no,school_name,created_at,approval_status,account_status,approval_note,suspension_reason,deletion_reason,deleted_at,purge_after')
          .order('created_at', { ascending: false }).limit(500),
        client.from('student_admin_audit')
          .select('id,student_id,student_name,actor_id,action,reason,created_at')
          .order('created_at', { ascending: false }).limit(100),
        client.from('student_daily_activity')
          .select('id,student_id,activity_date,study_minutes,lessons_opened,lessons_completed,tests_completed,questions_reviewed')
          .order('activity_date', { ascending: false }).limit(100),
      ]);
      if (studentResult.error) throw studentResult.error;
      if (auditResult.error) throw auditResult.error;
      if (activityResult.error) throw activityResult.error;
      const rows = (studentResult.data ?? []) as StudentOption[];
      setStudents(rows);
      setAudit((auditResult.data ?? []) as AuditRow[]);
      setActivityRows((activityResult.data ?? []) as ActivityRow[]);
      setSelectedId(current => current || rows[0]?.user_id || '');
      setSchemaReady(true);
      setSchemaMessage('Approval, Account Status और Admin Audit schema उपलब्ध हैं। सभी actions Admin RLS और database audit trigger से सुरक्षित हैं।');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Student Governance डेटा लोड नहीं हो सका।';
      setError(message);
      setSchemaReady(false);
      setSchemaMessage('Governance schema या permissions की जाँच पूरी नहीं हुई। Actions बंद रखे गए हैं।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const recoveryText = (deadline: string | null) => {
    if (!deadline) return 'Recovery deadline अभी उपलब्ध नहीं है';
    const remaining = new Date(deadline).getTime() - Date.now();
    if (remaining <= 0) return `Recovery अवधि पूरी · ${new Date(deadline).toLocaleString('en-IN')} · Auto-Purge Disabled`;
    const days = Math.ceil(remaining / 86400000);
    return `Restore के लिए ${days} दिन शेष · ${new Date(deadline).toLocaleString('en-IN')}`;
  };

  const selectedStudent = useMemo(
    () => students.find(student => student.user_id === selectedId) ?? null,
    [students, selectedId],
  );

  const filteredStudents = useMemo(() => students.filter(student => {
    if (filter === 'pending') return student.approval_status === 'pending' && student.account_status !== 'deleted';
    if (filter === 'rejected') return student.approval_status === 'rejected';
    if (filter === 'suspended') return student.account_status === 'suspended';
    if (filter === 'deleted') return student.account_status === 'deleted';
    if (filter === 'active') return student.approval_status === 'approved' && student.account_status === 'active';
    return true;
  }), [students, filter]);

  const counts = useMemo(() => ({
    total: students.length,
    pending: students.filter(s => s.approval_status === 'pending' && s.account_status !== 'deleted').length,
    active: students.filter(s => s.approval_status === 'approved' && s.account_status === 'active').length,
    suspended: students.filter(s => s.account_status === 'suspended').length,
    deleted: students.filter(s => s.account_status === 'deleted').length,
  }), [students]);

  const updateLifecycle = async (
    student: StudentOption,
    action: 'approve' | 'reject' | 'suspend' | 'activate' | 'soft_delete' | 'restore',
  ) => {
    const reasonRequired = action === 'reject' || action === 'suspend' || action === 'soft_delete';
    const reason = reasonRequired ? window.prompt(
      action === 'reject' ? 'अस्वीकृति का कारण लिखें:' :
      action === 'suspend' ? 'Suspension का कारण लिखें:' : 'Soft Delete का कारण लिखें:',
    ) : '';
    if (reasonRequired && !reason?.trim()) return;

    const labels: Record<typeof action, string> = {
      approve: 'इस विद्यार्थी को approve करें?',
      reject: 'इस registration को reject करें?',
      suspend: 'इस विद्यार्थी का account suspend करें?',
      activate: 'इस विद्यार्थी का account activate करें?',
      soft_delete: 'इस विद्यार्थी को Soft Delete करें? रिकॉर्ड और परिणाम सुरक्षित रहेंगे।',
      restore: 'इस विद्यार्थी का Soft Deleted record restore करें?',
    };
    if (!window.confirm(labels[action])) return;

    setSavingId(student.user_id);
    setError('');
    setNotice('');
    try {
      const client = requireSupabase();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) throw authError || new Error('Admin session सत्यापित नहीं हुई।');
      const now = new Date().toISOString();
      let updates: Record<string, string | null> = {};
      if (action === 'approve') updates = { approval_status: 'approved', approved_at: now, approved_by: authData.user.id, approval_note: null };
      if (action === 'reject') updates = { approval_status: 'rejected', approval_note: reason!.trim() };
      if (action === 'suspend') updates = { account_status: 'suspended', suspended_at: now, suspended_by: authData.user.id, suspension_reason: reason!.trim() };
      if (action === 'activate') updates = { account_status: 'active', suspended_at: null, suspended_by: null, suspension_reason: null };
      if (action === 'soft_delete') updates = { account_status: 'deleted', deleted_by: authData.user.id, deletion_reason: reason!.trim() };
      if (action === 'restore') updates = { account_status: 'active', deleted_at: null, deleted_by: null, deletion_reason: null };
      const { data, error: updateError } = await client.from('student_profiles')
        .update(updates).eq('user_id', student.user_id)
        .select('user_id,student_name,class_level,roll_no,school_name,created_at,approval_status,account_status,approval_note,suspension_reason,deletion_reason,deleted_at,purge_after')
        .single();
      if (updateError) throw updateError;
      const updated = data as StudentOption;
      setStudents(current => current.map(item => item.user_id === updated.user_id ? updated : item));
      const { data: auditRows, error: auditError } = await client.from('student_admin_audit')
        .select('id,student_id,student_name,actor_id,action,reason,created_at')
        .order('created_at', { ascending: false }).limit(100);
      if (auditError) throw auditError;
      setAudit((auditRows ?? []) as AuditRow[]);
      setNotice('कार्यवाही सफल हुई और Audit History refresh हो गई।');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Student status update नहीं हो सका।');
    } finally {
      setSavingId('');
    }
  };

  const nameNeedsReview = (value: string | null | undefined) => {
    const normalized = value?.trim().toLowerCase() ?? '';
    return !normalized
      || /^\d{6,15}$/.test(normalized)
      || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
      || ['err', 'error', 'test', 'unknown', 'student', 'name', 'n/a', 'na', 'null', 'none', 'anonymous'].includes(normalized);
  };

  const adminReviewReasons = (student: StudentOption): string[] => {
    const reasons: string[] = [];
    if (nameNeedsReview(student.student_name)) reasons.push('Student name is missing, placeholder, numeric or email-like');
    if (!student.class_level?.trim()) reasons.push('Class is missing');
    if (!student.roll_no?.trim()) reasons.push('Roll number is missing');
    if (!student.school_name?.trim()) reasons.push('School name is missing');
    if (student.account_status === 'deleted') {
      reasons.push('Soft-deleted account — manual review required before any future permanent purge');
      if (!student.deleted_at || !student.purge_after) reasons.push('Deletion timestamp or 30-day recovery deadline is missing');
    }
    return reasons;
  };

  const correctStudentName = async (student: StudentOption) => {
    const entered = window.prompt(
      `Verified full student name for Class ${student.class_level} · Roll ${student.roll_no}:`,
      nameNeedsReview(student.student_name) ? '' : student.student_name,
    );
    if (entered === null) return;
    const verifiedName = entered.trim();
    if (nameNeedsReview(verifiedName)) {
      setError('Verified नाम आवश्यक है। Placeholder, numeric ID, email या खाली value स्वीकार नहीं होगी।');
      return;
    }
    if (!window.confirm(`क्या “${verifiedName}” verified student name के रूप में save करें? Academic results में यही नाम सुरक्षित रहेगा।`)) return;
    setSavingId(student.user_id);
    setError('');
    setNotice('');
    try {
      const client = requireSupabase();
      const { data, error: updateError } = await client.from('student_profiles')
        .update({ student_name: verifiedName })
        .eq('user_id', student.user_id)
        .select('user_id,student_name,class_level,roll_no,school_name,created_at,approval_status,account_status,approval_note,suspension_reason,deletion_reason,deleted_at,purge_after')
        .single();
      if (updateError) throw updateError;
      setStudents(current => current.map(item => item.user_id === student.user_id ? data as StudentOption : item));
      const { data: auditRows, error: auditError } = await client.from('student_admin_audit')
        .select('id,student_id,student_name,actor_id,action,reason,created_at')
        .order('created_at', { ascending: false }).limit(100);
      if (auditError) throw auditError;
      setAudit((auditRows ?? []) as AuditRow[]);
      setNotice('Verified नाम save हो गया। Database audit history refresh कर दी गई है।');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verified नाम save नहीं हो सका।');
    } finally {
      setSavingId('');
    }
  };

  const runDiagnostics = async () => {
    if (!selectedStudent) return;
    setChecking(true);
    setChecks([]);
    setError('');
    try {
      const client = requireSupabase();
      const [profile, attempts, progress, activity] = await Promise.all([
        client.from('student_profiles').select('user_id,student_name,class_level,roll_no,school_name,approval_status,account_status,deleted_at')
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
        profile.data?.approval_status === 'approved' && profile.data?.account_status === 'active' && !profile.data?.deleted_at
          ? { label: 'Account Eligibility', detail: 'विद्यार्थी Approved और Active है।', status: 'ok' }
          : { label: 'Account Eligibility', detail: 'विद्यार्थी इस समय Test/Learning access के लिए eligible नहीं है।', status: 'warning' },
      ];
      setChecks(next);
      setLastChecked(new Date().toLocaleString('en-IN'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Diagnostics पूरी नहीं हो सकी।');
    } finally {
      setChecking(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'approval', label: 'Approval Centre' },
    { id: 'account', label: 'Account Control' },
    { id: 'review', label: 'Name Review' },
    { id: 'diagnostics', label: 'Diagnostics' },
    { id: 'audit', label: 'Activity & Audit' },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sky-900"><ShieldAlert className="h-5 w-5" /><h3 className="text-sm font-extrabold">Student Governance & Diagnostics</h3></div>
          <p className="mt-1 text-xs text-slate-500">Hybrid approval, account lifecycle, diagnostics और immutable Admin audit</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${schemaReady ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        <div className="flex items-start gap-2"><Database className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>{schemaReady ? 'Governance schema ready' : 'Governance schema unavailable'}</strong><p className="mt-1">{schemaMessage || 'Database जाँच जारी है…'}</p></div></div>
      </div>

      {error && <div role="alert" className="mt-3 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</div>}

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-100 pb-1">
        {tabs.map(item => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold ${tab === item.id ? 'bg-[#082d65] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}</button>)}
      </div>

      {tab === 'overview' && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: 'Total Students', value: counts.total, icon: Users },
          { label: 'Pending Approval', value: counts.pending, icon: ClipboardCheck },
          { label: 'Approved & Active', value: counts.active, icon: UserCheck },
          { label: 'Suspended', value: counts.suspended, icon: Ban },
          { label: 'Soft Deleted', value: counts.deleted, icon: Trash2 },
        ].map(item => { const Icon = item.icon; return <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><Icon className="h-4 w-4 text-sky-800"/><p className="mt-2 text-xl font-extrabold text-slate-900">{loading ? '…' : item.value}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">{item.label}</p></div>; })}
      </div>}

      {(tab === 'approval' || tab === 'account') && <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><UserRoundSearch className="h-4 w-4"/>{tab === 'approval' ? 'Registration Review Queue' : 'Student Account Lifecycle'}</div>
          <select value={filter} onChange={event => setFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold">
            <option value="all">All Students</option><option value="pending">Pending</option><option value="active">Approved & Active</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option><option value="deleted">Soft Deleted</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Student</th><th className="p-3">Class / Roll</th><th className="p-3">Approval</th><th className="p-3">Account</th><th className="p-3">30-Day Recovery Deadline</th><th className="p-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => <tr key={student.user_id}>
                <td className="p-3"><p className="font-bold text-slate-800">{student.student_name}</p><p className="text-[10px] text-slate-500">{student.school_name}</p></td>
                <td className="p-3 text-slate-600">Class {student.class_level} · {student.roll_no}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${student.approval_status === 'approved' ? 'bg-emerald-50 text-emerald-700' : student.approval_status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{approvalLabel(student.approval_status)}</span></td>
                <td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${student.account_status === 'active' ? 'bg-emerald-50 text-emerald-700' : student.account_status === 'suspended' ? 'bg-amber-50 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>{accountLabel(student.account_status)}</span></td>
                <td className="p-3"><div className="min-w-[190px] text-[10px] leading-4">{student.account_status === 'deleted' ? <><p className="font-bold text-slate-800">{student.deleted_at ? `Deleted: ${new Date(student.deleted_at).toLocaleString('en-IN')}` : 'Deletion date missing'}</p><p className={student.purge_after && new Date(student.purge_after).getTime() > Date.now() ? 'text-amber-800' : 'text-rose-700'}>{recoveryText(student.purge_after)}</p></> : <span className="text-slate-400">Not applicable</span>}</div></td>
                <td className="p-3"><div className="flex flex-wrap gap-1.5">
                  {tab === 'approval' && student.approval_status !== 'approved' && student.account_status !== 'deleted' && <button type="button" onClick={() => void updateLifecycle(student,'approve')} disabled={Boolean(savingId)} className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Approve</button>}
                  {tab === 'approval' && student.approval_status === 'pending' && <button type="button" onClick={() => void updateLifecycle(student,'reject')} disabled={Boolean(savingId)} className="rounded-md bg-rose-700 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Reject</button>}
                  {tab === 'account' && student.account_status === 'active' && <button type="button" onClick={() => void updateLifecycle(student,'suspend')} disabled={Boolean(savingId)} className="rounded-md bg-amber-600 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Suspend</button>}
                  {tab === 'account' && student.account_status === 'suspended' && <button type="button" onClick={() => void updateLifecycle(student,'activate')} disabled={Boolean(savingId)} className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Activate</button>}
                  {tab === 'account' && student.account_status !== 'deleted' && <button type="button" onClick={() => void updateLifecycle(student,'soft_delete')} disabled={Boolean(savingId)} className="rounded-md border border-rose-200 px-2.5 py-1.5 text-[10px] font-bold text-rose-700 disabled:opacity-50">Soft Delete</button>}
                  {tab === 'account' && student.account_status === 'deleted' && <button type="button" onClick={() => void updateLifecycle(student,'restore')} disabled={Boolean(savingId)} className="rounded-md bg-sky-800 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"><RotateCcw className="mr-1 inline h-3 w-3"/>Restore</button>}
                </div></td>
              </tr>)}
              {!filteredStudents.length && <tr><td colSpan={6} className="p-8 text-center text-xs text-slate-500">इस Filter में कोई विद्यार्थी नहीं मिला।</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] leading-4 text-slate-500">Permanent Delete उपलब्ध नहीं है। Soft Delete में Auth और academic records सुरक्षित रहते हैं; केवल eligibility बंद होती है। Rejected विद्यार्थी को दोबारा Approve किया जा सकता है।</p>
      </div>}

      {tab === 'review' && <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <strong>Admin Review Queue · Auto-Purge Safety Gate</strong>
          <p className="mt-1">किसी भी अस्पष्ट या अधूरे रिकॉर्ड को स्वतः ठीक या delete नहीं किया जाएगा। खाली/placeholder/numeric/email-जैसे नाम, missing academic details और सभी soft-deleted records यहाँ review के लिए दिखेंगे। Admin verification के बिना कोई permanent purge नहीं होगा। Academic results में verified student name सुरक्षित रहेगा।</p>
        </div>
        <div className="flex items-center justify-between gap-2"><h4 className="text-xs font-extrabold text-slate-800">Records requiring Admin decision</h4><span className="rounded-lg bg-amber-100 px-3 py-2 text-[11px] font-bold text-amber-900">{students.filter(s => adminReviewReasons(s).length > 0).length} records</span></div>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Student record</th><th className="p-3">Class / Roll</th><th className="p-3">Account status</th><th className="p-3">Review reasons</th><th className="p-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {students.filter(s => adminReviewReasons(s).length > 0).map(student => <tr key={student.user_id}>
                <td className="p-3"><p className="font-bold text-slate-800">{student.student_name || 'Name missing'}</p><p className="text-[10px] text-slate-500">{student.school_name || 'School not recorded'}</p></td>
                <td className="p-3 text-slate-600">Class {student.class_level || 'Missing'} · {student.roll_no || 'Roll missing'}</td>
                <td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{accountLabel(student.account_status)}</span></td>
                <td className="p-3"><ul className="list-disc space-y-1 pl-4 text-[10px] leading-4 text-amber-800">{adminReviewReasons(student).map(reason => <li key={reason}>{reason}</li>)}</ul></td>
                <td className="p-3"><div className="flex flex-col gap-1.5">
                  {nameNeedsReview(student.student_name) && <button type="button" onClick={() => void correctStudentName(student)} disabled={Boolean(savingId)} className="rounded-lg bg-[#082d65] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">Verify & Correct Name</button>}
                  <button type="button" onClick={() => { setSelectedId(student.user_id); setTab('diagnostics'); }} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700">Inspect Record</button>
                </div></td>
              </tr>)}
              {!students.some(s => adminReviewReasons(s).length > 0) && <tr><td colSpan={5} className="p-8 text-center text-xs text-emerald-700">कोई Admin Review लंबित नहीं है।</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] leading-4 text-slate-500">Verified name correction database audit trigger में दर्ज होती है। Missing class/roll/school और lifecycle मामलों को Admin profile editor तथा diagnostics से जाँचें। यह स्क्रीन किसी भी account को permanently delete नहीं करती।</p>
      </div>}

      {tab === 'diagnostics' && <div className="mt-4 space-y-3">
        <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-slate-600">Diagnostics के लिए विद्यार्थी चुनें</span>
          <select value={selectedId} onChange={event => { setSelectedId(event.target.value); setChecks([]); }} disabled={loading || !students.length} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800">
            {students.map(student => <option key={student.user_id} value={student.user_id}>{student.student_name} · Class {student.class_level} · {student.roll_no}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void runDiagnostics()} disabled={!selectedStudent || checking} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#082d65] px-4 py-3 text-xs font-bold text-white hover:bg-sky-900 disabled:opacity-50">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />} Run Diagnostics
        </button>
        {checks.length > 0 && <div className="space-y-2">
          <div className="flex items-center justify-between"><h4 className="text-xs font-extrabold text-slate-800">Diagnostic Report · {selectedStudent?.student_name}</h4><span className="text-[10px] text-slate-400">{lastChecked}</span></div>
          {checks.map(check => <div key={check.label} className={`flex items-start gap-2 rounded-lg border p-3 ${statusStyle[check.status]}`}>
            {check.status === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <div><p className="text-xs font-bold">{check.label}</p><p className="mt-0.5 text-[11px] leading-5">{check.detail}</p></div>
          </div>)}
        </div>}
      </div>}

      {tab === 'audit' && <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><History className="h-4 w-4"/>Latest Admin Actions</div>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-3">Time</th><th className="p-3">Student</th><th className="p-3">Action</th><th className="p-3">Reason</th><th className="p-3">Admin ID</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {audit.map(row => <tr key={row.id}><td className="p-3 text-slate-500">{new Date(row.created_at).toLocaleString('en-IN')}</td><td className="p-3 font-semibold text-slate-800">{row.student_name || students.find(s => s.user_id === row.student_id)?.student_name || (row.student_id ? row.student_id.slice(0,8) : 'Archived student')}</td><td className="p-3"><span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-800">{row.action.replaceAll('_',' ')}</span></td><td className="p-3 text-slate-600">{row.reason || '—'}</td><td className="p-3 font-mono text-[10px] text-slate-500">{row.actor_id.slice(0,8)}…</td></tr>)}
              {!audit.length && <tr><td colSpan={5} className="p-8 text-center text-xs text-slate-500">अभी कोई Admin Action दर्ज नहीं है।</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-500">Audit entries database trigger द्वारा उसी transaction में बनती हैं; browser से edit/delete नहीं की जा सकतीं।</p>
        <div className="mt-5 flex items-center gap-2 text-xs font-extrabold text-slate-800"><Activity className="h-4 w-4"/>Student Learning Activity</div>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Student</th><th className="p-3">Study Minutes</th><th className="p-3">Lessons</th><th className="p-3">Tests</th><th className="p-3">Reviewed</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {activityRows.map(row => <tr key={row.id}><td className="p-3 text-slate-500">{row.activity_date}</td><td className="p-3 font-semibold text-slate-800">{students.find(s => s.user_id === row.student_id)?.student_name || row.student_id.slice(0,8)}</td><td className="p-3 tabular-nums">{row.study_minutes}</td><td className="p-3 tabular-nums">{row.lessons_completed}/{row.lessons_opened}</td><td className="p-3 tabular-nums">{row.tests_completed}</td><td className="p-3 tabular-nums">{row.questions_reviewed}</td></tr>)}
              {!activityRows.length && <tr><td colSpan={6} className="p-8 text-center text-xs text-slate-500">अभी Student Activity Records उपलब्ध नहीं हैं।</td></tr>}
            </tbody>
          </table>
        </div>
      </div>}
    </section>
  );
};
