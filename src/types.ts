export type Language = 'en' | 'hi';

export type ClassLevel = '6' | '7' | '8' | '9' | '10' | '11' | '12';

export type Subject = 'Social Science' | 'History' | 'Geography' | 'Political Science' | 'Economics' | 'Indian Constitution';

export interface Notice {
  id: string;
  title: {
    en: string;
    hi: string;
  };
  date: string;
  category: 'Test' | 'Exam' | 'Notes' | 'Result' | 'Important';
  isNew?: boolean;
  link?: string;
  details?: {
    en: string;
    hi: string;
  };
}

export interface Question {
  id: string;
  question: {
    en: string;
    hi: string;
  };
  options: {
    en: string[];
    hi: string[];
  };
  correctAnswer: number;
  explanation: {
    en: string;
    hi: string;
  };
  chapter: string;
  marks?: number;
  type?: 'mcq' | 'short' | 'long' | 'map';
  modelAnswer?: {
    en: string;
    hi: string;
  };
}

export interface OnlineTest {
  id: string;
  title: {
    en: string;
    hi: string;
  };
  classLevel: ClassLevel;
  subject: Subject;
  chapter: string;
  durationMinutes: number;
  totalMarks: number;
  questions: Question[];
  googleFormUrl?: string;
  instructions: {
    en: string[];
    hi: string[];
  };
}

export interface StudyChapter {
  id: string;
  classLevel: ClassLevel;
  subject: Subject;
  chapterNumber: number;
  title: {
    en: string;
    hi: string;
  };
  summary: {
    en: string;
    hi: string;
  };
  keyPoints: {
    en: string[];
    hi: string[];
  };
  importantTerms: {
    term: { en: string; hi: string };
    definition: { en: string; hi: string };
  }[];
  pdfUrl?: string;
  hasResources: boolean;
}

export interface StudentResult {
  rollNo: string;
  studentName: string;
  fatherName: string;
  classLevel: ClassLevel;
  schoolName: string;
  examName: string;
  examDate: string;
  subjects: {
    name: string;
    marksObtained: number;
    maxMarks: number;
  }[];
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  rank?: number;
  remarks: {
    en: string;
    hi: string;
  };
}

export interface CurrentAffairItem {
  id: string;
  date: string;
  category: 'National' | 'Haryana State' | 'Constitution & Polity' | 'Education & Science';
  title: {
    en: string;
    hi: string;
  };
  summary: {
    en: string;
    hi: string;
  };
  relevance: {
    en: string;
    hi: string;
  };
}


export interface StudentLoginDetails {
  mobile: string;
  studentName: string;
  studentClass: string;
  rollNo: string;
  school: string;
  otherSchool: string;
}

export interface StudentTestSubmission {
  id: string;
  timestamp: string;
  student: StudentLoginDetails;
  testId: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  attempted: number;
  unattempted: number;
  answers: Record<string, number | null>;
  syncedToGoogleSheet?: boolean;
  syncError?: string;
}
