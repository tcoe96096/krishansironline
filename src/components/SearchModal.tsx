import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { STUDY_CHAPTERS, ONLINE_TESTS, PREAMBLE_TERMS, CLASSES_METADATA } from '../data/portalData';
import { Search, X, BookOpen, Award, Landmark, FileText, ArrowRight } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Cmd/Ctrl + K and Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle or open handled in parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Search Results
  const matchingChapters = STUDY_CHAPTERS.filter(
    (c) =>
      c.title.en.toLowerCase().includes(q) ||
      c.title.hi.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q)
  ).slice(0, 4);

  const matchingTests = ONLINE_TESTS.filter(
    (t) =>
      t.title.en.toLowerCase().includes(q) ||
      t.title.hi.toLowerCase().includes(q) ||
      t.chapter.toLowerCase().includes(q)
  ).slice(0, 3);

  const matchingPreamble = PREAMBLE_TERMS.filter(
    (p) =>
      p.term.toLowerCase().includes(q) ||
      p.termHi.toLowerCase().includes(q) ||
      p.meaning.en.toLowerCase().includes(q)
  ).slice(0, 3);

  const matchingClasses = CLASSES_METADATA.filter(
    (c) =>
      c.title.en.toLowerCase().includes(q) ||
      c.level.toLowerCase().includes(q) ||
      c.subjects.some((s) => s.en.toLowerCase().includes(q) || s.hi.toLowerCase().includes(q))
  ).slice(0, 3);

  const totalResults =
    matchingChapters.length + matchingTests.length + matchingPreamble.length + matchingClasses.length;

  const handleSelect = (section: string) => {
    onNavigate(section);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-200 p-4 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={language === 'en' ? 'Search tests, chapters, classes, Constitution...' : 'टेस्ट, अध्याय, कक्षा या संविधान खोजें...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!q ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-2">
              <p>Type keywords like "Power Sharing", "Class 10", "Preamble", or "Satyagraha"</p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {['Power Sharing', 'Federalism', 'Satyagraha', 'Constitution', 'Class 10'].map((hint, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(hint)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 text-xs font-mono"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No results found for "{query}". Try another search term.
            </div>
          ) : (
            <>
              {/* Online Tests Matches */}
              {matchingTests.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-sky-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>Online Tests ({matchingTests.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {matchingTests.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSelect('tests')}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-sky-50 text-xs flex items-center justify-between group transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-sky-900">
                            {language === 'hi' ? t.title.hi : t.title.en}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Class {t.classLevel} · {t.durationMinutes} Mins · {t.totalMarks} Marks
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-700 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Study Notes Matches */}
              {matchingChapters.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Study Notes & Chapters ({matchingChapters.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {matchingChapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => handleSelect('materials')}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-indigo-50 text-xs flex items-center justify-between group transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-indigo-900">
                            {language === 'hi' ? ch.title.hi : ch.title.en}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Class {ch.classLevel} · {ch.subject} · Chapter {ch.chapterNumber}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-700 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Constitution Terms Matches */}
              {matchingPreamble.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Indian Constitution ({matchingPreamble.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {matchingPreamble.map((p) => (
                      <button
                        key={p.term}
                        onClick={() => handleSelect('polity')}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-amber-50 text-xs flex items-center justify-between group transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-amber-900">
                            {p.term} ({p.termHi})
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            {language === 'hi' ? p.meaning.hi : p.meaning.en}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Key Hints */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Press ESC to close</span>
          <span>Krishan Sir Portal Search</span>
        </div>

      </div>
    </div>
  );
};
