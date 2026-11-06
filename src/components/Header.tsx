import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Search, Globe } from 'lucide-react';

interface HeaderProps {
  onNavigate: (section: string) => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, onOpenSearch }) => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-colors">
      <div className="bg-slate-900 text-slate-100 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
            <span className="font-medium tracking-wide truncate">
              {language === 'en'
                ? 'Free Online Learning Portal • Learn • Practice • Improve • Succeed'
                : 'निःशुल्क ऑनलाइन लर्निंग पोर्टल • सीखें • अभ्यास करें • सुधार करें • सफलता प्राप्त करें'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-slate-300 text-xs shrink-0">
            <span>HBSE &amp; CBSE Syllabus</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>Classes 6–12</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-amber-300 font-semibold">By Krishan Sir (TGT Social Science)</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex min-h-[72px] sm:min-h-[88px] items-center justify-between gap-2 sm:gap-4">
          <button
            onClick={() => onNavigate('home')}
            className="flex min-w-0 items-center gap-2 sm:gap-3 text-left group focus:outline-hidden py-1"
            aria-label="Krishan Sir home"
          >
            <img
              src={`${import.meta.env.BASE_URL}images/krishan-sir-logo.svg`}
              alt="Krishan Sir logo"
              className="h-10 w-10 sm:h-[60px] sm:w-[60px] shrink-0 object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col justify-center min-w-0">
              <div
                className="whitespace-nowrap text-[21px] sm:text-[30px] leading-tight font-bold tracking-tight text-left select-none text-[#1f4d89]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Krishan Sir
              </div>
              <p
                style={{
                  fontSize: 'clamp(9px, 2.5vw, 14px)',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                  color: '#3168b5',
                  backgroundColor: '#def0ef',
                  fontWeight: 'bold',
                  textAlign: 'left',
                }}
                className="px-2 py-0.5 rounded-sm inline-block mt-1 self-start whitespace-nowrap"
              >
                Online Learning Portal
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={onOpenSearch}
              className="p-2 sm:p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
              title="Search Portal (Ctrl+K)"
              aria-label="Search"
            >
              <Search className="w-4 h-4 text-slate-600" />
            </button>

            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              title={language === 'en' ? 'Switch to Hindi (हिंदी में पढ़ें)' : 'Switch to English'}
              aria-label={language === 'en' ? 'Switch language to Hindi' : 'Switch language to English'}
            >
              <Globe className="w-4 h-4 text-sky-700" />
              <span>{language === 'en' ? 'हिंदी' : 'English'}</span>
            </button>

            <a
              href="https://script.google.com/macros/s/AKfycbwfc1ERULBNJ_tu9mKWK4kLcfx88Mw0bbHwlCcmUk82GNk0tV78bBvLyeBPlBvXWX-u/exec"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2.5 sm:px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-xs font-bold text-sky-900 hover:bg-sky-100 transition-colors"
              title="Open Admin Dashboard"
            >Admin</a>
          </div>
        </div>
      </div>
    </header>
  );
};
