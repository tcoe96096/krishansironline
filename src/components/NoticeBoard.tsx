import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { requireSupabase } from '../lib/supabase';
import { Bell, Calendar, ExternalLink, Presentation as PresentationIcon, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchSlide, type Presentation } from '../services/presentationService';
import { PresentationViewer } from './PresentationLibrary';

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
    <style>{`@keyframes ksolLaunchNewPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.75; } } @media (prefers-reduced-motion: no-preference) { .ksol-launch-new { animation: ksolLaunchNewPulse 1.4s ease-in-out infinite; } }`}</style>
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 id="new-test-launch-heading" className="text-sm font-extrabold text-sky-900">{language === 'en' ? 'New Launch · Latest Tests' : 'नए लॉन्च · नवीनतम टेस्ट'}</h3>
      <a href={base + '/online-tests/'} className="shrink-0 text-xs font-semibold text-sky-800 hover:underline">{language === 'en' ? 'All tests' : 'सभी टेस्ट'}</a>
    </div>
    {status === 'loading' && <p role="status" className="text-xs text-slate-500">{language === 'en' ? 'Loading tests…' : 'टेस्ट लोड हो रहे हैं…'}</p>}
    {status === 'error' && <p role="status" className="text-xs text-slate-600">{language === 'en' ? 'Test updates temporarily unavailable.' : 'टेस्ट अपडेट अभी उपलब्ध नहीं हैं।'}</p>}
    {status === 'ready' && !tests.length && <p className="text-xs text-slate-500">{language === 'en' ? 'No published tests yet.' : 'अभी कोई प्रकाशित टेस्ट नहीं है।'}</p>}
    <div className="grid grid-cols-1 gap-2">
      {tests.map(test => <a key={test.id} href={base + '/online-tests/?testId=' + encodeURIComponent(test.id)} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-600">
        <div className="min-w-0"><span className="ksol-launch-new mb-1 inline-block origin-left text-sm font-black leading-tight tracking-wide" style={{ color: '#dc2626' }}>NEW</span><div className="text-[10px] font-semibold text-sky-700">Class {test.class_level} · {test.subject}</div><div className="break-words text-xs font-bold text-slate-900">{localized(test.title, language)}</div><div className="text-[10px] text-slate-500">{test.total_marks} Marks · {test.duration_minutes} min</div></div>
        <span className="shrink-0 text-[11px] font-bold text-sky-800">{language === 'en' ? 'View test' : 'टेस्ट देखें'} ›</span>
      </a>)}
    </div>
  </div>;
};


