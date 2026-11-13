import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellRing, CheckCheck, Loader2, RefreshCw } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

type NotificationItem = {
  id: string;
  title: { en?: string; hi?: string };
  body: { en?: string; hi?: string };
  source_type: string;
  published_at: string;
  priority?: 'normal'|'important'|'urgent';
  scheduled_at?: string;
};
type ReadReceipt = { notification_id: string; read_at: string };

const localized = (value: { en?: string; hi?: string }, language: string) =>
  language === 'hi' ? (value?.hi || value?.en || '') : (value?.en || value?.hi || '');

export const StudentNotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) { setItems([]); setReadIds(new Set()); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const client = requireSupabase();
      const [notifications, receipts] = await Promise.all([
        client.from('student_notifications')
          .select('id,title,body,source_type,published_at,priority,scheduled_at')
          .order('published_at', { ascending: false }).limit(50),
        client.from('student_notification_reads')
          .select('notification_id,read_at').eq('student_id', user.id),
      ]);
      if (notifications.error) throw notifications.error;
      if (receipts.error) throw receipts.error;
      setItems((notifications.data ?? []) as NotificationItem[]);
      setReadIds(new Set((receipts.data ?? []).map((row: ReadReceipt) => row.notification_id)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'सूचनाएँ लोड नहीं हो सकीं।');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (id: string) => {
    if (!user || readIds.has(id)) return;
    const { error: writeError } = await requireSupabase().from('student_notification_reads').upsert({
      notification_id: id, student_id: user.id, read_at: new Date().toISOString(),
    }, { onConflict: 'notification_id,student_id' });
    if (writeError) { setError(writeError.message); return; }
    setReadIds((current) => new Set(current).add(id));
  };

  const unread = items.filter((item) => !readIds.has(item.id)).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-800"><BellRing className="h-5 w-5"/></span><div><h3 className="font-extrabold text-slate-900">{language === 'hi' ? 'मेरी सूचनाएँ' : 'My Notifications'}</h3><p className="text-xs text-slate-500">{language === 'hi' ? 'आपकी कक्षा के लिए महत्वपूर्ण अपडेट' : 'Important updates for your class'}</p></div></div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-800">{unread} {language === 'hi' ? 'नई' : 'unread'}</span><button onClick={() => void load()} disabled={loading} className="rounded-lg border border-slate-200 p-2 text-slate-500" title="Refresh"><RefreshCw className="h-4 w-4"/></button></div>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{error}</p>}
      {loading ? <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</div> : items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 py-7 text-center"><Bell className="mx-auto h-6 w-6 text-slate-300"/><p className="mt-2 text-sm text-slate-500">{language === 'hi' ? 'अभी कोई नई सूचना उपलब्ध नहीं है।' : 'No notifications yet.'}</p></div> : <div className="space-y-2">{items.map((item) => {
        const isRead = readIds.has(item.id);
        const isOpen = expanded === item.id;
        return <article key={item.id} className={'rounded-xl border p-3 ' + (isRead ? 'border-slate-100 bg-white' : 'border-sky-100 bg-sky-50/50')}>
          <button type="button" onClick={() => { setExpanded(isOpen ? null : item.id); void markRead(item.id); }} className="flex w-full items-start gap-3 text-left">
            <span className={'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ' + (isRead ? 'bg-slate-100 text-slate-500' : 'bg-sky-100 text-sky-800')}>{isRead ? <CheckCheck className="h-4 w-4"/> : <Bell className="h-4 w-4"/>}</span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-slate-800">{localized(item.title, language) || 'Update'}</span>{!isRead && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-extrabold text-sky-800">NEW</span>}</span><span className="mt-1 block text-[10px] text-slate-400">{new Date(item.published_at).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')}</span></span>
          </button>
          {isOpen && <div className="ml-11 mt-2 border-t border-slate-100 pt-3"><p className="whitespace-pre-line text-xs leading-6 text-slate-600">{localized(item.body, language)}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{item.source_type} · {item.priority || 'normal'}</p></div>}
        </article>;
      })}</div>}
      <p className="mt-3 text-[10px] text-slate-400">{language === 'hi' ? 'आपकी पढ़ी हुई सूचनाओं का रिकॉर्ड सुरक्षित रखा जाता है।' : 'Your read notification history is saved securely.'}</p>
    </section>
  );
};
