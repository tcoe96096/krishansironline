import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ONLINE_TESTS } from '../data/portalData';
import { OnlineTest, Question } from '../types';
import { Award, Clock, CheckCircle2, XCircle, AlertCircle, RotateCcw, Printer, ExternalLink, HelpCircle, ChevronRight, ChevronLeft, Bookmark } from 'lucide-react';

interface OnlineTestEngineProps {
  initialClassFilter?: string;
}

export const OnlineTestEngine: React.FC<OnlineTestEngineProps> = ({ initialClassFilter }) => {
  const { language } = useLanguage();
  const [selectedTest, setSelectedTest] = useState<OnlineTest>(ONLINE_TESTS[0]);
  const [isTestActive, setIsTestActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [questionLang, setQuestionLang] = useState<'en' | 'hi'>('en');

  // Sync initial question language with site language
  useEffect(() => {
    setQuestionLang(language);
  }, [language]);

  // Timer countdown
  useEffect(() => {
    if (!isTestActive || isSubmitted) return;

    if (timeLeftSeconds <= 0) {
      handleSubmitTest();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTestActive, isSubmitted, timeLeftSeconds]);

  const handleStartTest = (test: OnlineTest) => {
    setSelectedTest(test);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setMarkedForReview({});
    setTimeLeftSeconds(test.durationMinutes * 60);
    setIsSubmitted(false);
    setIsTestActive(true);
  };

  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: optionIndex,
    });
  };

  const handleToggleReview = () => {
    setMarkedForReview({
      ...markedForReview,
      [currentQuestionIndex]: !markedForReview[currentQuestionIndex],
    });
  };

  const handleSubmitTest = () => {
    setIsSubmitted(true);
    setIsTestActive(false);
  };

  const handleRetake = () => {
    handleStartTest(selectedTest);
  };

  // Score calculation
  const totalQuestions = selectedTest.questions.length;
  const attemptedCount = Object.keys(selectedAnswers).length;
  let correctCount = 0;

  selectedTest.questions.forEach((q, idx) => {
    if (selectedAnswers[idx] === q.correctAnswer) {
      correctCount++;
    }
  });

  const marksPerQuestion = selectedTest.totalMarks / totalQuestions;
  const marksObtained = correctCount * marksPerQuestion;
  const percentage = ((marksObtained / selectedTest.totalMarks) * 100).toFixed(1);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section id="tests" className="py-14 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>{language === 'en' ? 'Computer Based Test (CBT) & Assessment Hub' : 'ऑनलाइन मूल्यांकन एवं टेस्ट केंद्र'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              {language === 'en' ? 'Online Examination & Assessment Portal' : 'ऑनलाइन परीक्षा एवं टेस्ट श्रृंखला'}
            </h2>
            <p className="mt-1 text-sm sm:text-base text-slate-600 max-w-2xl">
              {language === 'en'
                ? 'Practice chapter-wise MCQs in real examination conditions with timer, question palette, and instant pedagogical review.'
                : 'टाइमर, प्रश्न तालिका और त्वरित समाधान के साथ वास्तविक परीक्षा वातावरण में बहुविकल्पीय प्रश्नों का अभ्यास करें।'}
            </p>
          </div>

          {/* Test Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Select Test:</span>
            <select
              value={selectedTest.id}
              onChange={(e) => {
                const found = ONLINE_TESTS.find((t) => t.id === e.target.value);
                if (found) {
                  setSelectedTest(found);
                  setIsTestActive(false);
                  setIsSubmitted(false);
                }
              }}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              {ONLINE_TESTS.map((t) => (
                <option key={t.id} value={t.id}>
                  {language === 'hi' ? t.title.hi : t.title.en} (Class {t.classLevel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View 1: Test Instructions & Start Screen */}
        {!isTestActive && !isSubmitted && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 8 cols: Test Info & Instructions */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-medium text-slate-500">
                <span className="bg-sky-50 text-sky-800 px-2.5 py-1 rounded-md font-semibold border border-sky-200">
                  Class {selectedTest.classLevel}
                </span>
                <span aria-hidden="true">·</span>
                <span>{selectedTest.subject}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedTest.chapter}</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 leading-snug">
                {language === 'hi' ? selectedTest.title.hi : selectedTest.title.en}
              </h3>

              {/* Test Meta Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 mb-6 text-center">
                <div>
                  <div className="text-xs text-slate-500">Duration</div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {selectedTest.durationMinutes} Mins
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Total Marks</div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {selectedTest.totalMarks}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Questions</div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {selectedTest.questions.length} MCQs
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Negative Mark</div>
                  <div className="text-base font-bold text-emerald-700 font-mono">
                    None (0)
                  </div>
                </div>
              </div>

              {/* Instructions List */}
              <div className="space-y-3 mb-8">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {language === 'en' ? 'Examination Instructions:' : 'परीक्षा संबंधी दिशा-निर्देश:'}
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                  {(language === 'hi'
                    ? selectedTest.instructions.hi
                    : selectedTest.instructions.en
                  ).map((inst, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-sky-800 shrink-0 font-mono">
                        {idx + 1}.
                      </span>
                      <span>{inst}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Start Test Button */}
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleStartTest(selectedTest)}
                  className="px-6 py-3 rounded-xl bg-sky-900 hover:bg-sky-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
                >
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>
                    {language === 'en' ? 'Start Online Test Now' : 'ऑनलाइन टेस्ट प्रारंभ करें'}
                  </span>
                </button>

                {selectedTest.googleFormUrl && (
                  <a
                    href={selectedTest.googleFormUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-300 transition-colors flex items-center gap-1.5"
                  >
                    <span>Attempt on Google Forms</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                )}
              </div>
            </div>

            {/* Right 4 cols: Google Forms Assessment Info Card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-6 text-slate-800">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-700" />
                  <span>Google Forms Assessment</span>
                </div>
                <p className="text-xs text-amber-950/80 leading-relaxed mb-4">
                  {language === 'en'
                    ? 'Krishan Sir also administers formal school assessments via authorized Google Forms. Scores from Google Forms are recorded in the official GGHS Dhanger academic ledger.'
                    : 'कृष्ण सर द्वारा राजकीय कन्या उच्च विद्यालय, ढांगर के विद्यार्थियों हेतु गूगल फॉर्म्स पर भी टेस्ट लिए जाते हैं, जिनका मूल्यांकन आधिकारिक रिकॉर्ड में दर्ज होता है।'}
                </p>
                <div className="bg-white rounded-lg p-3 border border-amber-200 text-xs space-y-2">
                  <div className="font-semibold text-slate-800">For GGHS Students:</div>
                  <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                    <li>Enter correct 4-digit Roll Number</li>
                    <li>Submit within the specified 30-minute window</li>
                    <li>Automated email scorecard is sent upon completion</li>
                  </ul>
                </div>
              </div>

              {/* Teacher Tip Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs text-slate-600">
                <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-sky-800" />
                  <span>Krishan Sir\'s Test Strategy</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  "Read every option completely before finalizing your response. In Social Science, examiners often create close distractors. Eliminate improbable options first."
                </p>
              </div>
            </div>

          </div>
        )}

        {/* View 2: Active CBT Test Running */}
        {isTestActive && !isSubmitted && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            
            {/* Test Header Bar with Timer & Status */}
            <div className="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold tracking-tight text-white font-display">
                  {language === 'hi' ? selectedTest.title.hi : selectedTest.title.en}
                </div>
                <div className="text-xs text-slate-400">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Language Switch within test */}
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-md text-xs">
                  <button
                    onClick={() => setQuestionLang('en')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      questionLang === 'en' ? 'bg-sky-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setQuestionLang('hi')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      questionLang === 'hi' ? 'bg-sky-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    हिंदी
                  </button>
                </div>

                {/* Countdown Timer */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-sm font-bold ${
                    timeLeftSeconds < 180 ? 'bg-red-900 text-red-200 animate-pulse' : 'bg-slate-800 text-amber-300'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{formatTimer(timeLeftSeconds)}</span>
                </div>

                {/* Submit Test Button */}
                <button
                  onClick={handleSubmitTest}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  Submit Test
                </button>
              </div>
            </div>

            {/* Test Content Grid (Question + Navigator) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
              
              {/* Question Stage (8 cols) */}
              <div className="lg:col-span-8 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between">
                <div>
                  {/* Question Meta */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pb-2 border-b border-slate-100">
                    <span className="font-semibold text-sky-800">
                      Topic: {selectedTest.questions[currentQuestionIndex].chapter}
                    </span>
                    <span className="font-mono">
                      Marks: +{marksPerQuestion} / -0
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-6 leading-relaxed">
                    <span className="text-sky-900 mr-2">Q{currentQuestionIndex + 1}.</span>
                    {questionLang === 'hi'
                      ? selectedTest.questions[currentQuestionIndex].question.hi
                      : selectedTest.questions[currentQuestionIndex].question.en}
                  </h3>

                  {/* Options List */}
                  <div className="space-y-3">
                    {(questionLang === 'hi'
                      ? selectedTest.questions[currentQuestionIndex].options.hi
                      : selectedTest.questions[currentQuestionIndex].options.en
                    ).map((optionText, optIdx) => {
                      const isSelected = selectedAnswers[currentQuestionIndex] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectOption(optIdx)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'border-sky-800 bg-sky-50/70 text-sky-950 font-semibold ring-1 ring-sky-700'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-sky-900 text-white'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="text-xs sm:text-sm leading-snug">
                            {optionText}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation Toolbar */}
                <div className="pt-6 mt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={handleToggleReview}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      markedForReview[currentQuestionIndex]
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>
                      {markedForReview[currentQuestionIndex]
                        ? 'Marked for Review'
                        : 'Mark for Review'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    {currentQuestionIndex < totalQuestions - 1 ? (
                      <button
                        onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                        className="px-4 py-2 rounded-lg bg-sky-900 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmitTest}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                      >
                        Submit Test
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Question Palette & Status Deck (4 cols) */}
              <div className="lg:col-span-4 bg-slate-50 p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
                    Question Palette
                  </h4>

                  {/* Status Legend */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mb-5 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-emerald-600"></span>
                      <span>Answered ({Object.keys(selectedAnswers).length})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
                      <span>Review ({Object.keys(markedForReview).filter((k) => markedForReview[Number(k)]).length})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-white border border-slate-300"></span>
                      <span>Not Answered ({totalQuestions - Object.keys(selectedAnswers).length})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-sky-900"></span>
                      <span>Current</span>
                    </div>
                  </div>

                  {/* Number Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {selectedTest.questions.map((_, qIdx) => {
                      const isAnswered = selectedAnswers[qIdx] !== undefined;
                      const isReview = markedForReview[qIdx];
                      const isCurrent = currentQuestionIndex === qIdx;

                      let btnStyle = 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100';
                      if (isCurrent) {
                        btnStyle = 'bg-sky-900 text-white font-bold ring-2 ring-sky-500 ring-offset-1';
                      } else if (isReview) {
                        btnStyle = 'bg-amber-500 text-white font-bold';
                      } else if (isAnswered) {
                        btnStyle = 'bg-emerald-600 text-white font-semibold';
                      }

                      return (
                        <button
                          key={qIdx}
                          onClick={() => setCurrentQuestionIndex(qIdx)}
                          className={`h-9 rounded-lg border text-xs font-mono transition-all flex items-center justify-center ${btnStyle}`}
                        >
                          {qIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-200 text-center">
                  <button
                    onClick={handleSubmitTest}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    Finish and View Scorecard
                  </button>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Instant marksheet with pedagogical explanations
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* View 3: Comprehensive Scorecard & Solution Review */}
        {isSubmitted && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Scorecard Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Test Completed
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 font-display">
                    {language === 'hi' ? selectedTest.title.hi : selectedTest.title.en}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assessment evaluated according to HBSE & CBSE marking scheme
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Scorecard</span>
                  </button>

                  <button
                    onClick={handleRetake}
                    className="px-4 py-2 rounded-lg bg-sky-900 hover:bg-sky-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-attempt</span>
                  </button>
                </div>
              </div>

              {/* Score Breakdown Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <div className="text-xs text-slate-500">Score Obtained</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-sky-900 font-mono mt-1">
                    {marksObtained} <span className="text-sm font-normal text-slate-400">/ {selectedTest.totalMarks}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <div className="text-xs text-slate-500">Percentage</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono mt-1">
                    {percentage}%
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <div className="text-xs text-slate-500">Correct / Attempted</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono mt-1">
                    {correctCount} <span className="text-sm font-normal text-slate-400">/ {totalQuestions}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                  <div className="text-xs text-slate-500">Performance Status</div>
                  <div className="text-base sm:text-lg font-bold text-amber-700 mt-2">
                    {Number(percentage) >= 80 ? 'Distinction' : Number(percentage) >= 60 ? 'First Division' : 'Needs Practice'}
                  </div>
                </div>
              </div>

              {/* Pedagogical Feedback from Krishan Sir */}
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-950 flex items-start gap-3">
                <Award className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sky-900">
                    Remarks by Krishan Sir (TGT Social Science):
                  </div>
                  <p className="mt-1 leading-relaxed">
                    {Number(percentage) >= 80
                      ? 'Commendable performance! You demonstrated clear command over concepts and key dates. Maintain this consistency for the upcoming board examinations.'
                      : 'Good effort! Review the detailed solutions below carefully, especially the foundational reasons behind power sharing and constitutional amendments.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Question by Question Solution Review */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
              <h4 className="text-lg font-bold text-slate-900 mb-6 font-display flex items-center justify-between">
                <span>Detailed Question Review & Explanations</span>
                <span className="text-xs text-slate-500 font-normal">
                  Curated by Krishan Sir
                </span>
              </h4>

              <div className="space-y-6">
                {selectedTest.questions.map((q, idx) => {
                  const studentAnswer = selectedAnswers[idx];
                  const isCorrect = studentAnswer === q.correctAnswer;
                  const isSkipped = studentAnswer === undefined;

                  return (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-5 ${
                        isCorrect
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : isSkipped
                          ? 'border-slate-200 bg-slate-50/40'
                          : 'border-red-200 bg-red-50/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                        <span className="font-bold text-slate-700 font-mono">Question {idx + 1}</span>
                        {isCorrect ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Correct (+{marksPerQuestion})
                          </span>
                        ) : isSkipped ? (
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" /> Skipped (0)
                          </span>
                        ) : (
                          <span className="text-red-700 font-semibold flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Incorrect (0)
                          </span>
                        )}
                      </div>

                      <h5 className="text-sm sm:text-base font-bold text-slate-900 mb-3 leading-snug">
                        {language === 'hi' ? q.question.hi : q.question.en}
                      </h5>

                      {/* Options breakdown */}
                      <div className="grid grid-cols-1 gap-2 mb-4">
                        {(language === 'hi' ? q.options.hi : q.options.en).map((opt, optIdx) => {
                          const isOptCorrect = optIdx === q.correctAnswer;
                          const isStudentPick = optIdx === studentAnswer;

                          let style = 'bg-white border-slate-200 text-slate-700';
                          if (isOptCorrect) {
                            style = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold';
                          } else if (isStudentPick && !isCorrect) {
                            style = 'bg-red-50 border-red-300 text-red-950 line-through';
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${style}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                <span>{opt}</span>
                              </div>
                              {isOptCorrect && (
                                <span className="text-[11px] font-bold text-emerald-700">Correct Answer</span>
                              )}
                              {isStudentPick && !isCorrect && (
                                <span className="text-[11px] font-bold text-red-600">Your Selection</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Pedagogical Explanation Box */}
                      <div className="rounded-lg bg-white p-3 border border-slate-200 text-xs">
                        <div className="font-semibold text-sky-900 mb-1 flex items-center gap-1">
                          <span>Krishan Sir\'s Key Concept Explanation:</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">
                          {language === 'hi' ? q.explanation.hi : q.explanation.en}
                        </p>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>
    </section>
  );
};
