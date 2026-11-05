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

export const PageHeaderBanner: React.FC<PageHeaderBannerProps> = ({
  titleEn,
  titleHi,
  subtitleEn,
  subtitleHi,
  badgeEn,
  badgeHi,
  icon: Icon,
  onBackHome,
  actions,
}) => {
  const { language } = useLanguage();

  return (
    <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* Top Breadcrumb & Return to Home */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-300">
            <button
              onClick={onBackHome}
              className="inline-flex items-center gap-1 hover:text-amber-300 transition-colors font-medium"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Home' : 'मुख्य पृष्ठ'}</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-amber-300 font-semibold">
              {language === 'en' ? titleEn : titleHi}
            </span>
          </nav>

          <button
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-200 transition-colors backdrop-blur-xs border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Back to Home' : 'मुख्य पृष्ठ पर वापस जाएं'}</span>
          </button>
        </div>

        {/* Header Main Details */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <Icon className="w-3.5 h-3.5" />
              <span>{language === 'en' ? badgeEn : badgeHi}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight text-white leading-tight">
              {language === 'en' ? titleEn : titleHi}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {language === 'en' ? subtitleEn : subtitleHi}
            </p>
          </div>

          {actions && (
            <div className="shrink-0 flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
