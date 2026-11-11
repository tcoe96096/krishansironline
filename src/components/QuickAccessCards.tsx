import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ClipboardList, BookOpen, Laptop, Newspaper, GraduationCap, ArrowUpRight } from 'lucide-react';

interface QuickAccessCardsProps { onNavigate: (section: string, filter?: string) => void; }

export const QuickAccessCards: React.FC<QuickAccessCardsProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const cards = [
    { id:'exams', title: language === 'en' ? 'All Exams' : 'सभी परीक्षाएं', desc: language === 'en' ? 'Teaching, UGC NET, UPSC, HPSC & More' : 'शिक्षक भर्ती, UGC NET, UPSC, HPSC', Icon:ClipboardList, color:'from-indigo-600 to-blue-900' },
    { id:'classes', title: language === 'en' ? 'Classes' : 'कक्षाएं', desc: language === 'en' ? 'Class-wise Study Resources' : 'कक्षावार अध्ययन सामग्री', Icon:BookOpen, color:'from-teal-500 to-emerald-800' },
    { id:'tests', title: language === 'en' ? 'Tests' : 'टेस्ट', desc: language === 'en' ? 'Online Practice & Mock Tests' : 'ऑनलाइन अभ्यास एवं मॉक टेस्ट', Icon:Laptop, color:'from-amber-500 to-orange-700' },
    { id:'affairs', title: language === 'en' ? 'Current Affairs' : 'करेंट अफेयर्स', desc: language === 'en' ? 'National & International Updates' : 'राष्ट्रीय एवं अंतरराष्ट्रीय अपडेट', Icon:Newspaper, color:'from-rose-500 to-pink-800' },
    { id:'materials', title: language === 'en' ? 'Study Materials' : 'अध्ययन सामग्री', desc: language === 'en' ? 'Notes, MCQs, PYQs & PDFs' : 'नोट्स, MCQs, PYQs एवं PDF', Icon:GraduationCap, color:'from-sky-600 to-blue-900' },
  ];
  return (
    <section className="relative py-8 sm:py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div><p className="text-[10px] sm:text-xs font-extrabold tracking-[.16em] uppercase text-[#0b6691]">{language === 'en' ? 'Explore the portal' : 'पोर्टल के मुख्य भाग'}</p><h2 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-[#102f63]">{language === 'en' ? 'Quick Access' : 'त्वरित प्रवेश'}</h2></div>
          <p className="text-xs text-slate-500">{language === 'en' ? 'Your learning tools, one click away' : 'आपके सभी अध्ययन साधन एक क्लिक पर'}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {cards.map(({id,title,desc,Icon,color}, index) => <button key={title} onClick={() => onNavigate(id)} className={`group relative min-h-[148px] overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-4 sm:p-5 text-left text-white shadow-[0_12px_26px_rgba(13,43,82,.14)] transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300`}>
            <span className="absolute -right-5 -top-5 h-28 w-28 rounded-full border border-white/15 bg-white/5 transition-transform duration-300 group-hover:scale-125" />
            <span className="relative flex h-full flex-col justify-between gap-4">
              <span className="flex items-start justify-between"><Icon className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 drop-shadow" strokeWidth={1.7} /><span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold">0{index + 1}</span></span>
              <span><span className="block text-lg font-extrabold leading-tight">{title}</span><span className="mt-1 block text-[11px] sm:text-xs leading-snug text-white/85">{desc}</span></span>
              <ArrowUpRight className="absolute bottom-0 right-0 w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
            </span>
          </button>)}
        </div>
      </div>
    </section>
  );
};
