import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Award, FileText, Bell, ArrowUpRight } from 'lucide-react';

interface QuickAccessCardsProps {
  onNavigate: (section: string, filter?: string) => void;
}

export const QuickAccessCards: React.FC<QuickAccessCardsProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();

  const cards = [
    {
      id: 'tests',
      icon: Award,
      title: t('quick.onlineTests'),
      titleHi: 'ऑनलाइन टेस्ट',
      desc: {
        en: 'Chapter-wise CBT tests with live timers, instant scoring, and Hindi-English explanations.',
        hi: 'टाइमर युक्त ऑनलाइन टेस्ट, तुरंत मूल्यांकन और कृष्ण सर द्वारा विस्तृत समाधान।',
      },
      tag: 'CBT Simulator',
      color: 'sky',
    },
    {
      id: 'exams',
      icon: FileText,
      title: language === 'en' ? 'All Exams' : 'सभी परीक्षाएँ',
      titleHi: 'सभी परीक्षाएँ',
      desc: {
        en: 'Structured NCERT revision notes, summary points, key terms, and printable PDF documents.',
        hi: 'एनसीईआरटी आधारित संक्षिप्त नोट्स, मुख्य बिंदु और डाउनलोड करने योग्य पीडीएफ सामग्री।',
      },
      tag: 'NCERT & HBSE',
      color: 'indigo',
    },
    {
      id: 'notices',
      icon: Bell,
      title: t('quick.announcements'),
      titleHi: 'नवीनतम सूचनाएं',
      desc: {
        en: 'Timely updates on upcoming school assessments, board date sheets, and syllabus alerts.',
        hi: 'विद्यालयी टेस्ट, बोर्ड परीक्षा तिथियां और नए अध्ययन सामग्री की समयबद्ध सूचनाएं।',
      },
      tag: 'Daily Updates',
      color: 'violet',
    },
  ];

  return (
    <section className="py-12 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
            {t('quick.title')}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {language === 'en'
              ? 'Direct gateways to exam preparation, classes, tests, and updates'
              : 'परीक्षा तैयारी, कक्षाओं, टेस्ट और सूचनाओं तक त्वरित पहुंच'}
          </p>
        </div>

        {/* Quick Access Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <button
                key={idx}
                onClick={() => onNavigate(card.id)}
                className="group relative text-left bg-white rounded-xl p-5 border border-slate-200/90 hover:border-sky-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-800 flex items-center justify-center group-hover:bg-sky-900 group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 font-mono">
                      {card.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-900 transition-colors flex items-center justify-between">
                    <span>{language === 'hi' ? card.titleHi : card.title}</span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-800 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </h3>

                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {language === 'hi' ? card.desc.hi : card.desc.en}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-sky-800 group-hover:text-sky-950">
                  <span>{language === 'en' ? 'Open Section' : 'अनुभाग खोलें'}</span>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
