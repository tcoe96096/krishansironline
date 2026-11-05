import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, FileText, Bell, ClipboardList, ExternalLink } from 'lucide-react';

const API_URL = 'https://script.google.com/macros/s/AKfycbwfc1ERULBNJ_tu9mKWK4kLcfx88Mw0bbHwlCcmUk82GNk0tV78bBvLyeBPlBvXWX-u/exec';

type Section = 'announcements' | 'questions' | 'materials' | 'tests';
type Item = Record<string, any> & { id?: string };

const CONFIG: Record<Section, { title: string; subtitle: string; icon: React.ElementType }> = {
  announcements: { title: 'Latest from Admin', subtitle: 'नई सूचनाएँ', icon: Bell },
  questions: { title: 'Teacher Question Bank', subtitle: 'शिक्षक द्वारा जोड़े गए प्रश्न', icon: ClipboardList },
  materials: { title: 'New Study Materials', subtitle: 'नई अध्ययन सामग्री', icon: BookOpen },
  tests: { title: 'Published Online Tests', subtitle: 'ऑनलाइन टेस्ट', icon: FileText },
};

declare global {
  interface Window {
    [key: string]: any;
  }
}

interface Props { section: Section; }

export const LiveAdminContent: React.FC<Props> = ({ section }) => {
  const { language } = useLanguage();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const callbackName = '__krishanAdmin_' + section + '_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      if (active) { setLoading(false); setError(true); }
      delete window[callbackName];
      script.remove();
    }, 12000);

    window[callbackName] = (response: any) => {
      window.clearTimeout(timeout);
      if (active) {
        if (response?.status === 'success' && Array.isArray(response.items)) {
          setItems(response.items);
          setError(false);
        } else {
          setError(true);
        }
        setLoading(false);
      }
      delete window[callbackName];
      script.remove();
    };

    script.src = API_URL + '?api=public&section=' + encodeURIComponent(section) + '&callback=' + callbackName;
    script.onerror = () => {
      window.clearTimeout(timeout);
      if (active) { setLoading(false); setError(true); }
      delete window[callbackName];
    };
    document.body.appendChild(script);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    };
  }, [section]);

  if (loading) return <div className="text-xs text-slate-400 py-2">Loading latest updates…</div>;
  if (error) return <div className="text-xs text-slate-400 py-2">Live updates are temporarily unavailable.</div>;
  if (!items.length) return null;

  const cfg = CONFIG[section];
  const Icon = cfg.icon;

  return (
    <section className="py-6 bg-slate-50 border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center"><Icon className="w-4 h-4" /></span>
          <div>
            <h3 className="font-bold text-slate-900 text-base">{language === 'hi' ? cfg.subtitle : cfg.title}</h3>
            <p className="text-[11px] text-slate-500">{language === 'hi' ? 'Admin Dashboard से प्रकाशित' : 'Published from Admin Dashboard'}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item, index) => (
            <article key={item.id || index} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[11px] text-sky-800 font-semibold mb-1">
                {[item.classLevel && 'Class ' + item.classLevel, item.subject, item.chapter, item.category].filter(Boolean).join(' · ')}
              </div>
              <h4 className="font-bold text-sm text-slate-900">{item.title || item.question || item.testId || 'Learning Resource'}</h4>
              {(item.details || item.description || item.explanation) && <p className="text-xs text-slate-600 mt-2 whitespace-pre-line">{item.details || item.description || item.explanation}</p>}
              {item.question && item.options && <p className="text-xs text-slate-600 mt-2">{Array.isArray(item.options) ? item.options.join(' · ') : String(item.options)}</p>}
              {item.date && <p className="text-[11px] text-slate-400 mt-2">{item.date}</p>}
              {(item.pdfUrl || item.googleFormUrl || item.link) && (
                <a href={item.pdfUrl || item.googleFormUrl || item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-sky-800 hover:text-sky-950">
                  {item.pdfUrl ? (language === 'hi' ? 'PDF खोलें' : 'Open PDF') : item.googleFormUrl ? (language === 'hi' ? 'टेस्ट दें' : 'Attempt Test') : (language === 'hi' ? 'और देखें' : 'Open')} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
