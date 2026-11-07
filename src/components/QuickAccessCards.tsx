import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ClipboardList, BookOpen, Laptop, Newspaper, GraduationCap, ArrowRight } from 'lucide-react';

interface QuickAccessCardsProps { onNavigate: (section: string, filter?: string) => void; }

export const QuickAccessCards: React.FC<QuickAccessCardsProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const cards = [
    { id:'tests', title: language === 'en' ? 'All Exams' : 'सभी परीक्षाएं', desc: language === 'en' ? 'Teaching, UGC NET, UPSC, HPSC & More' : 'शिक्षक भर्ती, UGC NET, UPSC, HPSC', Icon:ClipboardList, color:'from-indigo-600 to-blue-800' },
    { id:'classes', title: language === 'en' ? 'Classes' : 'कक्षाएं', desc: language === 'en' ? 'Class-wise Study Resources' : 'कक्षावार अध्ययन सामग्री', Icon:BookOpen, color:'from-teal-400 to-teal-700' },
    { id:'tests', title: language === 'en' ? 'Tests' : 'टेस्ट', desc: language === 'en' ? 'Online Practice & Mock Tests' : 'ऑनलाइन अभ्यास एवं मॉक टेस्ट', Icon:Laptop, color:'from-amber-400 to-orange-600' },
    { id:'affairs', title: language === 'en' ? 'Current Affairs' : 'करेंट अफेयर्स', desc: language === 'en' ? 'National & International Updates' : 'राष्ट्रीय एवं अंतरराष्ट्रीय अपडेट', Icon:Newspaper, color:'from-pink-500 to-rose-700' },
    { id:'materials', title: language === 'en' ? 'Study Materials' : 'अध्ययन सामग्री', desc: language === 'en' ? 'Notes, MCQs, PYQs & PDFs' : 'नोट्स, MCQs, PYQs एवं PDF', Icon:GraduationCap, color:'from-sky-500 to-blue-800' },
  ];
  return (
    <section className="py-6 sm:py-8 bg-[#f7faff]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {cards.map(({id,title,desc,Icon,color}) => <button key={title} onClick={() => onNavigate(id)} className={`group min-h-[145px] rounded-2xl bg-gradient-to-br ${color} p-4 sm:p-5 text-left text-white shadow-lg transition duration-200 hover:-translate-y-1 hover:shadow-xl flex items-center gap-3`}>
            <Icon className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 drop-shadow" strokeWidth={1.8} />
            <span className="min-w-0 flex-1"><span className="block text-lg sm:text-xl font-extrabold leading-tight">{title}</span><span className="mt-2 block text-xs sm:text-sm leading-snug text-white/95">{desc}</span><span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-slate-900"><ArrowRight className="w-4 h-4" /></span></span>
          </button>)}
        </div>
      </div>
    </section>
  );
};
