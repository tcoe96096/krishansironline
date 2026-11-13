import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, Loader2, Send, RefreshCw, Trash2, Users } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type NotificationRow = {
  id: string;
  title: { en?: string; hi?: string };
  body: { en?: string; hi?: string };
  target_class: string | null;
  source_type: string;
  published_at: string;
  created_at: string;
  priority: 'normal'|'important'|'urgent';
  scheduled_at: string;
  expires_at: string | null;
};
type ReadCount = Record<string, number>;

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100';
const labelClass = 'mb-1.5 block text-xs font-bold text-slate-600';

export const AdminNotificationManagement: React.FC<{ demoMode?: boolean }> = ({ demoMode = false }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [readCounts, setReadCounts] = useState<ReadCount>({});
  const [titleEn, setTitleEn] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyHi, setBodyHi] = useState('');
  const [targetClass, setTargetClass] = useState('');
  const [priority, setPriority] = useState<'normal'|'important'|'urgent'>('normal');
  const [scheduledAt, setScheduledAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadRows = useCallback(async () => {
    if (demoMode) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const client = requireSupabase();
      const [notifications, receipts] = await Promise.all([
        client.from('student_notifications')
          .select('id,title,body,target_class,source_type,published_at,created_at,priority,scheduled_at,expires_at')
          .order('published_at', { ascending: false }).limit(100),
        client.from('student_notification_reads').select('notification_id'),
      ]);
      if (notifications.error) throw notifications.error;
      if (receipts.error) throw receipts.error;
      const counts: ReadCount = {};
      (receipts.data ?? []).forEach((receipt: { notification_id: string }) => {
        counts[receipt.notification_id] = (counts[receipt.notification_id] || 0) + 1;
      });
      setRows((notifications.data ?? []) as NotificationRow[]);
      setReadCounts(counts);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'सूचनाएँ लोड नहीं हो सकीं।');
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => { void loadRows(); }, [loadRows]);

  const sendNotification = async (event: React.FormEvent) => {
    event.preventDefault();
    if (demoMode) return;
    if (!titleEn.trim() && !titleHi.trim()) { setError('सूचना का शीर्षक दर्ज करें।'); return; }
    if (!bodyEn.trim() && !bodyHi.trim()) { setError('सूचना का विवरण दर्ज करें।'); return; }
    if (scheduledAt && expiresAt && new Date(expiresAt).getTime() <= new Date(scheduledAt).getTime()) {
      setError('Expiry time, Schedule time के बाद होना चाहिए।');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { error: insertError } = await requireSupabase().from('student_notifications').insert({
        title: { en: titleEn.trim(), hi: titleHi.trim() },
        body: { en: bodyEn.trim(), hi: bodyHi.trim() },
        target_class: targetClass || null,
        source_type: 'manual',
        created_by: user?.id ?? null,
        published_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        priority,
      });
      if (insertError) throw insertError;
      setTitleEn(''); setTitleHi(''); setBodyEn(''); setBodyHi(''); setTargetClass(''); setPriority('normal'); setScheduledAt(''); setExpiresAt('');
      setMessage('सूचना सफलतापूर्वक विद्यार्थियों को भेज दी गई।');
      await loadRows();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'सूचना भेजी नहीं जा सकी।');
    } finally {
      setSaving(false);
    }
  };

  const deleteNotification = async (row: NotificationRow) => {
    if (!window.confirm('क्या आप इस सूचना को सभी विद्यार्थियों की सूची से हटाना चाहते हैं?')) return;
    const { error: deleteError } = await requireSupabase().from('student_notifications').delete().eq('id', row.id);
    if (deleteError) setError(deleteError.message);
    else { setMessage('सूचना हटा दी गई।'); await loadRows(); }
  };

  const localize = (value: { en?: string; hi?: string }, fallback = '') => value?.hi || value?.en || fallback;

  if (demoMode) return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-extrabold text-slate-900">Student Notifications · Preview</h3><p className="mt-2 text-sm text-slate-500">Demo Preview में कोई Database read/write नहीं होगा।</p></section>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-lg font-extrabold text-slate-900">विद्यार्थी सूचनाएँ</h3><p className="mt-1 text-xs text-slate-500">सभी विद्यार्थियों या चुनी हुई कक्षा को bilingual announcement भेजें।</p></div>
        <button onClick={() => void loadRows()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><RefreshCw className="h-4 w-4"/>Refresh</button>
      </div>
      {(error || message) && <div role="status" className={'rounded-xl p-3 text-xs ' + (error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>{error || message}</div>}
      <form onSubmit={sendNotification} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2"><BellRing className="h-5 w-5 text-sky-800"/><h4 className="font-extrabold text-slate-900">नई सूचना भेजें</h4></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className={labelClass}>शीर्षक · English</span><input className={inputClass} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Announcement title"/></label>
          <label><span className={labelClass}>शीर्षक · हिन्दी</span><input className={inputClass} value={titleHi} onChange={(e) => setTitleHi(e.target.value)} placeholder="सूचना का शीर्षक"/></label>
          <label><span className={labelClass}>विवरण · English</span><textarea className={inputClass} rows={3} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} placeholder="Write the announcement…"/></label>
          <label><span className={labelClass}>विवरण · हिन्दी</span><textarea className={inputClass} rows={3} value={bodyHi} onChange={(e) => setBodyHi(e.target.value)} placeholder="सूचना का विवरण लिखें…"/></label>
          <label><span className={labelClass}>Priority / प्राथमिकता</span><select className={inputClass} value={priority} onChange={e=>setPriority(e.target.value as 'normal'|'important'|'urgent')}><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label>
          <label><span className={labelClass}>Schedule at (optional)</span><input type="datetime-local" className={inputClass} value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/></label>
          <label><span className={labelClass}>Expiry at (optional)</span><input type="datetime-local" className={inputClass} value={expiresAt} onChange={e=>setExpiresAt(e.target.value)}/></label>
          <label className="md:col-span-2"><span className={labelClass}>किसे भेजना है?</span><select className={inputClass} value={targetClass} onChange={(e) => setTargetClass(e.target.value)}><option value="">सभी कक्षाएँ (6–12)</option>{['6','7','8','9','10','11','12'].map((value) => <option key={value} value={value}>केवल कक्षा {value}</option>)}</select></label>
        </div>
        <div className="mt-4 flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}{saving ? 'Sending…' : 'Send Announcement'}</button></div>
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between"><h4 className="font-extrabold text-slate-900">Notification History <span className="text-xs font-semibold text-slate-400">({rows.length})</span></h4><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Manual + Automatic</span></div>
        {loading ? <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</div> : rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">अभी कोई सूचना नहीं है।</p> : <div className="space-y-2">{rows.map((row) => <article key={row.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{localize(row.title, 'Untitled')}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{localize(row.body)}</p><p className="mt-1 text-[10px] text-slate-400">{row.target_class ? 'Class ' + row.target_class : 'All Classes'} · {row.source_type} · {row.priority||'normal'} · {row.scheduled_at ? 'Scheduled '+new Date(row.scheduled_at).toLocaleString() : new Date(row.published_at).toLocaleString()}</p></div><div className="flex shrink-0 items-center gap-3"><span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500"><Users className="h-3.5 w-3.5"/>{readCounts[row.id] || 0} read</span><button type="button" onClick={() => void deleteNotification(row)} className="rounded-lg border border-rose-100 p-2 text-rose-600 hover:bg-rose-50" title="Delete notification"><Trash2 className="h-4 w-4"/></button></div></article>)}</div>}
      </section>
      <p className="text-[10px] leading-5 text-slate-400">प्रकाशित टेस्ट, सूचनाएँ और अध्ययन सामग्री पर automatic notifications भी बनेंगी। विद्यार्थियों का Read/Unread status अलग से सुरक्षित रहेगा।</p>
    </div>
  );
};
