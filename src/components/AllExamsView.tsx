import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ClassLevel } from '../types';
import { StudyMaterialsView } from './StudyMaterialsView';
import { ConstitutionCorner } from './ConstitutionCorner';
import { BookOpen, Landmark, GraduationCap } from 'lucide-react';

interface AllExamsViewProps {
  initialClass: ClassLevel;
  onStartQuiz: () => void;
}

const examCategories = [
  { en: 'UPSC / State PSC', hi: 'UPSC / राज्य PSC' },
  { en: 'UGC NET / JRF', hi: 'UGC NET / JRF' },
  { en: 'Teaching Exams', hi: 'शिक्षक भर्ती परीक्षाएँ' },
  { en: 'Defence', hi: 'रक्षा परीक्षाएँ' },
  { en: 'Police', hi: 'पुलिस परीक्षाएँ' },
  { en: 'Railway', hi: 'रेलवे परीक्षाएँ' },
  { en: 'SSC', hi: 'SSC' },
  { en: 'Banking', hi: 'बैंकिंग' },
  { en: 'School & Board', hi: 'स्कूल एवं बोर्ड' },
  { en: 'Other Exams', hi: 'अन्य परीक्षाएँ' },
];

export const AllExamsView: React.FC<AllExamsViewProps> = ({ initialClass, onStartQuiz }) => {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('School & Board');
  const [activeResource, setActiveResource] = useState<'materials' | 'polity'>('materials');

  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 text-sky-800 text-sm font-semibold">
            <GraduationCap className="w-5 h-5" />
            {language === 'en' ? 'Choose your examination category' : 'अपनी परीक्षा श्रेणी चुनें'}
          </div>
          <div className="flex flex-wrap gap-2">
            {examCategories.map((category) => {
              const value = language === 'en' ? category.en : category.hi;
              const selected = selectedCategory === category.en;
              return (
                <button key={category.en} onClick={() => setSelectedCategory(category.en)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${selected ? 'bg-sky-900 text-white border-sky-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50'}`}>
                  {value}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {language === 'en' ? 'Selected category:' : 'चयनित श्रेणी:'} <strong>{language === 'en' ? selectedCategory : examCategories.find(item => item.en === selectedCategory)?.hi}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-6">
          <button onClick={() => setActiveResource('materials')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${activeResource === 'materials' ? 'bg-sky-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
            <BookOpen className="w-4 h-4" /> {language === 'en' ? 'Study Materials' : 'अध्ययन सामग्री'}
          </button>
          <button onClick={() => setActiveResource('polity')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${activeResource === 'polity' ? 'bg-sky-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
            <Landmark className="w-4 h-4" /> {language === 'en' ? 'Political Science & Constitution' : 'राजनीति विज्ञान एवं संविधान'}
          </button>
        </div>

        {activeResource === 'materials'
          ? <StudyMaterialsView initialClass={initialClass} />
          : <ConstitutionCorner onStartQuiz={onStartQuiz} />}
      </div>
    </section>
  );
};
