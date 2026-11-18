import React from 'react';
import { GraduationCap, LogIn, UserRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

type FloatingStudentLoginProps = { onClick: () => void; showTeacherPreview?: boolean };

export const FloatingStudentLogin: React.FC<FloatingStudentLoginProps> = ({ onClick, showTeacherPreview = false }) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const en = language === 'en';
  const teacherPreviewUrl = import.meta.env.BASE_URL.includes('krishansironline-preview-unified')
    ? `${import.meta.env.BASE_URL}teacher-beta/` : `${import.meta.env.BASE_URL}teacher-v2-preview/`;
  if (user) return null;
  return (
    <div className="fixed bottom-3 right-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-end gap-2 sm:bottom-7 sm:right-7" role="group" aria-label={en ? 'Student and Teacher access' : 'विद्यार्थी और शिक्षक प्रवेश'}>
      {showTeacherPreview && <a href={teacherPreviewUrl} aria-label={en ? 'Teacher design preview' : 'शिक्षक डिज़ाइन पूर्वावलोकन'} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-sky-900 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 sm:min-h-14 sm:px-4 sm:text-sm"><GraduationCap className="h-5 w-5 shrink-0" aria-hidden="true"/><span>{en ? 'Teacher Demo' : 'शिक्षक डेमो'}</span></a>}
      <button
      type="button"
      onClick={onClick}
      aria-label={user ? (en ? 'Open student profile dashboard' : 'विद्यार्थी प्रोफ़ाइल डैशबोर्ड खोलें') : (en ? 'Open student login and registration' : 'विद्यार्थी लॉगिन और पंजीकरण खोलें')}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-gradient-to-r from-emerald-700 via-teal-700 to-sky-800 px-3 py-2 text-xs font-bold text-white shadow-[0_12px_35px_rgba(15,118,110,0.35)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,118,110,0.42)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 active:translate-y-0 sm:min-h-14 sm:gap-2.5 sm:px-5 sm:py-3 sm:text-sm"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 sm:h-8 sm:w-8">
        {user ? <UserRound className="h-5 w-5" aria-hidden="true" /> : <GraduationCap className="h-5 w-5" aria-hidden="true" />}
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span>{user ? (en ? 'Student Profile' : 'विद्यार्थी प्रोफ़ाइल') : (en ? 'Student Login' : 'विद्यार्थी लॉगिन')}</span>
        <span className="mt-0.5 hidden text-[10px] font-medium text-white/80 sm:block">
          {user ? (en ? 'Open Dashboard' : 'डैशबोर्ड खोलें') : (en ? 'Login / Register' : 'लॉगिन / पंजीकरण')}
        </span>
      </span>
      <LogIn className="ml-0.5 h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
