import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Home, ChevronRight, LucideIcon } from 'lucide-react';

interface PageHeaderBannerProps {
  titleEn: string;
  titleHi: string;
  subtitleEn: string;
  subtitleHi: string;
  badgeEn: string;
  badgeHi: string;
  icon: LucideIcon;
  onBackHome: () => void;
  actions?: React.ReactNode;
}

export const PageHeaderBanner: React.FC<PageHeaderBannerProps> = ({ titleEn, titleHi, subtitleEn, subtitleHi, badgeEn, badgeHi, icon: Icon, onBackHome, actions }) => {
  const { language } = useLanguage();
  return (
    <section className="relative isolate overflow-hidden border-b border-sky-100 bg-gradient-to-br from-[#edf6ff] via-white to-[#e7f5f5] text-slate-900">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_88%_8%,rgba(14,116,144,.10),transparent_34%)]" />
      <div className="absolute -right-12 -top-24 -z-10 h-72 w-72 rounded-full border border-sky-200/50" />
      <div className="absolute right-16 -bottom-36 -z-10 h-72 w-72 rounded-full border border-teal-200/40" />
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500">
            <button onClick={onBackHome} className="inline-flex items-center gap-1 hover:text-teal-700 transition-colors font-semibold"><Home className="w-3.5 h-3.5" /><span>{language === 'en' ? 'Home' : 'मुख्य पृष्ठ'}</span></button>
            <ChevronRight className="w-3.5 h-3.5 text-blue-200/60" /><span className="text-sky-800 font-bold line-clamp-1">{language === 'en' ? titleEn : titleHi}</span>
          </nav>
          <button onClick={onBackHome} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-sky-50 text-[11px] font-semibold text-sky-900 transition-colors border border-sky-200 shadow-sm"><ArrowLeft className="w-3.5 h-3.5" /><span>{language === 'en' ? 'Back to Home' : 'मुख्य पृष्ठ पर वापस जाएं'}</span></button>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-800 text-[10px] sm:text-xs font-bold tracking-wide"><Icon className="w-4 h-4 text-amber-300" /><span>{language === 'en' ? badgeEn : badgeHi}</span></div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#12396f] leading-tight">{language === 'en' ? titleEn : titleHi}</h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">{language === 'en' ? subtitleEn : subtitleHi}</p>
          </div>
          {actions && <div className="shrink-0 flex items-center gap-3">{actions}</div>}
        </div>
      </div>
    </section>
  );
};
