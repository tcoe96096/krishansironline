import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, FileText, Bell, ClipboardList, ShieldCheck } from 'lucide-react';

type Section = 'announcements' | 'questions' | 'materials' | 'tests';

const CONFIG: Record<Section, { title: string; subtitle: string; icon: React.ElementType }> = {
  announcements: { title: 'Latest from Admin', subtitle: 'नई सूचनाएँ', icon: Bell },
  questions: { title: 'Teacher Question Bank', subtitle: 'शिक्षक द्वारा जोड़े गए प्रश्न', icon: ClipboardList },
  materials: { title: 'New Study Materials', subtitle: 'नई अध्ययन सामग्री', icon: BookOpen },
  tests: { title: 'Published Online Tests', subtitle: 'ऑनलाइन टेस्ट', icon: FileText },
};

interface Props { section: Section; }

/**
 * Legacy Apps Script JSONP feed intentionally removed. Public content must be
 * served from the approved Supabase/Drive workflow, with authorization and
 * publication checks, rather than an unauthenticated third-party endpoint.
 */
export const LiveAdminContent: React.FC<Props> = ({ section }) => {
  const { language } = useLanguage();
  const cfg = CONFIG[section];
  const Icon = cfg.icon;

  return (
    <section className="py-6 bg-slate-50 border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center"><Icon className="w-4 h-4" /></span>
          <div>
            <h3 className="font-bold text-slate-900 text-base">{language === 'hi' ? cfg.subtitle : cfg.title}</h3>
            <p className="text-[11px] text-slate-500">{language === 'hi' ? 'सत्यापित और अधिकृत प्रकाशन के बाद सामग्री यहाँ दिखाई जाएगी।' : 'Content will appear here after verified and authorized publishing.'}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{language === 'hi' ? 'पुराना बाहरी Apps Script feed बंद है। नई सामग्री स्वीकृत सिस्टम से जोड़ी जाएगी।' : 'The legacy external Apps Script feed is disabled. New content will use the approved platform workflow.'}</span>
        </div>
      </div>
    </section>
  );
};
