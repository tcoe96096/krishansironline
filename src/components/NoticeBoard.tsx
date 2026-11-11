import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Bell, ShieldCheck } from 'lucide-react';

interface NoticeBoardProps {
  onNavigate: (section: string) => void;
}

/**
 * The legacy public Google Apps Script notice feed is disabled.
 * Notices will return when the authenticated, approved publishing workflow is connected.
 */
export const NoticeBoard: React.FC<NoticeBoardProps> = () => {
  const { language } = useLanguage();

  return (
    <section className="py-10 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {language === 'en' ? 'Latest Announcements & Updates' : 'नवीनतम सूचनाएं एवं अपडेट्स'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'en'
                ? 'Official updates will appear here after authorized publication.'
                : 'अधिकृत रूप से प्रकाशित होने के बाद सूचनाएँ यहाँ दिखाई जाएँगी।'}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            {language === 'en'
              ? 'The legacy external notice feed is disabled. No test or unverified announcements are displayed.'
              : 'पुराना बाहरी नोटिस फीड बंद है। कोई परीक्षण या अप्रमाणित सूचना प्रदर्शित नहीं की जा रही है।'}
          </span>
        </div>
      </div>
    </section>
  );
};
