import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Bell, Calendar, ExternalLink, RefreshCw } from 'lucide-react';

interface NoticeBoardProps {
  onNavigate: (section: string) => void;
}

interface PublicNotice {
  id?: string;
  title?: string | { en?: string; hi?: string };
  details?: string | { en?: string; hi?: string };
  category?: string;
  date?: string;
  link?: string;
}

const API_URL = 'https://script.google.com/macros/s/AKfycbwfc1ERULBNJ_tu9mKWK4kLcfx88Mw0bbHwlCcmUk82GNk0tV78bBvLyeBPlBvXWX-u/exec';

declare global {
  interface Window {
    [key: string]: any;
  }
}

function localized(value: PublicNotice['title'] | PublicNotice['details'], language: string): string {
  if (typeof value === 'string') return value;
  if (!value) return '';
  return language === 'hi'
    ? (value.hi || value.en || '')
    : (value.en || value.hi || '');
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const [notices, setNotices] = useState<PublicNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const callbackName = '__krishanAnnouncements_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      if (!active) return;
      setLoading(false);
      setError(true);
      delete window[callbackName];
      script.remove();
    }, 15000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (response: any) => {
      cleanup();
      if (!active) return;
      if (response?.status === 'success' && Array.isArray(response.items)) {
        setNotices(response.items);
        setError(false);
      } else {
        setError(true);
      }
      setLoading(false);
    };

    script.onerror = () => {
      cleanup();
      if (!active) return;
      setError(true);
      setLoading(false);
    };

    script.src = API_URL
      + '?api=public&section=announcements&callback='
      + encodeURIComponent(callbackName)
      + '&_=' + Date.now();

    document.body.appendChild(script);

    return () => {
      active = false;
      cleanup();
    };
  }, [refreshKey]);

  const openNoticeLink = (link?: string) => {
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

  // Suppress the known internal placeholder if it is still present in the
  // legacy announcements feed. Real announcements remain untouched.
  const visibleNotices = notices.filter((notice) => {
    const title = localized(notice.title, 'en').trim().toLowerCase();
    const details = localized(notice.details, 'en').trim().toLowerCase();
    return !(title === 'dashboard testing' && details === 'testing');
  });

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
                {language === 'en'
                  ? 'Official updates published from the Admin Dashboard'
                  : 'Admin Dashboard से प्रकाशित आधिकारिक सूचनाएँ'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setLoading(true); setError(false); setRefreshKey((key) => key + 1); }}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-2 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {language === 'en' ? 'Refresh updates' : 'सूचनाएँ रिफ्रेश करें'}
          </button>
        </div>

        {loading && (
          <p className="py-5 text-sm text-slate-500">
            {language === 'en' ? 'Loading announcements…' : 'सूचनाएँ लोड हो रही हैं…'}
          </p>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {language === 'en'
              ? 'Announcements could not be loaded. Please try Refresh updates.'
              : 'सूचनाएँ लोड नहीं हो सकीं। कृपया रिफ्रेश करें।'}
          </div>
        )}

        {!loading && !error && visibleNotices.length === 0 && (
          <p className="py-5 text-sm text-slate-500">
            {language === 'en' ? 'No announcements have been published yet.' : 'अभी कोई सूचना प्रकाशित नहीं हुई है।'}
          </p>
        )}

        {!loading && !error && visibleNotices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleNotices.map((notice, index) => {
              const title = localized(notice.title, language);
              const details = localized(notice.details, language);
              return (
                <article
                  key={notice.id || index}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <span className={`px-2 py-0.5 rounded-sm font-semibold border text-[11px] ${categoryClass(notice.category || '')}`}>
                      {notice.category || (language === 'en' ? 'Notice' : 'सूचना')}
                    </span>
                    {notice.date && (
                      <span className="text-slate-400 font-mono text-[11px] inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {notice.date}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {title || (language === 'en' ? 'Announcement' : 'सूचना')}
                  </h3>
                  {details && (
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {details}
                    </p>
                  )}
                  {notice.link && (
                    <button
                      type="button"
                      onClick={() => openNoticeLink(notice.link)}
                      className="mt-3 pt-2.5 border-t border-slate-100 w-full flex items-center justify-between text-xs font-semibold text-sky-700 hover:text-sky-900"
                    >
                      <span>{language === 'en' ? 'Open Resource' : 'संसाधन देखें'}</span>
                      <ExternalLink className="w-3 h-3" />
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
