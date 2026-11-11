import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Class10PresentationPlayer } from './Class10PresentationPlayer';
import { STUDY_CHAPTERS, CLASSES_METADATA } from '../data/portalData';
import { ClassLevel, StudyChapter, Subject } from '../types';
import { useAuth } from '../context/AuthContext';
import { getMyLearningProgressForMaterial, saveMyLearningProgress } from '../services/learningProgressService';
import { FileText, Download, Printer, BookOpen, CheckCircle, Clock, Search, ExternalLink, Sparkles } from 'lucide-react';

interface StudyMaterialsViewProps {
  initialClass?: ClassLevel;
}

export const StudyMaterialsView: React.FC<StudyMaterialsViewProps> = ({ initialClass = '10' }) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const readerRef = useRef<HTMLDivElement | null>(null);
  const lastSavedProgress = useRef(-1);
  const isRestoringPosition = useRef(false);
  const [selectedClass, setSelectedClass] = useState<ClassLevel>(initialClass);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [activeChapter, setActiveChapter] = useState<StudyChapter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const openChapter = (chapter: StudyChapter) => {
    lastSavedProgress.current = -1;
    isRestoringPosition.current = Boolean(user);
    setActiveChapter(chapter);
  };

  // Restore the last saved reader position before accepting new scroll progress.
  useEffect(() => {
    if (!activeChapter || !user) return;
    let cancelled = false;
    void getMyLearningProgressForMaterial(activeChapter.id)
      .then((saved) => {
        if (cancelled) return;
        const savedPosition = Number(saved?.last_position?.scrollTop ?? 0);
        lastSavedProgress.current = saved?.progress_percent ?? 0;
        if (readerRef.current) readerRef.current.scrollTop = Number.isFinite(savedPosition) ? Math.max(0, savedPosition) : 0;
        if (!saved) {
          return saveMyLearningProgress({
            materialId: activeChapter.id,
            classLevel: activeChapter.classLevel,
            subject: activeChapter.subject,
            chapterTitle: activeChapter.title.en,
            progressPercent: 0,
            lastPosition: { section: 'overview', scrollTop: 0 },
          });
        }
      })
      .catch((error) => console.warn('Learning progress could not be restored:', error))
      .finally(() => {
        if (!cancelled) isRestoringPosition.current = false;
      });
    return () => { cancelled = true; };
  }, [activeChapter, user]);

  const saveReaderPosition = () => {
    const element = readerRef.current;
    if (isRestoringPosition.current || !user || !activeChapter || !element) return;
    const maxScroll = element.scrollHeight - element.clientHeight;
    const percent = maxScroll > 0 ? Math.min(100, Math.round((element.scrollTop / maxScroll) * 100)) : 100;
    if (percent < lastSavedProgress.current + 10 && percent !== 100) return;
    lastSavedProgress.current = percent;
    void saveMyLearningProgress({
      materialId: activeChapter.id,
      classLevel: activeChapter.classLevel,
      subject: activeChapter.subject,
      chapterTitle: activeChapter.title.en,
      progressPercent: percent,
      lastPosition: { section: 'chapter_reader', scrollTop: element.scrollTop },
    }).catch((error) => console.warn('Learning progress could not be saved:', error));
  };

  const classMeta = CLASSES_METADATA.find((c) => c.level === selectedClass);
  const isClassComingSoon = classMeta?.status === 'coming-soon';

  const chaptersForClass = STUDY_CHAPTERS.filter((c) => {
    if (c.classLevel !== selectedClass) return false;
    if (selectedSubject !== 'all' && c.subject !== selectedSubject) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch =
        c.title.en.toLowerCase().includes(q) || c.title.hi.toLowerCase().includes(q);
      const summaryMatch =
        c.summary.en.toLowerCase().includes(q) || c.summary.hi.toLowerCase().includes(q);
      return titleMatch || summaryMatch;
    }
    return true;
  });

  return (
    <section id="materials" className="py-14 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
              <BookOpen className="w-4 h-4" />
              <span>{language === 'en' ? 'NCERT & HBSE Aligned Curriculum' : 'एनसीईआरटी एवं हरियाणा बोर्ड पाठ्यक्रम'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              {language === 'en' ? 'Chapter-Wise Revision Notes & Study Materials' : 'अध्यायवार रिवीजन नोट्स एवं अध्ययन सामग्री'}
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-600 max-w-2xl">
              {language === 'en'
                ? 'Structured chapter summaries, key exam terms, board examination points, and printable revision sheets.'
                : 'कक्षावार अध्याय सारांश, परीक्षा उपयोगी महत्वपूर्ण शब्दावली, मुख्य बिंदु और प्रिंट करने योग्य सामग्री।'}
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={language === 'en' ? 'Filter chapters...' : 'अध्याय खोजें...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Class Level Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 mb-6 scrollbar-none">
          {(['6', '7', '8', '9', '10', '11', '12'] as ClassLevel[]).map((lvl) => {
            const isSelected = selectedClass === lvl;
            const meta = CLASSES_METADATA.find((m) => m.level === lvl);

            return (
              <button
                key={lvl}
                onClick={() => {
                  setSelectedClass(lvl);
                  setSelectedSubject('all');
                  setActiveChapter(null);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-sky-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>Class {lvl}</span>
                {lvl === '10' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-amber-400 text-amber-950 font-bold">
                    Board
                  </span>
                )}
                {meta?.status === 'coming-soon' && (
                  <span className="text-[10px] text-slate-400">Soon</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Coming Soon Notice if selected class is pending */}
        {isClassComingSoon ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center max-w-xl mx-auto my-8">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {language === 'en' ? 'Class 12 Resources Coming Soon' : 'कक्षा 12 की अध्ययन सामग्री शीघ्र उपलब्ध होगी'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              {language === 'en'
                ? 'Krishan Sir is currently compiling verified notes for Contemporary World Politics and Politics in India Since Independence. Please explore Classes 6 to 11 in the meantime.'
                : 'कृष्ण सर द्वारा समकालीन विश्व राजनीति एवं स्वतंत्र भारत में राजनीति के सत्यापित नोट्स तैयार किए जा रहे हैं। कृपया तब तक कक्षा 6 से 11 की सामग्री का लाभ उठाएं।'}
            </p>
            <button
              onClick={() => setSelectedClass('10')}
              className="px-5 py-2.5 rounded-xl bg-sky-900 text-white text-xs font-semibold hover:bg-sky-800 transition-colors"
            >
              Explore Class 10 Board Resources
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Subject Filter Pills (interactive button filters) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1">Subject:</span>
              {['all', 'Political Science', 'History', 'Geography', 'Economics'].map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedSubject === sub
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {sub === 'all'
                    ? language === 'en'
                      ? 'All Subjects'
                      : 'सभी विषय'
                    : sub}
                </button>
              ))}
            </div>

            {selectedClass === '10' && (selectedSubject === 'all' || selectedSubject === 'History') && (
              <Class10PresentationPlayer language={language} />
            )}

            {/* Chapters Grid */}
            {chaptersForClass.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                {language === 'en'
                  ? 'No chapters found matching this filter. Switch to another subject or class.'
                  : 'इस विषय हेतु अभी कोई सामग्री सूचीबद्ध नहीं है। अन्य विषय का चयन करें।'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {chaptersForClass.map((chap) => (
                  <div
                    key={chap.id}
                    className="group bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-sky-300 rounded-xl p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
                        <span className="font-semibold text-sky-800">
                          {chap.subject}
                        </span>
                        <span>Chapter {chap.chapterNumber}</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-900 transition-colors leading-snug mb-2">
                        {language === 'hi' ? chap.title.hi : chap.title.en}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                        {language === 'hi' ? chap.summary.hi : chap.summary.en}
                      </p>

                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
                        <span>{chap.keyPoints.en.length} Exam Points</span>
                        <span aria-hidden="true">·</span>
                        <span>{chap.importantTerms.length} Key Terms</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => openChapter(chap)}
                        className="text-xs font-semibold text-sky-800 hover:text-sky-950 flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Read Full Notes' : 'संपूर्ण नोट्स पढ़ें'}</span>
                      </button>

                      <button
                        onClick={() => openChapter(chap)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 text-xs"
                        title="Print / Download PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Chapter Reader Modal */}
      {activeChapter && (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-stretch bg-slate-950/80 backdrop-blur-sm p-0 overflow-hidden">
          <div className="bg-white w-full h-[100dvh] max-w-none max-h-none rounded-none flex flex-col shadow-2xl border-0 overflow-hidden">
            
            {/* Modal Header */}
            <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-[#eef6fc]">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-sky-800 mb-1">
                  <span>Class {activeChapter.classLevel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeChapter.subject}</span>
                  <span aria-hidden="true">·</span>
                  <span>Chapter {activeChapter.chapterNumber}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-display">
                  {language === 'hi' ? activeChapter.title.hi : activeChapter.title.en}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white flex items-center gap-1 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setActiveChapter(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div ref={readerRef} onScroll={saveReaderPosition} className="min-h-0 flex-1 w-full max-w-5xl mx-auto px-4 py-5 sm:px-8 sm:py-7 overflow-y-auto space-y-6 text-slate-800">
              
              {/* Summary */}
              <div>
                <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider mb-2">
                  {language === 'en' ? 'Chapter Overview & Conceptual Core' : 'अध्याय अवलोकन एवं मूल अवधारणा'}
                </h4>
                <p className="text-sm leading-relaxed text-slate-700 bg-sky-50/50 p-4 rounded-xl border border-sky-100">
                  {language === 'hi' ? activeChapter.summary.hi : activeChapter.summary.en}
                </p>
              </div>

              {/* Key Exam Points */}
              <div>
                <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider mb-3">
                  {language === 'en' ? 'Crucial Board Examination Points:' : 'बोर्ड परीक्षा हेतु अति महत्वपूर्ण बिंदु:'}
                </h4>
                <ul className="space-y-2.5">
                  {(language === 'hi'
                    ? activeChapter.keyPoints.hi
                    : activeChapter.keyPoints.en
                  ).map((point, idx) => (
                    <li key={idx} className="text-xs sm:text-sm flex items-start gap-2.5 text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Important Terminology */}
              <div>
                <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider mb-3">
                  {language === 'en' ? 'Key Terminology & Definitions:' : 'पारिभाषिक शब्दावली एवं अर्थ:'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeChapter.importantTerms.map((term, tIdx) => (
                    <div
                      key={tIdx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50"
                    >
                      <div className="font-bold text-slate-900 text-xs sm:text-sm mb-1 text-sky-950">
                        {language === 'hi' ? term.term.hi : term.term.en}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {language === 'hi' ? term.definition.hi : term.definition.en}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher Sign-off */}
              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Verified by Krishan Kumar (TGT Social Science)</span>
                <span>GGHS Dhanger, Haryana</span>
              </div>

            </div>

          </div>
        </div>
      )}

    </section>
  );
};
