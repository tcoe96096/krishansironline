import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { OnlineTest, Question, StudentLoginDetails, StudentTestSubmission } from '../types';
import { getPublishedTests, getMyTestAttempts, startTestAttempt, submitTestAttempt, type PublishedTest, type TestAttempt } from '../services/testService';
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Printer,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  Download,
  Database,
  Search,
  Trash2,
  UserCheck,
  Sparkles,
  Check,
  Copy,
  Layers,
  HelpCircle,
  Eye,
  Eraser,
  Lock,
  ShieldCheck,
  LogOut,
  KeyRound,
  BarChart3,
  X
} from 'lucide-react';
import {
  getLocalSubmissions,
  getGoogleSheetUrl,
  saveGoogleSheetUrl,
  exportSubmissionsToCSV,
  deleteLocalSubmission,
  GOOGLE_APPS_SCRIPT_CODE,
} from '../utils/googleSheetsSync';


const ACTIVE_TEST_SESSION_KEY = 'krishan_sir_active_test_session';
const EMPTY_TEST: OnlineTest = {
  id: '',
  title: { en: 'Select a published test', hi: 'प्रकाशित टेस्ट चुनें' },
  classLevel: '9',
  subject: 'History',
  chapter: '',
  durationMinutes: 30,
  totalMarks: 0,
  questions: [],
  instructions: { en: [], hi: [] },
};

interface PersistedTestSession {
  version: 1;
  testId: string;
  student: StudentLoginDetails;
  selectedAnswers: Record<number, number>;
  markedForReview: Record<number, boolean>;
  currentQuestionIndex: number;
  timeLeftSeconds: number;
  savedAt: number;
  questionLang: 'en' | 'hi';
  viewLayout: 'cbt' | 'all';
}

const readPersistedTestSession = (): PersistedTestSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_TEST_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PersistedTestSession>;
    const student = value.student as StudentLoginDetails | undefined;
    if (
      value.version !== 1 ||
      typeof value.testId !== 'string' ||
      !student ||
      typeof student.studentName !== 'string' ||
      typeof student.rollNo !== 'string' ||
      typeof student.studentClass !== 'string' ||
      typeof value.timeLeftSeconds !== 'number' ||
      !Number.isFinite(value.timeLeftSeconds) ||
      typeof value.savedAt !== 'number' ||
      !Number.isFinite(value.savedAt) ||
      typeof value.currentQuestionIndex !== 'number' ||
      !Number.isFinite(value.currentQuestionIndex) ||
      (value.questionLang !== 'hi' && value.questionLang !== 'en') ||
      (value.viewLayout !== 'cbt' && value.viewLayout !== 'all') ||
      !value.selectedAnswers ||
      !value.markedForReview
    ) {
      localStorage.removeItem(ACTIVE_TEST_SESSION_KEY);
      return null;
    }
    return value as PersistedTestSession;
  } catch {
    localStorage.removeItem(ACTIVE_TEST_SESSION_KEY);
    return null;
  }
};

interface OnlineTestEngineProps {
  initialClassFilter?: string;
  onRequestLogin: () => void;
}

