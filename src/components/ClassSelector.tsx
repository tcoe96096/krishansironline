import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CLASSES_METADATA } from '../data/portalData';
import { ClassLevel } from '../types';
import { BookOpen, Award, FileText, ArrowRight, Clock, CheckCircle, Sparkles } from 'lucide-react';

interface ClassSelectorProps {
  onSelectClassAction: (classLevel: ClassLevel, action: 'materials' | 'tests') => void;
}

export const ClassSelector: React.FC<ClassSelectorProps> = ({ onSelectClassAction }) => {
  const { language, t } = useLanguage();
  const [filterStage, setFilterStage] = useState<'all' | 'middle' | 'secondary'>('all');

  const filteredClasses = CLASSES_METADATA.filter((c) => {
    if (filterStage === 'middle') return ['6', '7', '8'].includes(c.level);
    if (filterStage === 'secondary') return ['9', '10', '11', '12'].includes(c.level);
    return true;
  });

  return (
    <section id="classes" className="py-14 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
              <BookOpen className="w-4 h-4" />
              <span>{language === 'en' ? 'Curriculum Architecture' : 'पाठ्यक्रम संरचना'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              {t('class.heading')}
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-600 max-w-2xl">
              {t('class.subheading')}
            </p>
          </div>

          {/* Interactive Filter Tabs (Segmented control) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
            <button
              onClick={() => setFilterStage('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterStage === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'en' ? 'All Classes (6–12)' : 'सभी कक्षाएं (6–12)'}
            </button>
            <button
              onClick={() => setFilterStage('middle')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterStage === 'middle'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'en' ? 'Middle (6–8)' : 'मध्यम (6–8)'}
            </button>
            <button
              onClick={() => setFilterStage('secondary')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterStage === 'secondary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'en' ? 'High & Senior (9–12)' : 'उच्च व वरिष्ठ (9–12)'}
            </button>
          </div>
        </div>

        {/* Classes Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((item) => {
            const isComingSoon = item.status === 'coming-soon';
            const isBoardClass = item.level === '10';

            return (
              <div
                key={item.level}
                className={`rounded-2xl border transition-all flex flex-col justify-between ${
                  isBoardClass
                    ? 'border-amber-300 bg-amber-50/20 shadow-md ring-1 ring-amber-200'
                    : isComingSoon
                    ? 'border-slate-200 bg-slate-50/60 opacity-90'
                    : 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-md'
                } p-5 sm:p-6`}
              >
                <div>
                  {/* Card Header & Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-2xl font-black font-display text-sky-950">
                      Class {item.level}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        isBoardClass
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : isComingSoon
                          ? 'bg-slate-200/80 text-slate-700 border-slate-300'
                          : 'bg-sky-50 text-sky-800 border-sky-200'
                      }`}
                    >
                      {language === 'hi' ? item.badge.hi : item.badge.en}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2 leading-tight">
                    {language === 'hi' ? item.title.hi : item.title.en}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {language === 'hi' ? item.description.hi : item.description.en}
                  </p>

                  {/* Available Subjects List */}
                  <div className="mb-5 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {language === 'en' ? 'Subjects Available:' : 'उपलब्ध विषय:'}
                    </div>
                    <ul className="space-y-1">
                      {item.subjects.map((sub, sIdx) => (
                        <li
                          key={sIdx}
                          className="text-xs text-slate-700 flex items-center gap-1.5 font-medium"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-700 shrink-0" />
                          <span>{language === 'hi' ? sub.hi : sub.en}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Resources Count or Coming Soon Notice */}
                  {isComingSoon ? (
                    <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 mb-4 text-xs text-amber-900 flex items-start gap-2">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">{t('class.comingSoon')}</div>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          {t('class.comingSoonDesc')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-5 flex items-center gap-3 text-xs text-slate-500 font-mono pt-3 border-t border-slate-100">
                      <span>{item.resourceCount.notes} Notes</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.resourceCount.tests} Tests</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.resourceCount.mcqs}+ MCQs</span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button
                    disabled={isComingSoon}
                    onClick={() => onSelectClassAction(item.level, 'materials')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      isComingSoon
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('class.viewMaterials')}</span>
                  </button>

                  <button
                    disabled={isComingSoon}
                    onClick={() => onSelectClassAction(item.level, 'tests')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      isComingSoon
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : isBoardClass
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                        : 'bg-sky-900 hover:bg-sky-800 text-white shadow-xs'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>{t('class.takeTest')}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
