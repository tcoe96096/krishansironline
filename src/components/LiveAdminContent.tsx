import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { requireSupabase } from '../lib/supabase';
import { BookOpen, FileText, Bell, ClipboardList, ExternalLink } from 'lucide-react';

type Section = 'announcements' | 'questions' | 'materials' | 'tests';
type Item = Record<string, any> & { id: string };

const CONFIG: Record<Section, { title: string; subtitle: string; icon: React.ElementType }> = {
  announcements: { title: 'Latest from Admin', subtitle: 'नई सूचनाएँ', icon: Bell },
  questions: { title: 'Teacher Question Bank', subtitle: 'शिक्षक द्वारा जोड़े गए प्रश्न', icon: ClipboardList },
  materials: { title: 'New Study Materials', subtitle: 'नई अध्ययन सामग्री', icon: BookOpen },
  tests: { title: 'Published Online Tests', subtitle: 'ऑनलाइन टेस्ट', icon: FileText },
};

interface Props { section: Section; }

const localized = (value: any, language: string): string => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return language === 'hi' ? (value.hi || value.en || '') : (value.en || value.hi || '');
};

export const LiveAdminContent: React.FC<Props> = ({ section }) => {
  const { language } = useLanguage();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const client = requireSupabase();
        let rows: any[] = [];
        if (section === 'announcements') {
          const result = await client.from('site_notices')
            .select('id,title,details,category,published_at,display_order')
            .eq('is_published', true)
            .order('display_order', { ascending: true })
            .order('published_at', { ascending: false });
          if (result.error) throw result.error;
          rows = (result.data ?? []).map((row: any) => ({ ...row, date: row.published_at }));
        } else if (section === 'tests') {
          const result = await client.from('tests')
            .select('id,title,class_level,subject,chapter,created_at')
            .eq('is_published', true)
            .order('created_at', { ascending: false });
          if (result.error) throw result.error;
          rows = (result.data ?? []).map((row: any) => ({ ...row, testId: row.id }));
        } else {
          const result = await client.from('admin_content_items')
            .select('id,title,details,class_level,subject,chapter,category,question,options,explanation,file_url,external_url,published_at,display_order')
            .eq('section', section)
            .eq('is_published', true)
            .order('display_order', { ascending: true })
            .order('published_at', { ascending: false });
          if (result.error) throw result.error;
          rows = result.data ?? [];
        }
        if (active) { setItems(rows as Item[]); setError(false); }
      } catch (err) {
        console.error('Unable to load published admin content from Supabase:', err);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
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
          {items.map((item) => {
            const title = localized(item.title, language) || localized(item.question, language) || item.testId || 'Learning Resource';
            const details = localized(item.details, language) || localized(item.description, language) || localized(item.explanation, language);
            const link = item.file_url || item.external_url || item.link;
            const options = Array.isArray(item.options) ? item.options : item.options?.[language] || item.options?.en || [];
            return (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] text-sky-800 font-semibold mb-1">
                  {[item.class_level && 'Class ' + item.class_level, item.subject, item.chapter, item.category].filter(Boolean).join(' · ')}
                </div>
                <h4 className="font-bold text-sm text-slate-900">{title}</h4>
                {details && <p className="text-xs text-slate-600 mt-2 whitespace-pre-line">{details}</p>}
                {options.length > 0 && <p className="text-xs text-slate-600 mt-2">{options.join(' · ')}</p>}
                {item.published_at && <p className="text-[11px] text-slate-400 mt-2">{new Date(item.published_at).toLocaleDateString()}</p>}
                {link && (
                  <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-sky-800 hover:text-sky-950">
                    {item.file_url ? (language === 'hi' ? 'PDF खोलें' : 'Open PDF') : item.external_url ? (language === 'hi' ? 'और देखें' : 'Open') : (language === 'hi' ? 'और देखें' : 'Open')} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