export const OnlineTestEngine: React.FC<OnlineTestEngineProps> = ({ initialClassFilter, onRequestLogin }) => {
  const { language } = useLanguage();
  const { user, profile, loading: authLoading, profileLoading, signOut } = useAuth();
  const [databaseTests, setDatabaseTests] = useState<OnlineTest[]>([]);
  const [testSearch, setTestSearch] = useState('');
  const [testClassFilter, setTestClassFilter] = useState('all');
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState('');
  // Authenticated students see only tests published for their canonical profile class.
  // Only database-published tests are exposed in the portal. Legacy local question
  // banks contain answer keys and must never be bundled into this student-facing route.
  const availableTests = user && profile
    ? databaseTests.filter((test) => test.classLevel === String(profile.class_level))
    : databaseTests;
  const filteredTests = availableTests.filter((test) => {
    const query = testSearch.trim().toLowerCase();
    const matchesQuery = !query || (test.title.hi + ' ' + test.title.en + ' ' + test.subject + ' ' + test.classLevel).toLowerCase().includes(query);
    const matchesClass = testClassFilter === 'all' || String(test.classLevel) === testClassFilter;
    return matchesQuery && matchesClass;
  });
  const testClassOptions = [...new Set(availableTests.map((test) => String(test.classLevel)))].sort((a, b) => Number(a) - Number(b));
  // Browser storage is a recovery aid only; the authenticated profile and database attempt remain authoritative.
  const [restoredSession, setRestoredSession] = useState<PersistedTestSession | null>(() => readPersistedTestSession());
  const restoredTest = databaseTests.find((test) => test.id === restoredSession?.testId) || EMPTY_TEST;
  const elapsedWhileAway = restoredSession
    ? Math.max(0, Math.floor((Date.now() - restoredSession.savedAt) / 1000))
    : 0;
  const [selectedTest, setSelectedTest] = useState<OnlineTest>(restoredTest);
  const isDatabaseTest = databaseTests.some((test) => test.id === selectedTest.id);

  // Test duration follows the selected assessment. Time spent away is deducted on resume.
  const TOTAL_TEST_MINUTES = selectedTest.durationMinutes;
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(() =>
    restoredSession
      ? Math.max(0, restoredSession.timeLeftSeconds - elapsedWhileAway)
      : restoredTest.durationMinutes * 60
  );

  // Restore student details only when an unfinished test session exists.
  const [studentDetails, setStudentDetails] = useState<StudentLoginDetails | null>(null);

  const [loginForm, setLoginForm] = useState<StudentLoginDetails>({
    mobile: '',
    studentName: '',
    studentClass: `${restoredTest.classLevel}th`,
    rollNo: '',
    school: 'Govt Girls High School, Dhanger',
    otherSchool: '',
  });

  const [loginError, setLoginError] = useState<string>('');

  // Test Execution State
  const [isTestActive, setIsTestActive] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(() =>
    restoredSession
      ? Math.min(Math.max(0, restoredSession.currentQuestionIndex), Math.max(0, restoredTest.questions.length - 1))
      : 0
  );
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(
    () => restoredSession?.selectedAnswers || {}
  );
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>(
    () => restoredSession?.markedForReview || {}
  );
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [questionLang, setQuestionLang] = useState<'en' | 'hi'>(() => restoredSession?.questionLang || 'hi');
  const allowedAttempts = Math.max(1, Number(selectedTest.attemptLimit || 1));
  const attemptLimitMessageHi = `आप इस परीक्षा के सभी निर्धारित प्रयास पूरे कर चुके हैं। इस टेस्ट के लिए अधिकतम ${allowedAttempts} प्रयास अनुमत हैं। आपका पिछला परिणाम सुरक्षित है।`;
  const attemptLimitMessageEn = `You have used all allowed attempts for this test. A maximum of ${allowedAttempts} attempts are permitted. Your previous result has been saved.`;
  const isAttemptLimitMessage = (message: string) => message.includes('निर्धारित प्रयास पूरा') || message.includes('allowed attempt');
  const displayLoginError = isAttemptLimitMessage(loginError) ? (questionLang === 'hi' ? attemptLimitMessageHi : attemptLimitMessageEn) : loginError;
  const [viewLayout, setViewLayout] = useState<'cbt' | 'all'>(() => restoredSession?.viewLayout || 'cbt');
  const [showAttemptSummaryModal, setShowAttemptSummaryModal] = useState<boolean>(false);
  const [showMobilePalette, setShowMobilePalette] = useState<boolean>(false);
  const selectedTestEffectInitialized = useRef(false);

  const [activeAttempt, setActiveAttempt] = useState<TestAttempt | null>(null);
  const [serverResult, setServerResult] = useState<TestAttempt | null>(null);
  // Prevent timer and manual-submit events from sending duplicate RPC requests.
  const submissionInFlight = useRef(false);

  const [submissionStatus, setSubmissionStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  const displaySubmissionMessage = isAttemptLimitMessage(submissionStatus.message || '') ? (questionLang === 'hi' ? attemptLimitMessageHi : attemptLimitMessageEn) : submissionStatus.message;

  // Teacher / Admin Responses Management
  const [showTeacherPanel, setShowTeacherPanel] = useState<boolean>(false);
  const [googleSheetUrlInput, setGoogleSheetUrlInput] = useState<string>('');
  const [submissionsList, setSubmissionsList] = useState<StudentTestSubmission[]>([]);
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [saveUrlSuccess, setSaveUrlSuccess] = useState<boolean>(false);

  // Teacher tools are intentionally available only in local development.
  // GitHub Pages is a static public site and cannot securely protect an admin panel.
  const isAIStudioEnvironment = (): boolean => import.meta.env.DEV;

  const [isAIStudio, setIsAIStudio] = useState<boolean>(() => {
    return isAIStudioEnvironment();
  });

  // Local development teacher tools. Production results are stored in the private Google Sheet.
  // This legacy teacher panel is strictly development-only. Production admin access
  // must use the database-backed Google OAuth role gate, never a browser flag or PIN.
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAIStudioEnvironment());
  const [showAdminAuthModal, setShowAdminAuthModal] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [adminPinError, setAdminPinError] = useState<string>('');

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!import.meta.env.DEV) {
      setAdminPinError('यह legacy PIN सुविधा केवल local development में उपलब्ध है।');
      return;
    }
    const correctPin = '1234';
    if (adminPinInput.trim() === correctPin) {
      setIsAdmin(true);
      setShowTeacherPanel(true);
      setShowAdminAuthModal(false);
      setAdminPinError('');
    } else {
      setAdminPinError('गलत PIN।');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setShowTeacherPanel(false);
    // No persistent browser-side admin authorization is retained.
  };

  // Load published test content from Supabase. Answer keys never enter the browser.
  useEffect(() => {
    let active = true;
    const loadPublishedTests = async () => {
      try {
        setCatalogueLoading(true);
        setCatalogueError('');
        const rows = await getPublishedTests();
        const mapped: OnlineTest[] = rows.map((test: PublishedTest) => ({
          id: test.id,
          title: test.title,
          classLevel: test.class_level as OnlineTest['classLevel'],
          subject: test.subject as OnlineTest['subject'],
          chapter: test.chapter,
          durationMinutes: test.duration_minutes,
          totalMarks: Number(test.total_marks),
          attemptLimit: Number(test.attempt_limit || 1),
          questions: test.questions.map((question) => ({
            id: question.id,
            question: question.question,
            options: question.options,
            correctAnswer: -1,
            explanation: question.explanation || { en: '', hi: '' },
            chapter: question.chapter || test.chapter,
            marks: question.marks ?? 1,
            type: question.type ?? 'mcq',
          })),
          instructions: {
            en: ['Read each question carefully.', 'Submit your answers before the timer ends.'],
            hi: ['प्रत्येक प्रश्न ध्यानपूर्वक पढ़ें।', 'समय समाप्त होने से पहले अपने उत्तर जमा करें।'],
          },
        }));
        if (active) setDatabaseTests(mapped);
      } catch (error) {
        if (active) setCatalogueError(error instanceof Error ? error.message : 'Published tests could not be loaded.');
      } finally {
        if (active) setCatalogueLoading(false);
      }
    };
    void loadPublishedTests();
    return () => { active = false; };
  }, []);

  // Keep the selected assessment inside the authenticated student's published class catalogue.
  useEffect(() => {
    if (!catalogueLoading && user && profile && availableTests.length > 0 &&
        !availableTests.some((test) => test.id === selectedTest.id)) {
      setSelectedTest(availableTests[0]);
    }
  }, [catalogueLoading, user?.id, profile?.class_level, databaseTests, selectedTest.id]);

  // Select the first published database test for visitors when no class filter is supplied.
  useEffect(() => {
    if (!catalogueLoading && !user && !initialClassFilter && !selectedTest.id && databaseTests.length > 0) {
      setSelectedTest(databaseTests[0]);
    }
  }, [catalogueLoading, user?.id, initialClassFilter, databaseTests, selectedTest.id]);

  // Load legacy local-only development submissions. Student test results are stored in Supabase.
  useEffect(() => {
    setSubmissionsList(getLocalSubmissions());
  }, []);

  // Preserve a saved session while the published database catalogue is loading.
  // A matching authenticated database attempt is still required before answers are restored.
  useEffect(() => {
    if (restoredSession && restoredSession.testId !== selectedTest.id) return;
    if (restoredSession && restoredSession.testId === selectedTest.id) {
      selectedTestEffectInitialized.current = true;
      return;
    }
    if (!selectedTestEffectInitialized.current) selectedTestEffectInitialized.current = true;

    setTimeLeftSeconds(selectedTest.durationMinutes * 60);
    setIsTestActive(false);
    setIsSubmitted(false);
    setSelectedAnswers({});
    setMarkedForReview({});
    setCurrentQuestionIndex(0);
    setShowMobilePalette(false);
    const expectedClass = `${selectedTest.classLevel}th`;
    setLoginForm((prev) => ({ ...prev, studentClass: expectedClass }));
    setStudentDetails((current) => {
      if (current && current.studentClass !== expectedClass) {
        localStorage.removeItem('krishan_sir_active_student');
        localStorage.removeItem(ACTIVE_TEST_SESSION_KEY);
        return null;
      }
      return current;
    });
  }, [selectedTest.id, selectedTest.durationMinutes, selectedTest.classLevel]);

  // Select the saved assessment once the published catalogue is available.
  useEffect(() => {
    if (!restoredSession || catalogueLoading) return;
    const match = databaseTests.find((test) => test.id === restoredSession.testId);
    if (match) {
      if (selectedTest.id !== match.id) setSelectedTest(match);
    } else {
      localStorage.removeItem(ACTIVE_TEST_SESSION_KEY);
      setRestoredSession(null);
    }
  }, [restoredSession, catalogueLoading, databaseTests, selectedTest.id]);

  // Do not override a saved in-progress test after a refresh.
  useEffect(() => {
    if (restoredSession) return;
    if (initialClassFilter) {
      const match = availableTests.find((t) => t.classLevel === initialClassFilter);
      if (match) {
        setSelectedTest(match);
      }
    }
  }, [initialClassFilter, databaseTests, user?.id, profile?.class_level]);


  // Auto-save every active attempt locally for refresh/tab-close recovery.
  // savedAt is refreshed with the countdown so time away can be deducted on resume.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isTestActive || isSubmitted || !studentDetails) {
      if (isSubmitted) {
        localStorage.removeItem(ACTIVE_TEST_SESSION_KEY);
        localStorage.removeItem('krishan_sir_active_student');
      }
      return;
    }

    const session: PersistedTestSession = {
      version: 1,
      testId: selectedTest.id,
      student: studentDetails,
      selectedAnswers,
      markedForReview,
      currentQuestionIndex,
      timeLeftSeconds,
      savedAt: Date.now(),
      questionLang,
      viewLayout,
    };

    try {
      localStorage.setItem(ACTIVE_TEST_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn('Could not auto-save this test attempt in this browser.', error);
    }
  }, [
    selectedTest.id,
    studentDetails,
    selectedAnswers,
    markedForReview,
    currentQuestionIndex,
    timeLeftSeconds,
    questionLang,
    viewLayout,
    isTestActive,
    isSubmitted,
  ]);

  // Mobile exam focus mode: keep the global header collapsed for any live database attempt.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const examModeActive = (isTestActive || activeAttempt?.status === 'in_progress') && !isSubmitted;
    document.body.classList.toggle('exam-mode-active', examModeActive);
    document.documentElement.classList.toggle('exam-mode-active', examModeActive);
    return () => {
      document.body.classList.remove('exam-mode-active');
      document.documentElement.classList.remove('exam-mode-active');
    };
  }, [isTestActive, activeAttempt?.status, isSubmitted]);

  // Countdown timer for the selected assessment
  useEffect(() => {
    if (!isTestActive || isSubmitted) return;

    if (timeLeftSeconds <= 0) {
      handleSubmitQuiz(true);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTestActive, isSubmitted, timeLeftSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Questions List
  const questionsList: Question[] = selectedTest.questions || [];

  const totalQuestions = questionsList.length;
  const attemptedCount = Object.keys(selectedAnswers).length;
  const reviewCount = Object.values(markedForReview).filter(Boolean).length;
  const unattemptedCount = totalQuestions - attemptedCount;

  // Derive test identity from the canonical database profile, not editable browser metadata.
  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) {
      setStudentDetails(null);
      setIsTestActive(false);
      return;
    }
    if (!profile) {
      setStudentDetails(null);
      setIsTestActive(false);
      setLoginError('आपका विद्यार्थी प्रोफाइल database में उपलब्ध नहीं है। कृपया स्कूल प्रशासन से संपर्क करें।');
      return;
    }
    const studentClass = `${profile.class_level}th`;
    if (!profile.student_name.trim() || !profile.roll_no.trim() || !profile.school_name.trim() || !['6th', '7th', '8th', '9th', '10th', '11th', '12th'].includes(studentClass)) {
      setStudentDetails(null);
      setIsTestActive(false);
      setLoginError('आपके विद्यार्थी प्रोफाइल का विवरण अधूरा है। कृपया स्कूल प्रशासन से संपर्क करें।');
      return;
    }
    const details: StudentLoginDetails = {
      mobile: user.phone || String(user.user_metadata?.mobile_number || ''),
      studentName: profile.student_name,
      studentClass,
      rollNo: profile.roll_no,
      school: profile.school_name,
      otherSchool: '',
    };
    setStudentDetails(details);
    setLoginForm(details);
    setLoginError('');
  }, [user, profile, authLoading, profileLoading]);

  const getReadableErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const value = error as Record<string, unknown>;
      for (const key of ['message', 'error_description', 'details', 'hint', 'error']) {
        const candidate = value[key];
        if (typeof candidate === 'string' && candidate.trim()) return candidate;
        if (candidate && typeof candidate === 'object' && 'message' in candidate) {
          const nested = (candidate as { message?: unknown }).message;
          if (typeof nested === 'string' && nested.trim()) return nested;
        }
      }
      try {
        const serialized = JSON.stringify(error);
        if (serialized && serialized !== '{}') return serialized;
      } catch { /* use the safe fallback below */ }
    }
    return 'परीक्षा शुरू नहीं हो सकी। कृपया पुनः प्रयास करें।';
  };

  const handleStudentLogin = async () => {
    setLoginError('');
    if (!user || !studentDetails) {
      onRequestLogin();
      return;
    }
    if (studentDetails.studentClass.replace(/th$/i, '') !== selectedTest.classLevel) {
      setLoginError(`यह टेस्ट कक्षा ${selectedTest.classLevel} के लिए है। आपके खाते की कक्षा ${studentDetails.studentClass} है।`);
      return;
    }
    try {
      setSubmissionStatus({ loading: true, message: 'Database से परीक्षा अनुमति जाँची जा रही है...' });
      // Give students a clear message when all configured attempts are used.
      // An in-progress attempt remains resumable.
      const previousAttempts = await getMyTestAttempts();
      const thisTestAttempts = previousAttempts.filter((item) => item.test_id === selectedTest.id);
      const hasInProgressAttempt = thisTestAttempts.some((item) => item.status === 'in_progress');
      if (thisTestAttempts.length >= Math.max(1, Number(selectedTest.attemptLimit || 1)) && !hasInProgressAttempt) {
        setSubmissionStatus({ loading: false, success: false, message: '' });
        setLoginError((questionLang === 'hi' ? `आप इस परीक्षा के सभी निर्धारित प्रयास पूरे कर चुके हैं। इस टेस्ट के लिए अधिकतम ${allowedAttempts} प्रयास अनुमत हैं। आपका पिछला परिणाम सुरक्षित है।` : `You have used all allowed attempts for this test. A maximum of ${allowedAttempts} attempts are permitted. Your previous result has been saved.`));
        return;
      }
      const attempt = await startTestAttempt(selectedTest.id);
      setActiveAttempt(attempt);
      setServerResult(null);
      const remaining = Math.max(0, Math.ceil((new Date(attempt.expires_at).getTime() - Date.now()) / 1000));
      const saved = restoredSession;
      const sameStudent = !!saved &&
        saved.student.studentName === studentDetails.studentName &&
        saved.student.rollNo === studentDetails.rollNo &&
        saved.student.studentClass === studentDetails.studentClass &&
        saved.student.school === studentDetails.school;
      const canRestoreAnswers = !!saved &&
        saved.testId === selectedTest.id &&
        sameStudent &&
        attempt.status === 'in_progress' &&
        remaining > 0;
      if (canRestoreAnswers && saved) {
        setSelectedAnswers(saved.selectedAnswers);
        setMarkedForReview(saved.markedForReview);
        setCurrentQuestionIndex(Math.min(Math.max(0, saved.currentQuestionIndex), Math.max(0, selectedTest.questions.length - 1)));
        setQuestionLang(saved.questionLang);
        setViewLayout(saved.viewLayout);
      } else {
        setSelectedAnswers({});
        setMarkedForReview({});
        setCurrentQuestionIndex(0);
        if (saved && !sameStudent) localStorage.removeItem(ACTIVE_TEST_SESSION_KEY);
      }
      const active = attempt.status === 'in_progress' && remaining > 0;
      setTimeLeftSeconds(remaining);
      setIsSubmitted(false);
      setIsTestActive(active);
      setSubmissionStatus({ loading: false, success: true, message: 'आपकी परीक्षा शुरू हो गई है।' });
      setTimeout(() => document.getElementById('cbt-test-workspace')?.scrollIntoView({ behavior: 'smooth' }), 60);
    } catch (error) {
      setSubmissionStatus({ loading: false, success: false, message: '' });
      const errorMessage = getReadableErrorMessage(error);
      const errorDetails = (() => {
        try { return JSON.stringify(error); } catch { return errorMessage; }
      })();
      const isAttemptLimitReached = /attempt[\\s_-]*limit[\\s_-]*reached|limit.*attempt.*reach/i.test(`${errorMessage} ${errorDetails}`);
      setLoginError(isAttemptLimitReached
        ? (questionLang === 'hi' ? 'आप इस परीक्षा के सभी निर्धारित प्रयास पूरे कर चुके हैं। इस टेस्ट के लिए अधिकतम ${allowedAttempts} प्रयास अनुमत हैं। आपका पिछला परिणाम सुरक्षित है।' : 'You have used all allowed attempts for this test. A maximum of ${allowedAttempts} attempts are permitted. Your previous result has been saved.')
        : errorMessage);
    }
  };

  const handleLogoutStudent = async () => {
    if (confirm('क्या आप लॉगआउट करना चाहते हैं? (Sign out?)')) {
      setIsTestActive(false);
      setIsSubmitted(false);
      setSelectedAnswers({});
      setMarkedForReview({});
      setShowMobilePalette(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('krishan_sir_active_student');
        localStorage.removeItem(ACTIVE_TEST_SESSION_KEY);
      }
      await signOut();
    }
  };

  // Select question option
  const handleSelectOption = (qIndex: number, optIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIndex]: optIndex,
    }));
  };

  // Toggle mark for review
  const handleToggleReview = (qIndex: number) => {
    if (isSubmitted) return;
    setMarkedForReview((prev) => ({
      ...prev,
      [qIndex]: !prev[qIndex],
    }));
  };

  // Clear answer for current question
  const handleClearAnswer = (qIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      delete next[qIndex];
      return next;
    });
  };

  // Scores are authoritative only after PostgreSQL server-side grading.
  const marksObtained = serverResult?.score ?? 0;
  const scorecardTotalMarks = serverResult?.total_marks ?? selectedTest.totalMarks;
  const percentage = (serverResult?.percentage ?? 0).toFixed(2);
  const correctCount = serverResult?.correct_count ?? 0;
  const marksPerQuestion = selectedTest.totalMarks / Math.max(1, totalQuestions);

  // Submit answers to the trusted PostgreSQL RPC; never calculate or store final marks in the browser.
  const handleSubmitQuiz = async (timeExpired = false) => {
    if (submissionInFlight.current) return;
    if (!studentDetails || !activeAttempt) {
      alert('आपकी सक्रिय परीक्षा का database रिकॉर्ड नहीं मिला। कृपया स्कूल प्रशासन से संपर्क करें।');
      return;
    }
    if (!timeExpired && attemptedCount < totalQuestions) {
      const confirmIncomplete = confirm(
        `कुल ${totalQuestions} में से आपने ${attemptedCount} प्रश्नों के उत्तर दिए हैं।\n${unattemptedCount} प्रश्न अभी अनुत्तरित हैं।\n\nक्या आप टेस्ट सबमिट करना चाहते हैं?`
      );
      if (!confirmIncomplete) return;
    }

    submissionInFlight.current = true;
    setSubmissionStatus({
      loading: true,
      message: timeExpired
        ? 'समय समाप्त हो गया है। आपकी परीक्षा स्वतः सबमिट की जा रही है...'
        : 'आपके उत्तर सुरक्षित रूप से जाँचे जा रहे हैं...',
    });
    try {
      const answers: Record<number, number | null> = {};
      for (let index = 0; index < totalQuestions; index += 1) {
        answers[index] = Number.isInteger(selectedAnswers[index]) ? selectedAnswers[index] : null;
      }
      const result = await submitTestAttempt(activeAttempt.id, answers);
      setServerResult(result);
      setActiveAttempt(result);
      setIsSubmitted(true);
      setIsTestActive(false);
      localStorage.removeItem(ACTIVE_TEST_SESSION_KEY);
      localStorage.removeItem('krishan_sir_active_student');
      setSubmissionStatus({
        loading: false,
        success: result.status === 'submitted',
        message: result.status === 'submitted'
          ? 'आपका परिणाम database में सुरक्षित हो गया है।'
          : 'परीक्षा का समय समाप्त हो गया था; प्रयास expired दर्ज किया गया है।',
      });
      setTimeout(() => {
        document.getElementById('test-result-card')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      setSubmissionStatus({
        loading: false,
        success: false,
        message: error instanceof Error ? error.message : 'परिणाम सुरक्षित नहीं हो सका। कृपया इंटरनेट कनेक्शन जाँचें।',
      });
      // Keep the attempt active so the student can retry submission without losing answers.
    } finally {
      submissionInFlight.current = false;
    }
  };

  // Re-attempt test
  const handleReattempt = async () => {
    try {
      const attempt = await startTestAttempt(selectedTest.id);
      setActiveAttempt(attempt);
      setServerResult(null);
      setSelectedAnswers({});
      setMarkedForReview({});
      setCurrentQuestionIndex(0);
      setTimeLeftSeconds(Math.max(0, Math.ceil((new Date(attempt.expires_at).getTime() - Date.now()) / 1000)));
      setIsSubmitted(false);
      setIsTestActive(attempt.status === 'in_progress');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error ?? '');
      const errorDetails = (() => {
        try { return JSON.stringify(error); } catch { return errorMessage; }
      })();
      const isAttemptLimitReached = /attempt[\\s_-]*limit[\\s_-]*reached|limit.*attempt.*reach/i.test(`${errorMessage} ${errorDetails}`);
      setSubmissionStatus({ loading: false, success: false, message: isAttemptLimitReached
        ? (questionLang === 'hi' ? 'आप इस परीक्षा के सभी निर्धारित प्रयास पूरे कर चुके हैं। इस टेस्ट के लिए अधिकतम ${allowedAttempts} प्रयास अनुमत हैं। आपका पिछला परिणाम सुरक्षित है।' : 'You have used all allowed attempts for this test. A maximum of ${allowedAttempts} attempts are permitted. Your previous result has been saved.')
        : (errorMessage || 'दोबारा टेस्ट शुरू नहीं हो सका।') });
    }
  };

  // Save Google Sheet Webhook URL
  const handleSaveGoogleSheetUrl = (e: React.FormEvent) => {
    e.preventDefault();
    saveGoogleSheetUrl(googleSheetUrlInput);
    setSaveUrlSuccess(true);
    setTimeout(() => setSaveUrlSuccess(false), 3000);
  };

  // Copy Apps Script code
  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Delete submission
  const handleDeleteSubmission = (id: string) => {
    if (confirm('क्या आप इस विद्यार्थी का रिकॉर्ड हटाना चाहते हैं?')) {
      const updated = deleteLocalSubmission(id);
      setSubmissionsList(updated);
    }
  };

  // Filtered submissions
  const filteredSubmissions = submissionsList.filter((s) => {
    const q = searchStudentQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.student.studentName.toLowerCase().includes(q) ||
      s.student.rollNo.toLowerCase().includes(q) ||
      s.student.mobile.includes(q) ||
      s.student.school.toLowerCase().includes(q)
    );
  });

  const currentQ = questionsList[currentQuestionIndex] || questionsList[0];

  return (
    <section id="tests" className="py-10 bg-slate-50 border-b border-slate-200 exam-test-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* AVAILABLE TESTS SELECTOR */}
        <div className={"mb-6 rounded-2xl sm:rounded-3xl border border-sky-200 bg-white p-3.5 sm:p-6 shadow-sm " + (isTestActive ? "hidden" : "")}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Choose an Assessment</p>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">उपलब्ध ऑनलाइन टेस्ट चुनें</h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">Supabase में प्रकाशित और आपकी कक्षा के लिए उपलब्ध ऑनलाइन टेस्ट चुनें।</p>
              {catalogueLoading && <p role="status" className="mt-2 text-xs text-sky-700">Supabase से tests लोड हो रहे हैं...</p>}
              {catalogueError && <p role="alert" className="mt-2 text-xs text-amber-700">Online catalogue लोड नहीं हुआ: {catalogueError}</p>}
              {!catalogueLoading && user && profile && availableTests.length === 0 && <p role="status" className="mt-2 text-xs text-amber-700">आपकी कक्षा के लिए अभी कोई प्रकाशित टेस्ट उपलब्ध नहीं है।</p>}
            </div>
            <span className="inline-flex self-start sm:self-auto items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 border border-sky-100">
              {filteredTests.length} Tests Available
            </span>
          </div>
          <div className="mb-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_190px] gap-2.5">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={testSearch} onChange={(event) => setTestSearch(event.target.value)} placeholder="टेस्ट खोजें / Search tests..." aria-label="Search tests" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>
            <select value={testClassFilter} onChange={(event) => setTestClassFilter(event.target.value)} aria-label="Filter tests by class" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
              <option value="all">सभी कक्षाएँ / All Classes</option>
              {testClassOptions.map((classLevel) => <option key={classLevel} value={classLevel}>Class {classLevel}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {filteredTests.map((test) => {
              const isSelected = selectedTest.id === test.id;
              return (
                <div
                  key={test.id}
                  className={`w-full min-w-0 rounded-2xl border-2 p-3.5 sm:p-4 shadow-sm transition-all hover:shadow-md ${isSelected ? 'border-sky-700 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white'}`}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                  onClick={() => {
                    if (isSelected) return;
                    if (studentDetails && !window.confirm('दूसरा टेस्ट चुनने पर वर्तमान टेस्ट/परिणाम स्क्रीन बंद होगी। क्या आगे बढ़ें?')) return;
                    if (studentDetails) {
                      setStudentDetails(null);
                      localStorage.removeItem('krishan_sir_active_student');
                      localStorage.removeItem(ACTIVE_TEST_SESSION_KEY);
                    }
                    setSelectedTest(test);
                  }}
                  className="w-full min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex rounded-lg bg-sky-900 px-2.5 py-1 text-[11px] font-bold text-white">
                        Class {test.classLevel}
                      </span>
                      <h3 className="mt-2 sm:mt-3 text-[15px] sm:text-base leading-snug font-extrabold text-slate-900 break-words">{test.title.hi}</h3>
                      <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600 break-words">{test.title.en}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isSelected ? 'चयनित / SELECTED' : 'चुनें / SELECT'}
                    </span>
                  </div>
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2 text-xs font-semibold text-slate-600">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 sm:py-1">{test.questions.length} MCQs</span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1">{test.totalMarks} Marks</span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1">{test.durationMinutes} Minutes</span>
                  </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (authLoading || profileLoading || submissionStatus.loading) return;
                      if (!user) {
                        onRequestLogin();
                        return;
                      }
                      if (!studentDetails) {
                        setLoginError('आपका विद्यार्थी प्रोफाइल अधूरा है। कृपया अपनी प्रोफाइल पूरी करें।');
                        return;
                      }
                      handleStudentLogin();
                    }}
                    disabled={authLoading || profileLoading || submissionStatus.loading}
                    className={`mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${isSelected ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sky-900 hover:bg-sky-800'}`}
                  >
                    <span>{submissionStatus.loading && isSelected ? 'Starting… / शुरू हो रहा है…' : user ? 'Continue / Start Test' : 'Login to Start Test'}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {isSelected && loginError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{displayLoginError}</p>}
                </div>
              );
            })}
          </div>
          {!catalogueLoading && filteredTests.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-sky-300 bg-gradient-to-br from-white to-sky-50 px-5 py-8 sm:px-8 sm:py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-800"><Search className="h-7 w-7" /></div>
              <h3 className="mt-4 text-lg sm:text-xl font-extrabold text-slate-900">अभी कोई प्रकाशित टेस्ट उपलब्ध नहीं है</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">इस पोर्टल पर टेस्ट प्रकाशित होते ही वे यहाँ दिखाई देंगे। कृपया बाद में पुनः देखें।</p>
              {catalogueError && <p className="mt-3 text-xs font-semibold text-amber-700">Catalogue status: {catalogueError}</p>}
            </div>
          )}
        </div>

        {/* SELECTED TEST OVERVIEW — shown only for a real published test */}
        <div className={`relative mb-4 sm:mb-5 overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-md shadow-sky-950/5 ${selectedTest.id && !isTestActive ? '' : 'hidden'}`}>
          <div className="h-2 w-full bg-gradient-to-r from-sky-800 via-cyan-500 to-emerald-400" />
          <div className="p-4 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-100 px-2.5 py-1 text-[10px] font-bold tracking-wide text-sky-800">
                <Award className="h-3.5 w-3.5" />
                <span>ONLINE CBT EXAMINATION</span>
              </div>
              <h1 className="font-display text-xl font-extrabold leading-tight tracking-tight text-[#12396f] sm:text-2xl">
                Class {selectedTest.classLevel} {selectedTest.subject}
              </h1>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600 sm:text-base">{selectedTest.title.hi}</p>
            </div>
            <div className="relative z-10 flex flex-wrap items-center gap-2 sm:justify-end">
              {isAIStudio && (
                <>
                  {isAdmin ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowTeacherPanel(!showTeacherPanel)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                          showTeacherPanel ? 'bg-amber-300 text-sky-950' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                        title="AI Studio Admin: Google Sheet & Student Results Vault"
                      >
                        <Database className="h-4 w-4" />
                        <span>{showTeacherPanel ? 'Hide Teacher Vault' : 'Results Vault'}</span>
                        <span className="rounded-md bg-sky-950/40 px-1.5 py-0.5 font-mono text-[10px]">{submissionsList.length}</span>
                      </button>
                      <button onClick={handleAdminLogout} className="rounded-lg border border-rose-300/30 p-2 text-rose-200 transition-colors hover:bg-rose-500/20 hover:text-white" title="Lock Admin / लॉगआउट">
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAdminPinInput(''); setAdminPinError(''); setShowAdminAuthModal(true); }}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-white/15"
                      title="Teacher / Admin Access (केवल AI Studio हेतु)"
                    >
                      <Lock className="h-3.5 w-3.5 text-amber-300" />
                      <span>Teacher Access</span>
                    </button>
                  )}
                </>
              )}
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1 text-[11px] font-semibold">
                <button onClick={() => setQuestionLang('hi')} aria-pressed={questionLang === 'hi'} className={`rounded-md px-3 py-1.5 transition-colors ${questionLang === 'hi' ? 'bg-amber-300 text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/10'}`}>हिंदी</button>
                <button onClick={() => setQuestionLang('en')} aria-pressed={questionLang === 'en'} className={`rounded-md px-3 py-1.5 transition-colors ${questionLang === 'en' ? 'bg-amber-300 text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/10'}`}>English</button>
              </div>
            </div>
          </div>

          {/* Essential information only; live countdown is shown in the sticky exam dashboard. */}
          <div className="relative z-10 mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">कुल प्रश्न / Questions</div>
              <div className="mt-0.5 font-mono text-lg font-extrabold text-slate-900 sm:text-xl">{totalQuestions} MCQs</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">कुल अंक / Total Marks</div>
              <div className="mt-0.5 font-mono text-lg font-extrabold text-teal-700 sm:text-xl">{selectedTest.totalMarks}</div>
            </div>
            {!studentDetails && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <div className="text-[10px] font-semibold text-amber-800 sm:text-[11px]">समय / Duration</div>
                <div className="mt-0.5 font-mono text-lg font-extrabold text-amber-900 sm:text-xl">{TOTAL_TEST_MINUTES} मिनट</div>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* TEACHER / ADMIN DATA VAULT & GOOGLE SHEETS SYNC PANEL (Visible ONLY in AI Studio) */}
        {isAIStudio && isAdmin && showTeacherPanel && (
          <div className="mb-8 bg-white rounded-3xl border border-sky-200 shadow-xl p-6 sm:p-8 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 uppercase tracking-wider mb-1">
                  <Database className="w-4 h-4 text-sky-700" />
                  <span>Teacher Assessment Hub & Google Sheet Sync</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 font-display">
                  विद्यार्थी परीक्षा परिणाम एवं डेटा संग्रह (Student Responses)
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  यह सूची केवल इस ब्राउज़र के स्थानीय रिकॉर्ड दिखाती है। सभी विद्यार्थियों के केंद्रीकृत परिणाम निजी Google Sheet में देखें।
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportSubmissionsToCSV(submissionsList)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel/CSV</span>
                </button>
              </div>
            </div>

            {/* Google Sheets Link / Web App Setup Configuration */}
            <div className="my-6 p-5 rounded-2xl bg-sky-50 border border-sky-200/80">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Google Sheet Webhook Link Configuration (गूगल शीट लिंक)</span>
              </h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                यहाँ अपने Google Sheets Apps Script Web App का URL दर्ज करें। जैसे ही कोई विद्यार्थी टेस्ट सबमिट करेगा, उसका सारा डेटा सीधे आपकी Google Sheet में स्वतः नई पंक्ति में दर्ज हो जाएगा।
              </p>
              {/* Active Link Status Indicator */}
              <div className="mb-3 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Google Sheet Web App URL:</span>
                <span className="font-mono text-[11px] truncate text-emerald-950 font-medium">
                  {googleSheetUrlInput || 'अभी सेट नहीं है — प्रकाशित करने से पहले src/config.ts में URL जोड़ें'}
                </span>
              </div>

              <form onSubmit={handleSaveGoogleSheetUrl} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={googleSheetUrlInput}
                  onChange={(e) => setGoogleSheetUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-600"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-sm"
                >
                  Update / Link Sheet
                </button>
              </form>

              {saveUrlSuccess && (
                <div className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Google Sheets URL सफलतापूर्वक सहेज लिया गया है!</span>
                </div>
              )}

              {/* Instructions & Script Code Toggle */}
              <div className="mt-4 pt-3 border-t border-sky-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  Google Sheet में Apps Script कैसे जोड़ें?
                </span>
                <button
                  onClick={handleCopyScript}
                  className="text-sky-800 hover:text-sky-950 font-bold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-sky-200"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Code Copied!' : 'Copy Google Apps Script Code'}</span>
                </button>
              </div>
            </div>

            {/* Responses Search & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchStudentQuery}
                  onChange={(e) => setSearchStudentQuery(e.target.value)}
                  placeholder="विद्यार्थी का नाम, रोल नंबर या मोबाइल खोजें..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="text-xs text-slate-500 font-medium">
                कुल सबमिशन: <span className="font-bold text-slate-900">{filteredSubmissions.length}</span>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Roll No</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Mobile</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3">School</th>
                    <th className="py-3 px-3 text-center">Score</th>
                    <th className="py-3 px-3 text-center">%</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        कोई सबमिशन नहीं मिला। जैसे ही विद्यार्थी टेस्ट पूरा करेंगे, यहाँ परिणाम दिखाई देगा।
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-sky-900">{sub.student.rollNo}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{sub.student.studentName}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{sub.student.mobile}</td>
                        <td className="py-3 px-3">{sub.student.studentClass}</td>
                        <td className="py-3 px-3 max-w-[180px] truncate" title={sub.student.school}>
                          {sub.student.school}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-sky-900 font-mono">
                          {sub.score} / {sub.totalMarks}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                          {sub.percentage}%
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{sub.timestamp}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteSubmission(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* COMPACT CANDIDATE STRIP */}
        {studentDetails && (
          <div className={`mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 ${isTestActive ? 'hidden sm:flex' : 'flex'}`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-900 text-sm font-extrabold text-white">
                {studentDetails.studentName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-sm font-bold text-slate-900">{studentDetails.studentName}</span>
                  <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800">Class {studentDetails.studentClass}</span>
                  <span className="text-[11px] font-medium text-slate-500">Roll No. <span className="font-mono font-bold text-slate-700">{studentDetails.rollNo}</span></span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">Candidate / परीक्षार्थी</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-[11px] font-semibold">
                <button type="button" onClick={() => setViewLayout('cbt')} aria-pressed={viewLayout === 'cbt'} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${viewLayout === 'cbt' ? 'bg-white text-sky-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                  <Layers className="h-3.5 w-3.5" /><span>CBT Mode</span>
                </button>
                <button type="button" onClick={() => setViewLayout('all')} aria-pressed={viewLayout === 'all'} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${viewLayout === 'all' ? 'bg-white text-sky-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                  <Eye className="h-3.5 w-3.5" /><span>All Questions</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleLogoutStudent}
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                Switch Student
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: ACTIVE TEST WORKSPACE — visible only after the database confirms an attempt */}
        {studentDetails && activeAttempt && !isSubmitted && (
          <div className="exam-interface space-y-3 pb-24 sm:space-y-5 sm:pb-0">
            {/* RESPONSIVE EXAM STATUS: compact on phones, full dashboard on larger screens */}
            <div className="mobile-exam-status sticky top-0 z-30 rounded-xl sm:rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-md p-2.5 sm:p-4 lg:static lg:shadow-sm" aria-label="Live examination status">
              <div className="flex items-center justify-between gap-2 lg:hidden">
                <div className={"flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 " + (timeLeftSeconds < 300 ? "bg-red-50 border-red-200 text-red-900" : timeLeftSeconds < 900 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-sky-50 border-sky-200 text-sky-950")}>
                  <div className="flex items-center gap-1 text-[9px] font-bold uppercase"><Clock className="h-3.5 w-3.5" /> समय</div>
                  <div className="font-mono text-base font-extrabold leading-tight tabular-nums" aria-live="polite">{formatTimer(timeLeftSeconds)}</div>
                </div>
                <button type="button" onClick={() => setShowAttemptSummaryModal(true)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-left"><div className="text-[9px] font-bold text-emerald-800">DONE</div><div className="font-mono text-sm font-extrabold leading-tight text-emerald-900">{attemptedCount}<span className="text-[10px] font-semibold">/{totalQuestions}</span></div></button>
                <button type="button" onClick={() => setShowAttemptSummaryModal(true)} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left"><div className="text-[9px] font-bold text-slate-600">LEFT</div><div className="font-mono text-sm font-extrabold leading-tight text-slate-800">{unattemptedCount}</div></button>
              </div>
              <div className="hidden lg:grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5"><div className="text-[10px] font-bold text-sky-800">TIME LEFT</div><div className="font-mono text-xl font-extrabold">{formatTimer(timeLeftSeconds)}</div></div>
                <button type="button" onClick={() => setShowAttemptSummaryModal(true)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left"><div className="text-[10px] font-bold text-emerald-800">ATTEMPTED</div><div className="font-mono text-xl font-extrabold">{attemptedCount}/{totalQuestions}</div></button>
                <button type="button" onClick={() => setShowAttemptSummaryModal(true)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left"><div className="text-[10px] font-bold text-slate-600">NOT ATTEMPTED</div><div className="font-mono text-xl font-extrabold">{unattemptedCount}</div></button>
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5"><div className="text-[10px] font-bold text-sky-800">TOTAL MARKS</div><div className="font-mono text-xl font-extrabold">{selectedTest.totalMarks}</div></div>
                <button type="button" onClick={() => setShowAttemptSummaryModal(true)} className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2.5 text-left"><div className="text-[10px] font-bold text-purple-800">REVIEW</div><div className="font-mono text-xl font-extrabold">{reviewCount}</div></button>
                <button type="button" onClick={() => setShowAttemptSummaryModal(true)} className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-left"><div className="text-[10px] font-bold text-sky-800">PROGRESS</div><div className="font-mono text-xl font-extrabold">{Math.round((attemptedCount / Math.max(1, totalQuestions)) * 100)}%</div></button>
              </div>
              <div className="mt-1.5 sm:mt-3"><div className="mb-1 flex items-center justify-between text-[9px] sm:text-xs font-semibold text-slate-600"><span>प्रश्न {currentQuestionIndex + 1}/{totalQuestions} · {reviewCount} समीक्षा हेतु · {selectedTest.totalMarks} अंक</span><span className="font-mono">{Math.round((attemptedCount / Math.max(1, totalQuestions)) * 100)}%</span></div><div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-sky-700 to-emerald-500 transition-all" style={{width: `${(attemptedCount / Math.max(1,totalQuestions)) * 100}%`}} /></div></div>
            </div>
            {/* MOBILE QUESTION PALETTE: compact collapsible navigation */}
            <div className="lg:hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 p-2.5">
                <button
                  type="button"
                  onClick={() => setShowMobilePalette((open) => !open)}
                  aria-expanded={showMobilePalette}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-800"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Layers className="h-4 w-4 shrink-0 text-sky-800" />
                    <span className="truncate">Question Palette / प्रश्न सूची</span>
                    <span className="shrink-0 rounded-md bg-sky-100 px-2 py-0.5 font-mono text-[10px] text-sky-900">{attemptedCount}/{totalQuestions}</span>
                  </span>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${showMobilePalette ? 'rotate-90' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitQuiz()}
                  disabled={submissionStatus.loading}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  Submit
                </button>
              </div>

              {showMobilePalette && (
                <div className="border-t border-slate-100 p-3">
                  <div className="mb-3 grid grid-cols-3 gap-2 text-[10px] font-semibold">
                    <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-center text-emerald-800">Answered: {attemptedCount}</div>
                    <div className="rounded-lg bg-slate-100 px-2 py-1.5 text-center text-slate-700">Unanswered: {unattemptedCount}</div>
                    <div className="rounded-lg bg-purple-50 px-2 py-1.5 text-center text-purple-800">Review: {reviewCount}</div>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                    {questionsList.map((_, idx) => {
                      const isAnswered = selectedAnswers[idx] !== undefined;
                      const isMarked = markedForReview[idx] === true;
                      const isCurrent = currentQuestionIndex === idx;
                      let style = 'border-slate-200 bg-slate-50 text-slate-700';
                      if (isAnswered && isMarked) style = 'border-purple-700 bg-purple-600 text-white';
                      else if (isAnswered) style = 'border-emerald-700 bg-emerald-600 text-white';
                      else if (isMarked) style = 'border-purple-700 bg-purple-600 text-white';
                      if (isCurrent) style += ' ring-2 ring-sky-500 ring-offset-1';
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCurrentQuestionIndex(idx);
                            setShowMobilePalette(false);
                            if (viewLayout === 'all') {
                              setTimeout(() => document.getElementById(`q-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
                            } else {
                              document.getElementById('cbt-test-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          className={`flex h-10 items-center justify-center rounded-lg border text-sm font-bold font-mono transition-colors ${style}`}
                          aria-label={`Go to question ${idx + 1}${isAnswered ? ', answered' : ', unanswered'}`}
                          aria-current={isCurrent ? 'step' : undefined}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3" role="progressbar" aria-label="Answered questions progress" aria-valuemin={0} aria-valuemax={totalQuestions} aria-valuenow={attemptedCount}>
                    <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                      <span>प्रश्न पूर्णता / Completion</span>
                      <span className="font-mono text-sky-800">{Math.round((attemptedCount / Math.max(1, totalQuestions)) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-sky-700 via-cyan-500 to-emerald-500 transition-[width] duration-500 ease-out" style={{ width: `${(attemptedCount / Math.max(1, totalQuestions)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> Answered</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-slate-200" /> Unanswered</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-purple-600" /> Review</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border-2 border-sky-500 bg-white" /> Current</span>
                  </div>
                </div>
              )}
            </div>

            <div id="cbt-test-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5 xl:gap-6 items-start">

            {/* LEFT AREA: CURRENT QUESTION (OR ALL QUESTIONS LIST) - 8 COLS */}
            <div className="lg:col-span-8 min-w-0 space-y-3 sm:space-y-5">

              {viewLayout === 'cbt' ? (
                /* Single Question Interactive CBT Card */
                <div className="exam-question-card bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm sm:shadow-md p-3.5 sm:p-6 xl:p-8 transition-all">
                  
                  {/* Question Meta Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 sm:gap-3 sm:pb-4 sm:mb-5 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-900 bg-sky-50 border border-sky-200 px-3 py-1 rounded-lg">
                        {currentQ.chapter}
                      </span>
                      {markedForReview[currentQuestionIndex] && (
                        <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <Bookmark className="w-3 h-3 fill-purple-600 text-purple-600" />
                          <span>Marked for Review</span>
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 font-semibold font-mono">
                      Question <span className="text-slate-900 font-bold">{currentQuestionIndex + 1}</span> of {totalQuestions}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mb-3 sm:mb-6">
                    <h3 className="break-words text-lg sm:text-xl font-bold text-slate-900 leading-relaxed tracking-normal">
                      {currentQuestionIndex + 1}. {questionLang === 'hi' ? currentQ.question.hi : currentQ.question.en}
                    </h3>
                    {questionLang === 'hi' && currentQ.question.en && (
                      <p className="mt-1 text-xs text-slate-500 italic">
                        {currentQ.question.en}
                      </p>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-6">
                    {(questionLang === 'hi' ? currentQ.options.hi : currentQ.options.en).map((opt, optIdx) => {
                      const isOptionChosen = selectedAnswers[currentQuestionIndex] === optIdx;

                      return (
                        <label
                          key={optIdx}
                          onClick={() => handleSelectOption(currentQuestionIndex, optIdx)}
                          className={`exam-option flex items-start gap-3 p-3.5 sm:gap-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
                            isOptionChosen
                              ? 'bg-sky-50/90 border-sky-600 text-sky-950 font-semibold shadow-xs ring-1 ring-sky-600'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`cbt-opt-${currentQuestionIndex}`}
                            value={optIdx}
                            checked={isOptionChosen}
                            onChange={() => handleSelectOption(currentQuestionIndex, optIdx)}
                            className="mt-1 h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="text-base sm:text-lg leading-relaxed">
                              <b className="text-sky-900 mr-2 font-mono">{String.fromCharCode(65 + optIdx)}.</b>
                              {opt}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* Navigation & Question Action Buttons */}
                  <div className="hidden sm:flex pt-4 border-t border-slate-100 flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleReview(currentQuestionIndex)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border ${
                          markedForReview[currentQuestionIndex]
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{markedForReview[currentQuestionIndex] ? 'Unmark Review' : 'Mark for Review'}</span>
                      </button>

                      {selectedAnswers[currentQuestionIndex] !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleClearAnswer(currentQuestionIndex)}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-700 bg-white border border-slate-200 hover:bg-red-50 transition-colors flex items-center gap-1"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          <span>Clear Answer</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentQuestionIndex === 0}
                        onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      {currentQuestionIndex < totalQuestions - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                          className="px-5 py-2 rounded-xl bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <span>Save &amp; Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSubmitQuiz()}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit Test</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                /* Continuous List View of all questions */
                <div className="space-y-4">
                  {questionsList.map((q, i) => {
                    const isOptionChosen = selectedAnswers[i] !== undefined;

                    return (
                      <div
                        key={q.id || i}
                        id={`q-${i}`}
                        className={`bg-white rounded-2xl border p-5 transition-all shadow-xs ${
                          currentQuestionIndex === i
                            ? 'border-sky-500 ring-2 ring-sky-500/20'
                            : 'border-slate-200 hover:border-sky-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-sky-800 font-bold mb-2">
                          <span>{q.chapter}</span>
                          <span className="font-mono text-slate-500">Q.{i + 1} of {totalQuestions}</span>
                        </div>
                        <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-3 leading-relaxed">
                          {i + 1}. {questionLang === 'hi' ? q.question.hi : q.question.en}
                        </h4>

                        <div className="space-y-2">
                          {(questionLang === 'hi' ? q.options.hi : q.options.en).map((opt, optIdx) => {
                            const isChosen = selectedAnswers[i] === optIdx;

                            return (
                              <label
                                key={optIdx}
                                onClick={() => handleSelectOption(i, optIdx)}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm sm:text-base cursor-pointer transition-all ${
                                  isChosen
                                    ? 'bg-sky-50 border-sky-600 text-sky-950 font-semibold'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`list-q-${i}`}
                                  value={optIdx}
                                  checked={isChosen}
                                  onChange={() => handleSelectOption(i, optIdx)}
                                  className="mt-0.5 h-3.5 w-3.5 text-sky-600 border-slate-300"
                                />
                                <span>
                                  <b>{String.fromCharCode(65 + optIdx)}.</b> {opt}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* MOBILE FIXED CONTROLS: always reachable while answering */}
            <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur">
              <div className="mx-auto flex max-w-xl items-center gap-2">
                <button type="button" onClick={() => { const next = Math.max(0, currentQuestionIndex - 1); setCurrentQuestionIndex(next); if (viewLayout === "all") setTimeout(() => document.getElementById("q-" + next)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40); }} disabled={currentQuestionIndex === 0} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 disabled:opacity-35" aria-label="Previous question"><ChevronLeft className="h-5 w-5" /></button>
                <button type="button" onClick={() => handleToggleReview(currentQuestionIndex)} className={"flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-2 text-[11px] font-bold " + (markedForReview[currentQuestionIndex] ? "border-purple-600 bg-purple-600 text-white" : "border-purple-200 bg-purple-50 text-purple-800")}><Bookmark className="h-4 w-4 shrink-0" /><span>Review</span></button>
                {currentQuestionIndex < totalQuestions - 1 ? <button type="button" onClick={() => { const next = Math.min(totalQuestions - 1, currentQuestionIndex + 1); setCurrentQuestionIndex(next); if (viewLayout === "all") setTimeout(() => document.getElementById("q-" + next)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40); }} className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl bg-sky-900 px-2 text-[11px] font-bold text-white"><span>Next</span><ChevronRight className="h-4 w-4" /></button> : <button type="button" onClick={() => handleSubmitQuiz()} disabled={submissionStatus.loading} className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2 text-[11px] font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /><span>Submit Test</span></button>}
                <button type="button" onClick={() => handleSubmitQuiz()} disabled={submissionStatus.loading} className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-bold text-emerald-800 disabled:opacity-50">Submit</button>
              </div>
            </div>
            {/* RIGHT SIDEBAR: QUESTION PALETTE & SUBMISSION - 4 COLS */}
            <div className="hidden lg:block lg:col-span-4 min-w-0 space-y-4 lg:sticky lg:top-6 self-start">

              {/* 3. QUESTION PALETTE BOXES */}
              <div className="exam-palette-card bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider">
                    Question Palette (प्रश्न 1-{totalQuestions})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    क्लिक करके सीधे प्रश्न पर जाएं
                  </span>
                </div>

                {/* Question buttons grid */}
                <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {questionsList.map((_, idx) => {
                    const isAnswered = selectedAnswers[idx] !== undefined;
                    const isMarked = markedForReview[idx] === true;
                    const isCurrent = currentQuestionIndex === idx;

                    let btnStyle = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';

                    if (isAnswered && isMarked) {
                      btnStyle = 'bg-purple-600 text-white border-emerald-400 ring-2 ring-emerald-400';
                    } else if (isAnswered) {
                      btnStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
                    } else if (isMarked) {
                      btnStyle = 'bg-purple-600 text-white border-purple-600';
                    }

                    if (isCurrent) {
                      btnStyle += ' ring-2 ring-sky-500 ring-offset-1 font-black scale-105';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentQuestionIndex(idx);
                          if (viewLayout === 'all') {
                            document.getElementById(`q-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className={`h-8 rounded-lg text-xs font-mono font-bold border transition-all flex items-center justify-center cursor-pointer ${btnStyle}`}
                        title={`प्रश्न ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3" role="progressbar" aria-label="Answered questions progress" aria-valuemin={0} aria-valuemax={totalQuestions} aria-valuenow={attemptedCount}>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                    <span>प्रश्न पूर्णता / Completion</span>
                    <span className="font-mono text-sky-800">{Math.round((attemptedCount / Math.max(1, totalQuestions)) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-700 via-cyan-500 to-emerald-500 transition-[width] duration-500 ease-out" style={{ width: `${(attemptedCount / Math.max(1, totalQuestions)) * 100}%` }} />
                  </div>
                </div>

                {/* Palette Legend */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" />
                    <span>उत्तर दिया (Answered)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-300 inline-block" />
                    <span>शेष (Not Answered)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-purple-600 inline-block" />
                    <span>समीक्षा (Review)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-white border-2 border-sky-500 inline-block" />
                    <span>वर्तमान (Current)</span>
                  </div>
                </div>

                {/* Submit Test Button in Sidebar */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSubmitQuiz()}
                    disabled={submissionStatus.loading}
                    className="w-full py-3 rounded-xl bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Submit &amp; View Result / परिणाम देखें</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
          </div>
        )}

        {/* ATTEMPT DETAILS MODAL (Opened via Upper Right Attempt Details Button) */}
        {showAttemptSummaryModal && studentDetails && !isSubmitted && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 flex items-center justify-center shadow-xs">
                    <BarChart3 className="w-5 h-5 text-sky-700" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 font-display">
                      Attempt Details / परीक्षा स्थिति विवरण
                    </h3>
                    <p className="text-xs text-slate-500">
                      कुल {totalQuestions} प्रश्नों की वर्तमान स्थिति व प्रगति
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAttemptSummaryModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                  title="Close (बंद करें)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3 Status Summary Boxes */}
              <div className="grid grid-cols-3 gap-2.5 my-4 text-center">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  <div className="text-2xl font-black text-emerald-700 font-mono">
                    {attemptedCount}
                  </div>
                  <div className="text-xs font-bold text-emerald-900 mt-0.5">
                    उत्तर दिए
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">Answered</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <div className="text-2xl font-black text-slate-700 font-mono">
                    {unattemptedCount}
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">
                    अनुत्तरित
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Unanswered</div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3">
                  <div className="text-2xl font-black text-purple-700 font-mono">
                    {reviewCount}
                  </div>
                  <div className="text-xs font-bold text-purple-900 mt-0.5">
                    समीक्षा हेतु
                  </div>
                  <div className="text-[10px] text-purple-600 font-medium">Review</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>कुल पूर्णता (Overall Completion)</span>
                  <span className="font-mono text-sky-950 font-black">
                    {((attemptedCount / totalQuestions) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${(attemptedCount / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>

              {/* Direct jump grid */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>प्रश्न पर सीधे जाएं (Click to jump):</span>
                  <span className="text-[10px] text-slate-500 font-normal">प्रश्न 1 से {totalQuestions}</span>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-slate-50">
                  {questionsList.map((_, idx) => {
                    const isAnswered = selectedAnswers[idx] !== undefined;
                    const isMarked = markedForReview[idx] === true;
                    const isCurrent = currentQuestionIndex === idx;

                    let bg = 'bg-white text-slate-700 border-slate-200';
                    if (isAnswered && isMarked) bg = 'bg-purple-600 text-white border-purple-700';
                    else if (isAnswered) bg = 'bg-emerald-600 text-white border-emerald-700';
                    else if (isMarked) bg = 'bg-purple-600 text-white border-purple-700';

                    if (isCurrent) bg += ' ring-2 ring-sky-500 ring-offset-1 font-black';

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentQuestionIndex(idx);
                          setShowAttemptSummaryModal(false);
                          if (viewLayout === 'all') {
                            document.getElementById(`q-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className={`h-7.5 text-xs font-mono font-bold rounded-lg border flex items-center justify-center transition-all cursor-pointer ${bg}`}
                        title={`प्रश्न ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAttemptSummaryModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
                >
                  वापस टेस्ट पर जाएं (Close)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttemptSummaryModal(false);
                    handleSubmitQuiz();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>टेस्ट सबमिट करें</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: COMPREHENSIVE SCORECARD & RESULTS REVIEW (SHOWN UPON SUBMISSION) */}
        {studentDetails && isSubmitted && (
          <div className="space-y-6">

            {/* Scorecard Banner */}
            <div
              id="test-result-card"
              className="bg-white rounded-3xl border-2 border-amber-400 p-6 sm:p-8 text-center shadow-xl animate-in fade-in duration-300"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
                <CheckCircle2 className="w-4 h-4" />
                <span>टेस्ट सफलतापूर्वक पूरा हुआ ({TOTAL_TEST_MINUTES} Mins CBT Completed)</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                आपका परिणाम (Your Examination Scorecard)
              </h2>

              {/* Student details line */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 space-y-1">
                <p>
                  <b>विद्यार्थी:</b> {studentDetails.studentName} | <b>कक्षा:</b> {studentDetails.studentClass} | <b>रोल नंबर:</b> {studentDetails.rollNo}
                </p>
                <p>
                  <b>मोबाइल:</b> {studentDetails.mobile} | <b>विद्यालय:</b> {studentDetails.school}
                </p>
              </div>

              {/* Score breakdown metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 text-center">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="text-xs text-slate-500">कुल अंक (Score)</div>
                  <div className="text-3xl sm:text-4xl font-black text-sky-900 font-mono mt-1">
                    {marksObtained} <span className="text-sm font-normal text-slate-400">/ {scorecardTotalMarks}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="text-xs text-slate-500">प्रतिशत (Percentage)</div>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono mt-1">
                    {percentage}%
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="text-xs text-slate-500">सही उत्तर (Correct)</div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-800 font-mono mt-1">
                    {correctCount} <span className="text-sm font-normal text-slate-400">/ {attemptedCount}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="text-xs text-slate-500">श्रेणी (Division)</div>
                  <div className="text-base sm:text-lg font-bold text-amber-700 mt-2">
                    {Number(percentage) >= 80 ? 'Distinction' : Number(percentage) >= 60 ? 'First Division' : 'Needs Practice'}
                  </div>
                </div>
              </div>

              {/* Performance remarks from Krishan Sir */}
              <div className="max-w-2xl mx-auto p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm mb-4 text-left">
                <div className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>कृषण सर (TGT Social Science) का मार्गदर्शन व टिप्पणी:</span>
                </div>
                <p className="leading-relaxed">
                  {Number(percentage) >= 80
                    ? 'शानदार प्रदर्शन! आपने इस अध्याय की अवधारणाओं को अच्छी तरह समझा है। इसी प्रकार नियमित अभ्यास जारी रखें।'
                    : Number(percentage) >= 60
                    ? 'अच्छा प्रयास! जिन प्रश्नों में गलती हुई है, उनके स्पष्टीकरण पढ़ें और अध्याय का पुनः अभ्यास करें।'
                    : 'अभ्यास जारी रखें! नीचे प्रत्येक प्रश्न का सही उत्तर और स्पष्टीकरण दिया गया है। उन्हें ध्यान से पढ़ें और फिर से टेस्ट दें।'}
                </p>
              </div>

              {/* Data Collection confirmation message */}
              {submissionStatus.message && (
                <div className="mb-4 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 inline-flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{displaySubmissionMessage}</span>
                </div>
              )}

              {/* Scorecard Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleReattempt}
                  className="px-6 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Re-attempt {totalQuestions} MCQ Test / पुनः टेस्ट दें</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Scorecard / प्रिंट निकालें</span>
                </button>
              </div>
            </div>

            {isDatabaseTest ? (
              <div className="bg-sky-50 rounded-3xl border border-sky-200 p-6 sm:p-8 text-center">
                <ShieldCheck className="w-8 h-8 text-sky-700 mx-auto mb-2" />
                <h3 className="font-bold text-sky-950">आपका परिणाम सुरक्षित रूप से जाँचा गया है।</h3>
                <p className="text-sm text-sky-800 mt-1">सही उत्तरों की सूची इस स्क्रीन पर नहीं दिखाई जाती।</p>
              </div>
            ) : (
            /* Detailed Question Review with Green/Red highlights & Explanations */
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
              <h3 className="text-lg font-bold text-slate-900 mb-6 font-display flex items-center justify-between">
                <span>Detailed Question Review &amp; Explanations (विस्तृत उत्तर एवं समाधान)</span>
                <span className="text-xs text-slate-500 font-normal">Curated by Krishan Sir</span>
              </h3>

              <div className="space-y-5">
                {questionsList.map((q, idx) => {
                  const studentAns = selectedAnswers[idx];
                  const isCorrect = studentAns === q.correctAnswer;
                  const isSkipped = studentAns === undefined;

                  return (
                    <div
                      key={q.id || idx}
                      className={`rounded-2xl border p-5 transition-all ${
                        isCorrect
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : isSkipped
                          ? 'border-slate-200 bg-slate-50/40'
                          : 'border-red-300 bg-red-50/20'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-slate-700 font-mono">Question {idx + 1} ({q.chapter})</span>
                        {isCorrect ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Correct (+{marksPerQuestion})
                          </span>
                        ) : isSkipped ? (
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" /> Skipped (0)
                          </span>
                        ) : (
                          <span className="text-red-700 font-bold flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Incorrect (0)
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-3 leading-snug">
                        {questionLang === 'hi' ? q.question.hi : q.question.en}
                      </h4>

                      {/* Options breakdown */}
                      <div className="grid grid-cols-1 gap-2 mb-3">
                        {(questionLang === 'hi' ? q.options.hi : q.options.en).map((opt, optIdx) => {
                          const isOptCorrect = optIdx === q.correctAnswer;
                          const isStudentPick = optIdx === studentAns;

                          let style = 'bg-white border-slate-200 text-slate-700';
                          if (isOptCorrect) {
                            style = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                          } else if (isStudentPick && !isCorrect) {
                            style = 'bg-red-50 border-red-300 text-red-950 line-through';
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${style}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sky-900">{String.fromCharCode(65 + optIdx)}.</span>
                                <span>{opt}</span>
                              </div>
                              {isOptCorrect && (
                                <span className="text-[11px] font-bold text-emerald-700 shrink-0">✓ सही उत्तर</span>
                              )}
                              {isStudentPick && !isCorrect && (
                                <span className="text-[11px] font-bold text-red-600 shrink-0">✗ आपका चयन</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs">
                          <span className="font-bold text-sky-900">कृषण सर की मुख्य संकल्पना व्याख्या: </span>
                          <span className="text-slate-700">{questionLang === 'hi' ? q.explanation.hi : q.explanation.en}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            )}

          </div>
        )}

        {/* TEACHER / ADMIN PIN AUTHENTICATION MODAL (Visible ONLY in AI Studio) */}
        {isAIStudio && showAdminAuthModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-md w-full">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 mx-auto flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6 text-sky-900" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 font-display">
                  Teacher / Admin Verification
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  यह अनुभाग केवल कृषण सर (Admin) के लिए सुरक्षित है। Google Sheet और सभी विद्यार्थियों के परिणाम देखने के लिए शिक्षक पिन दर्ज करें।
                </p>
              </div>

              {adminPinError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adminPinError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyAdminPin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Teacher Security PIN (शिक्षक पिन)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="password"
                      autoFocus
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      placeholder="पिन दर्ज करें (उदा. 1234)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-600 bg-white tracking-widest font-mono"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    डिफ़ॉल्ट शिक्षक पिन: <code className="font-bold text-sky-800 font-mono">1234</code>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminAuthModal(false);
                      setAdminPinError('');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    रद्द करें (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-amber-400" />
                    <span>सत्यापित करें (Unlock)</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