const LatestPresentationCovers: React.FC<{ onNavigate: (section: string) => void }> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const en = language === 'en';
  const [items, setItems] = useState<Presentation[]>([]);
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cover, setCover] = useState<{ id: string; url: string } | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);
  useEffect(() => {
    let alive = true, request = 0;
    const refresh = async () => {
      const current = ++request;
      try {
        const { data, error } = await requireSupabase().from('ksol_presentations')
          .select('*').eq('published', true).eq('status', 'ready')
          .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(4);
        if (error) throw error;
        if (alive && current === request) setItems((data ?? []) as Presentation[]);
      } catch {
        if (alive && current === request) setItems([]);
      } finally {
        if (alive && current === request) setLoading(false);
      }
    };
    const visibleRefresh = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const timer = window.setInterval(visibleRefresh, 15000);
    window.addEventListener('focus', visibleRefresh);
    document.addEventListener('visibilitychange', visibleRefresh);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener('focus', visibleRefresh); document.removeEventListener('visibilitychange', visibleRefresh); };
  }, []);
  const catalogueKey = items.map(item => item.id).join(',');
  useEffect(() => { setSelected(0); }, [catalogueKey]);
  const item = items[selected % Math.max(items.length, 1)];
  const coverId = item?.id;
  const active = items.find(p => p.id === activeId);
  useEffect(() => {
    if (!coverId) { setCover(null); return; }
    let cancelled = false, url = '';
    setCover(null); setCoverFailed(false);
    void fetchSlide(coverId, 1).then(blob => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setCover({ id: coverId, url });
    }).catch(() => { if (!cancelled) setCoverFailed(true); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [coverId]);
  useEffect(() => {
    if (paused || activeId || items.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setSelected(i => (i + 1) % items.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [paused, activeId, items.length, catalogueKey]);
  useEffect(() => { if (activeId && !active) setActiveId(null); }, [activeId, active]);
  const move = (direction: number) => setSelected(i => (i + direction + items.length) % items.length);
  return <aside aria-label={en ? 'Latest presentations' : 'नवीनतम प्रस्तुतियाँ'} className="min-w-0 rounded-2xl border border-sky-200 bg-slate-50 p-4 sm:p-5 shadow-sm">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><PresentationIcon className="h-5 w-5 text-sky-800" />{en ? 'Latest PPTs' : 'नवीनतम PPT'}</h2>
      <button type="button" onClick={() => onNavigate('materials')} className="text-xs font-bold text-sky-800 hover:underline">{en ? 'All study materials' : 'सभी अध्ययन सामग्री'} ›</button>
    </div>
    {item ? <>
      <button type="button" onClick={() => setActiveId(item.id)} className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-sky-600" aria-label={(en ? 'Open presentation: ' : 'प्रस्तुति खोलें: ') + item.title}>
        {cover?.id === item.id ? <img src={cover.url} alt={item.title} className="h-full w-full object-contain" draggable={false}/> : <span className="px-4 text-center text-sm text-slate-600">{coverFailed ? item.title : (en ? 'Loading cover…' : 'कवर लोड हो रहा है…')}</span>}
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg bg-slate-900/90 px-3 py-2 text-xs font-bold text-white"><Play size={15}/>{en ? 'View PPT' : 'PPT देखें'}</span>
      </button>
      <div className="mt-3 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-base font-extrabold text-slate-900">{item.title}</h3><p className="mt-1 text-xs text-slate-600">{en ? 'Class' : 'कक्षा'} {item.class_level} · {item.subject} · {item.slide_count} {en ? 'slides' : 'स्लाइड'}</p></div><span className="shrink-0 text-xs font-bold text-slate-500">{selected % items.length + 1} / {items.length}</span></div>
      {items.length > 1 && <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => move(-1)} aria-label={en ? 'Previous cover' : 'पिछला कवर'} className="rounded-lg border bg-white p-2"><ChevronLeft size={18}/></button>
        {items.map((p, i) => <button type="button" key={p.id} onClick={() => setSelected(i)} aria-label={p.title} aria-pressed={i === selected % items.length} className={'h-8 w-8 rounded-full text-xs font-bold ' + (i === selected % items.length ? 'bg-sky-900 text-white' : 'border bg-white text-slate-700')}>{i + 1}</button>)}
        <button type="button" onClick={() => move(1)} aria-label={en ? 'Next cover' : 'अगला कवर'} className="rounded-lg border bg-white p-2"><ChevronRight size={18}/></button>
        <button type="button" onClick={() => setPaused(p => !p)} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold">{paused ? (en ? 'Resume' : 'चलाएँ') : (en ? 'Pause' : 'रोकें')}</button>
      </div>}
    </> : <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">{loading ? (en ? 'Loading presentations…' : 'प्रस्तुतियाँ लोड हो रही हैं…') : (en ? 'New published presentations will appear here.' : 'नई प्रकाशित PPT यहाँ दिखाई देंगी।')}</div>}
    {active && <PresentationViewer key={active.id} item={active} en={en} onClose={() => setActiveId(null)}/>}
  </aside>;
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
    .slice(0, 200);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] items-stretch gap-6">
        <div className="relative min-h-[340px] min-w-0 rounded-2xl border border-sky-200 bg-slate-50 p-4 shadow-sm sm:p-5 lg:min-h-0">
        <div className="mb-3 border-b border-sky-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 shrink-0 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h2 className="whitespace-nowrap text-[clamp(10px,1vw,13px)] font-bold leading-tight tracking-tight text-slate-900">
                {language === 'en' ? 'Latest Announcements & Updates' : 'नवीनतम सूचनाएं एवं अपडेट्स'}
              </h2>
              <p className="mt-1 text-[10px] leading-tight text-slate-500">
                {language === 'en' ? 'Official updates' : 'आधिकारिक सूचनाएँ'}
              </p>
            </div>
          </div>
        </div>

        <div tabIndex={0} role="region" aria-label={language === 'en' ? 'Scrollable announcements and updates' : 'स्क्रॉल करने योग्य सूचनाएँ और अपडेट'} className="max-h-[520px] overflow-y-auto overscroll-y-contain pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600 lg:absolute lg:inset-x-4 lg:bottom-5 lg:top-[88px] lg:max-h-none">
        <LatestTestLaunches />

        {loading && <p className="py-5 text-sm text-slate-500">{language === 'en' ? 'Loading announcements…' : 'सूचनाएँ लोड हो रही हैं…'}</p>}
        {!loading && !error && visibleNotices.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
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
        </div>
        <LatestPresentationCovers onNavigate={onNavigate} />
      </div>
    </section>
  );
};
