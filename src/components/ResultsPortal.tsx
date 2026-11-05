import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { GraduationCap, ShieldCheck, Clock } from 'lucide-react';

/**
 * Public results are intentionally withheld until a verified, authorized
 * result source is connected. The previous repository contained demonstration
 * student records; those must never be presented as official school results.
 */
export const ResultsPortal: React.FC = () => {
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  return (
    <section id="results" className="py-14 bg-white border-b border-slate-200/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>{isEnglish ? 'Student Results Portal' : 'विद्यार्थी परीक्षा परिणाम पोर्टल'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            {isEnglish ? 'Online Student Result Portal' : 'ऑनलाइन विद्यार्थी परीक्षा परिणाम पोर्टल'}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {isEnglish
              ? 'Verified examination records will appear here after the authorized result source is connected.'
              : 'अधिकृत परिणाम स्रोत जोड़े जाने और रिकॉर्ड सत्यापित होने के बाद ही परीक्षा परिणाम यहाँ उपलब्ध होंगे।'}
          </p>
        </div>

        <div className="max-w-2xl mx-auto rounded-2xl border border-amber-200 bg-amber-50/70 p-6 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-amber-200 text-amber-700 mx-auto flex items-center justify-center mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {isEnglish ? 'Result service is being configured' : 'परिणाम सेवा तैयार की जा रही है'}
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            {isEnglish
              ? 'No student result is currently published on this page. To protect student privacy and prevent incorrect marksheets, sample records have been removed. Please contact the teacher or school for verified results.'
              : 'इस पृष्ठ पर अभी किसी विद्यार्थी का परिणाम प्रकाशित नहीं किया गया है। विद्यार्थियों की गोपनीयता और गलत अंकतालिका से बचाव के लिए नमूना रिकॉर्ड हटा दिए गए हैं। प्रमाणित परिणाम के लिए शिक्षक या विद्यालय से संपर्क करें।'}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="w-4 h-4" />
            <span>{isEnglish ? 'Only verified records will be published' : 'केवल सत्यापित रिकॉर्ड ही प्रकाशित होंगे'}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
