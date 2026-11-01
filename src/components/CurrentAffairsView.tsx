import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CURRENT_AFFAIRS } from '../data/portalData';
import { Globe, Calendar, Tag, BookOpen, Sparkles } from 'lucide-react';

export const CurrentAffairsView: React.FC = () => {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'National', 'Haryana State', 'Constitution & Polity'];

  const filteredItems = CURRENT_AFFAIRS.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  return (
    <section id="affairs" className="py-14 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
              <Globe className="w-4 h-4 text-sky-700" />
              <span>{language === 'en' ? 'Weekly Educational GK & Events' : 'साप्ताहिक शैक्षिक समसामयिकी व सामान्य ज्ञान'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              {language === 'en' ? 'Current Affairs & General Awareness' : 'समसामयिकी एवं समसामयिक घटनाक्रम'}
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-600 max-w-2xl">
              {language === 'en'
                ? 'Curated weekly national, state, and constitutional developments for school morning assembly speeches and competitive exams.'
                : 'विद्यालयी प्रार्थना सभा के विचार, सामान्य ज्ञान प्रश्नोत्तरी तथा प्रतियोगी परीक्षाओं (CTET, HTET, HSSC) हेतु महत्वपूर्ण समसामयिक मुद्दे।'}
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-1 bg-white border border-slate-200 p-1 rounded-lg shadow-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-sky-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? (language === 'en' ? 'All Updates' : 'सभी') : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Current Affairs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-3">
                  <span className="px-2 py-0.5 rounded-sm bg-sky-50 text-sky-800 font-semibold border border-sky-100 text-[11px]">
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {item.date}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug mb-3">
                  {language === 'hi' ? item.title.hi : item.title.en}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {language === 'hi' ? item.summary.hi : item.summary.en}
                </p>
              </div>

              {/* Curriculum Relevance Callout */}
              <div className="pt-3 border-t border-slate-100 bg-amber-50/60 -mx-6 -mb-6 p-4 rounded-b-2xl border-t border-amber-100 text-xs">
                <div className="font-bold text-amber-950 mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Curriculum Link:</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-snug">
                  {language === 'hi' ? item.relevance.hi : item.relevance.en}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
