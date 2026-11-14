import React, { useEffect, useState } from 'react';
import { Clock3, ShieldCheck, Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';

type Settings = {
  auto_purge_enabled: boolean;
  recovery_days: number;
  run_time_local: string;
  timezone_name: string;
  updated_at: string;
};

export const AdminStudentPurgeSettings: React.FC = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [days, setDays] = useState(30);
  const [runTime, setRunTime] = useState('02:30');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const client = requireSupabase();
      const { data: role, error: roleError } = await client.rpc('is_super_admin');
      if (roleError) throw roleError;
      setIsSuperAdmin(role === true);
      const { data, error: settingsError } = await client.rpc('get_student_purge_settings');
      if (settingsError) throw settingsError;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('Purge settings उपलब्ध नहीं हैं।');
      const next = row as Settings;
      setSettings(next);
      setDays(next.recovery_days);
      setRunTime(next.run_time_local);
      setEnabled(next.auto_purge_enabled);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Purge settings लोड नहीं हो सकीं।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!isSuperAdmin) return;
    if (days < 30 || days > 365) {
      setError('Recovery period 30 से 365 दिनों के बीच होना चाहिए।');
      return;
    }
    if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(runTime)) {
      setError('समय HH:MM (24-hour) format में दें।');
      return;
    }
    if (enabled && !settings?.auto_purge_enabled && !window.confirm(
      'Auto-Purge Schedule Enable करने से Preview में रोज़ निर्धारित समय पर Worker call होगा। Worker की अलग सुरक्षा Gates बंद होने पर कोई Auth deletion नहीं होगा। जारी रखें?'
    )) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const client = requireSupabase();
      const { data, error: saveError } = await client.rpc('save_student_purge_settings', {
        p_auto_purge_enabled: enabled,
        p_recovery_days: days,
        p_run_time_local: runTime,
      });
      if (saveError) throw saveError;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        const next = row as Settings;
        setSettings(next);
        setDays(next.recovery_days);
        setRunTime(next.run_time_local);
        setEnabled(next.auto_purge_enabled);
      }
      setNotice('Super Admin settings और audit entry सुरक्षित रूप से अपडेट हो गई हैं।');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Purge settings save नहीं हो सकीं।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sky-900">
          <ShieldCheck className="h-5 w-5" />
          <h3 className="text-sm font-extrabold">Student Auto-Purge Policy & Schedule</h3>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      {error && <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>}
      {notice && <div role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0"/>{notice}</div>}
      {loading ? <p className="mt-4 text-xs text-slate-500">Policy permissions और settings जाँची जा रही हैं…</p> : !settings ? null : isSuperAdmin ? (
        <>
          <p className="mt-2 text-xs leading-5 text-slate-500">केवल Super Admin Recovery अवधि, रोज़ का execution time और Preview scheduler नियंत्रित कर सकता है। सभी बदलाव Audit में दर्ज होते हैं।</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Recovery Period</span>
              <select value={days} onChange={e => setDays(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
                {[30,45,60,90,120,180,270,365].map(value => <option key={value} value={value}>{value} दिन</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-slate-600">Daily Run Time · IST</span>
              <input type="time" value={runTime} onChange={e => setRunTime(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"/>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4"/>
              <span><span className="block text-xs font-bold text-slate-800">Enable Daily Scheduler</span><span className="block text-[10px] text-slate-500">Preview only</span></span>
            </label>
          </div>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
            <strong>Safety:</strong> Scheduler enable करने के लिए Preview Vault credentials आवश्यक हैं। Worker के दो independent execution gates बंद रहने पर वह deletion नहीं करेगा। Production इस setting से प्रभावित नहीं होगा।
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-slate-500">Current: {settings.recovery_days} दिन · {settings.run_time_local} IST · {settings.auto_purge_enabled ? 'Scheduler Enabled' : 'Scheduler Disabled'}</p>
            <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#082d65] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
              <Save className="h-4 w-4"/>{saving ? 'Saving…' : 'Save Super Admin Settings'}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
          <strong>Fixed Student Recovery Policy: 30 Days</strong>
          <p className="mt-1">सामान्य Admin और Staff Recovery अवधि या Scheduler समय नहीं बदल सकते। ये controls केवल Super Admin role के लिए उपलब्ध हैं।</p>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500"><Clock3 className="h-3.5 w-3.5"/>Timezone: Asia/Kolkata (IST)</div>
    </section>
  );
};
