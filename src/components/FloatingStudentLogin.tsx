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
      className="fixed bottom-5 right-4 sm:bottom-7 sm:right-7 z-50 inline-flex min-h-14 items-center gap-2.5 rounded-full border border-white/25 bg-gradient-to-r from-emerald-700 via-teal-700 to-sky-800 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_35px_rgba(15,118,110,0.35)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,118,110,0.42)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 active:translate-y-0"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
        <GraduationCap className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span>{en ? 'Student Login' : 'विद्यार्थी लॉगिन'}</span>
        <span className="mt-0.5 text-[10px] font-medium text-white/80">
          {en ? 'Login / Register' : 'लॉगिन / पंजीकरण'}
        </span>
      </span>
      <LogIn className="ml-0.5 h-4 w-4 opacity-90" aria-hidden="true" />
    </button>
  );
};
