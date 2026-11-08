import React from 'react';
import { GraduationCap, LogIn } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

type FloatingStudentLoginProps = { onClick: () => void };

export const FloatingStudentLogin: React.FC<FloatingStudentLoginProps> = ({ onClick }) => {
  const { language } = useLanguage();
  const en = language === 'en';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={en ? 'Open student login and registration' : 'विद्यार्थी लॉगिन और पंजीकरण खोलें'}
      className="fixed bottom-3 right-3 sm:bottom-7 sm:right-7 z-50 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-gradient-to-r from-emerald-700 via-teal-700 to-sky-800 px-3 py-2 text-xs font-bold text-white shadow-[0_12px_35px_rgba(15,118,110,0.35)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,118,110,0.42)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 active:translate-y-0 sm:min-h-14 sm:gap-2.5 sm:px-5 sm:py-3 sm:text-sm"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 sm:h-8 sm:w-8">
        <GraduationCap className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span>{en ? 'Student Login' : 'विद्यार्थी लॉगिन'}</span>
        <span className="mt-0.5 hidden text-[10px] font-medium text-white/80 sm:block">
          {en ? 'Login / Register' : 'लॉगिन / पंजीकरण'}
        </span>
      </span>
      <LogIn className="ml-0.5 h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden="true" />
    </button>
  );
};
