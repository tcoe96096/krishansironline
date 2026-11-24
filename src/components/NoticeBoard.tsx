import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { requireSupabase } from '../lib/supabase';
import { Bell, Calendar, ExternalLink, RefreshCw } from 'lucide-react';

interface NoticeBoardProps {
  onNavigate: (section: string) => void;
}

interface PublicNotice {
  id: string;
  title: string | { en?: string; hi?: string };
  details: string | { en?: string; hi?: string };
  category: string;
  date?: string;
  link?: string | null;
  isPinned?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
}

function localized(value: PublicNotice['title'] | PublicNotice['details'], language: string): string {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return language === 'hi' ? (value.hi || value.en || '') : (value.en || value.hi || '');
}

type LaunchTest = { id: string; title: PublicNotice['title']; class_level: string; subject: string; duration_minutes: number; total_marks: number };

const LatestTestLaunches: React.FC = () => {
  const { language } = useLanguage();
  const [tests, setTests] = useState<LaunchTest[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    let request = 0;
    const refresh = async () => {
      const current = ++request;
      try {
        const { data, error } = await requireSupabase().from('tests')
          .select('id,title,class_level,subject,duration_minutes,total_marks')
          .eq('is_published', true).order('updated_at', { ascending: false })
          .order('id', { ascending: true }).limit(6);
        if (error) throw error;
        if (active && current === request) { setTests(data ?? []); setStatus('ready'); }
      } catch {
        if (active && current === request) { setTests([]); setStatus('error'); }
      }
    };
    const refreshVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const timer = window.setInterval(refreshVisible, 30000);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refreshVisible); document.removeEventListener('visibilitychange', refreshVisible); };
  }, []);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return <div className="mb-5 rounded-xl border border-sky-100 bg-sky-50/50 p-3 sm:p-4" aria-labelledby="new-test-launch-heading">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 id="new-test-launch-heading" className="text-sm font-extrabold text-sky-900">{language === 'en' ? 'New Launch · Latest Tests' : 'नए लॉन्च · नवीनतम टेस्ट'}</h3>
      <a href={base + '/online-tests/'} className="shrink-0 text-xs font-semibold text-sky-800 hover:underline">{language === 'en' ? 'All tests' : 'सभी टेस्ट'}</a>
    </div>
    {status === 'loading' && <p role="status" className="text-xs text-slate-500">{language === 'en' ? 'Loading tests…' : 'टेस्ट लोड हो रहे हैं…'}</p>}
    {status === 'error' && <p role="status" className="text-xs text-slate-600">{language === 'en' ? 'Test updates temporarily unavailable.' : 'टेस्ट अपडेट अभी उपलब्ध नहीं हैं।'}</p>}
    {status === 'ready' && !tests.length && <p className="text-xs text-slate-500">{language === 'en' ? 'No published tests yet.' : 'अभी कोई प्रकाशित टेस्ट नहीं है।'}</p>}
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {tests.map(test => <a key={test.id} href={base + '/online-tests/?testId=' + encodeURIComponent(test.id)} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-600">
        <div className="min-w-0"><div className="text-[10px] font-semibold text-sky-700">Class {test.class_level} · {test.subject}</div><div className="break-words text-xs font-bold text-slate-900">{localized(test.title, language)}</div><div className="text-[10px] text-slate-500">{test.total_marks} Marks · {test.duration_minutes} min</div></div>
        <span className="shrink-0 text-[11px] font-bold text-sky-800">{language === 'en' ? 'View test' : 'टेस्ट देखें'} ›</span>
      </a>)}
    </div>
  </div>;
};

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const [notices, setNotices] = useState<PublicNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const { data, error: queryError } = await requireSupabase()
          .from('site_notices')
          .select('id,title,details,category,link,published_at,display_order,is_pinned,starts_at,expires_at,show_on_homepage')
          .eq('is_published', true)
          .eq('show_on_homepage', true)
          .order('is_pinned', { ascending: false })
          .order('display_order', { ascending: true })
          .order('published_at', { ascending: false })
          .limit(200);
        if (queryError) throw queryError;
        if (!active) return;
        setNotices((data ?? []).map((row: any) => ({
          id: row.id,
          title: row.title ?? {},
          details: row.details ?? {},
          category: row.category ?? 'Notice',
          date: row.published_at ? new Date(row.published_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN') : undefined,
          link: row.link,
          isPinned: Boolean(row.is_pinned),
          startsAt: row.starts_at,
          expiresAt: row.expires_at,
        })));
      } catch (err) {
        console.error('Unable to load published notices from Supabase:', err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [refreshKey, language]);

  // Subscribe to Admin changes so publish, unpublish, edit and delete appear automatically.
  useEffect(() => {
    try {
      const client = requireSupabase();
      const channel = client
        .channel('homepage-site-notices-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_notices' }, () => {
          setRefreshKey((key) => key + 1);
        })
        .subscribe();
      const refreshWhenVisible = () => {
        if (document.visibilityState === 'visible') setRefreshKey((key) => key + 1);
      };
      window.addEventListener('focus', refreshWhenVisible);
      document.addEventListener('visibilitychange', refreshWhenVisible);
      return () => {
        window.removeEventListener('focus', refreshWhenVisible);
        document.removeEventListener('visibilitychange', refreshWhenVisible);
        void client.removeChannel(channel);
      };
    } catch {
      return;
    }
  }, []);

  // Refresh exactly when a scheduled announcement starts or expires.
  useEffect(() => {
    const nextBoundary = notices
      .flatMap((notice) => [notice.startsAt, notice.expiresAt])
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((time) => Number.isFinite(time) && time > Date.now())
      .sort((a, b) => a - b)[0];
    if (!nextBoundary) return;
    const delay = Math.min(Math.max(0, nextBoundary - Date.now() + 1000), 2147483000);
    const timer = window.setTimeout(() => setRefreshKey((key) => key + 1), delay);
    return () => window.clearTimeout(timer);
  }, [notices]);

  const visibleNotices = notices
    .filter((notice) => {
      const now = Date.now();
      const hasStarted = !notice.startsAt || new Date(notice.startsAt).getTime() <= now;
      const hasNotExpired = !notice.expiresAt || new Date(notice.expiresAt).getTime() > now;
      return hasStarted && hasNotExpired;
    })
    .slice(0, 8);

  const openNoticeLink = (link?: string | null) => {
    if (!link) return;
    if (link.startsWith('#')) {
      onNavigate(link.slice(1) || 'home');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const categoryClass = (category: string) => {
    switch (category) {
      case 'Test': return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'Result': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Exam': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Notes': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <section className="py-10 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {language === 'en' ? 'Latest Announcements & Updates' : 'नवीनतम सूचनाएं एवं अपडेट्स'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'en' ? 'Official updates published from the Admin Dashboard' : 'Admin Dashboard से प्रकाशित आधिकारिक सूचनाएँ'}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setRefreshKey((key) => key + 1)}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-2 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200">
            <RefreshCw className="w-3.5 h-3.5" />
            {language === 'en' ? 'Refresh updates' : 'सूचनाएँ रिफ्रेश करें'}
          </button>
        </div>

        <LatestTestLaunches />

        {loading && <p className="py-5 text-sm text-slate-500">{language === 'en' ? 'Loading announcements…' : 'सूचनाएँ लोड हो रही हैं…'}</p>}
        {!loading && error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {language === 'en' ? 'Announcements could not be loaded. Please try Refresh updates.' : 'सूचनाएँ लोड नहीं हो सकीं। कृपया रिफ्रेश करें।'}
          </div>
        )}
        {!loading && !error && visibleNotices.length === 0 && (
          <p className="py-5 text-sm text-slate-500">{language === 'en' ? 'No announcements have been published yet.' : 'अभी कोई सूचना प्रकाशित नहीं हुई है।'}</p>
        )}
        {!loading && !error && visibleNotices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleNotices.map((notice) => {
              const title = localized(notice.title, language);
              const details = localized(notice.details, language);
              return (
                <article key={notice.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm">
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <span className={`px-2 py-0.5 rounded-sm font-semibold border text-[11px] ${categoryClass(notice.category)}`}>{notice.category}</span>
                    {notice.isPinned && <span className="rounded-sm border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">{language === 'en' ? 'FEATURED' : 'प्रमुख सूचना'}</span>}
                    {notice.date && <span className="text-slate-400 font-mono text-[11px] inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{notice.date}</span>}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">{title || (language === 'en' ? 'Announcement' : 'सूचना')}</h3>
                  {details && <p className="mt-1.5 text-xs text-slate-600 leading-relaxed whitespace-pre-line">{details}</p>}
                  {notice.link && (
                    <button type="button" onClick={() => openNoticeLink(notice.link)}
                      className="mt-3 pt-2.5 border-t border-slate-100 w-full flex items-center justify-between text-xs font-semibold text-sky-700 hover:text-sky-900">
                      <span>{language === 'en' ? 'Open Resource' : 'संसाधन देखें'}</span><ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
