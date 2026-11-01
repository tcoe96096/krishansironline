import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Award, FileText, CheckSquare, GraduationCap, Landmark, BookOpen, Bell, RefreshCw, ArrowUpRight } from 'lucide-react';

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
      id: 'materials',
      icon: FileText,
      title: t('quick.studyMaterials'),
      titleHi: 'अध्ययन सामग्री',
      desc: {
        en: 'Structured NCERT revision notes, summary points, key terms, and printable PDF documents.',
        hi: 'एनसीईआरटी आधारित संक्षिप्त नोट्स, मुख्य बिंदु और डाउनलोड करने योग्य पीडीएफ सामग्री।',
      },
      tag: 'NCERT & HBSE',
      color: 'indigo',
    },
    {
      id: 'questions',
      icon: CheckSquare,
      title: t('quick.questionBank'),
      titleHi: 'वस्तुनिष्ठ प्रश्न बैंक',
      desc: {
        en: 'Comprehensive multiple-choice questions with answer reveal, 3-mark, and 5-mark board answers.',
        hi: 'अध्यायवार बहुविकल्पीय प्रश्न (MCQ), 3 और 5 अंक वाले मॉडल उत्तर एवं मानचित्र अभ्यास।',
      },
      tag: 'Exam Focused',
      color: 'emerald',
    },
    {
      id: 'results',
      icon: GraduationCap,
      title: t('quick.results'),
      titleHi: 'परीक्षा परिणाम',
      desc: {
        en: 'Searchable authorized roll number marksheet lookup and merit certificates for GGHS Dhanger.',
        hi: 'रोल नंबर द्वारा अंकतालिका खोजें, विषयवार प्राप्तांक और आधिकारिक मेरिट प्रमाण पत्र।',
      },
      tag: 'GGHS Portal',
      color: 'amber',
    },
    {
      id: 'polity',
      icon: Landmark,
      title: t('quick.constitution'),
      titleHi: 'भारतीय संविधान',
      desc: {
        en: 'Interactive Preamble explorer, Fundamental Rights, Articles, and constitutional provisions.',
        hi: 'प्रस्तावना के मुख्य शब्दों की व्याख्या, मौलिक अधिकार और महत्वपूर्ण संवैधानिक अनुच्छेद।',
      },
      tag: 'Interactive Tool',
      color: 'rose',
    },
    {
      id: 'polity',
      icon: BookOpen,
      title: t('quick.politicalScience'),
      titleHi: 'राजनीति विज्ञान',
      desc: {
        en: 'Democratic politics, Federalism, Power sharing, and competitive polity foundations.',
        hi: 'लोकतांत्रिक राजनीति, संघवाद, सत्ता की साझेदारी और प्रतियोगी परीक्षाओं हेतु राजव्यवस्था।',
      },
      tag: 'Specialized Hub',
      color: 'cyan',
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
    {
      id: 'materials',
      icon: RefreshCw,
      title: t('quick.revision'),
      titleHi: 'पुनरावृत्ति संसाधन',
      desc: {
        en: 'Rapid revision charts, timeline summaries, and high-yield board question collections.',
        hi: 'त्वरित पुनरावृत्ति चार्ट, ऐतिहासिक तिथिक्रम और बोर्ड परीक्षा के संभावित प्रश्न संग्रह।',
      },
      tag: 'Quick Review',
      color: 'teal',
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
              ? 'Direct gateways to tests, question banks, study notes, and school results'
              : 'ऑनलाइन टेस्ट, प्रश्न बैंक, अध्ययन सामग्री एवं परीक्षा परिणाम तक त्वरित पहुंच'}
          </p>
        </div>

        {/* 8 Cards Grid */}
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
