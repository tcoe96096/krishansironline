import { requireSupabase } from '../lib/supabase';

export interface StudentProfile {
  user_id: string;
  student_name: string;
  class_level: string;
  roll_no: string;
  school_name: string;
  created_at: string;
  updated_at: string;
}


export interface PublishedTestQuestion {
  id: string;
  chapter: string;
  question: { en: string; hi: string };
  options: { en: string[]; hi: string[] };
  marks?: number;
  type?: 'mcq' | 'short' | 'long' | 'map';
}

export interface PublishedTest {
  id: string;
  title: { en: string; hi: string };
  class_level: string;
  subject: string;
  chapter: string;
  duration_minutes: number;
  total_marks: number;
  attempt_limit: number;
  questions: PublishedTestQuestion[];
}

/**
 * Fetches only published test content from the RLS-protected public catalogue.
 * The public payload intentionally has no correctAnswer, explanation, or answer key.
 */
export async function getPublishedTests(classLevel?: string): Promise<PublishedTest[]> {
  let query = requireSupabase()
    .from('tests')
    .select('id, title, class_level, subject, chapter, duration_minutes, total_marks, attempt_limit, questions')
    .eq('is_published', true)
    .order('class_level', { ascending: true })
    .order('title', { ascending: true });

  if (classLevel) query = query.eq('class_level', classLevel);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    questions: Array.isArray(row.questions) ? row.questions : [],
  })) as PublishedTest[];
}

export interface TestAttempt {
  id: string;
  student_id: string;
  test_id: string;
  attempt_number: number;
  status: 'in_progress' | 'submitted' | 'expired';
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  score: number | null;
  total_marks: number | null;
  percentage: number | null;
  correct_count: number | null;
  attempted_count: number | null;
}

/** Reads only the signed-in student's own profile; RLS remains authoritative. */
export async function getMyStudentProfile(): Promise<StudentProfile | null> {
  const { data, error } = await requireSupabase()
    .from('student_profiles')
    .select('user_id, student_name, class_level, roll_no, school_name, created_at, updated_at')
    .maybeSingle();

  if (error) throw error;
  return data as StudentProfile | null;
}

/** Starts or resumes an attempt; the database enforces class and attempt limits atomically. */
export async function startTestAttempt(testId: string): Promise<TestAttempt> {
  const { data, error } = await requireSupabase()
    .rpc('start_test_attempt', { p_test_id: testId });

  if (error) throw error;
  return data as TestAttempt;
}

/** Sends answer indexes only. The private answer key and grading stay in PostgreSQL. */
export async function submitTestAttempt(
  attemptId: string,
  answers: Record<number, number | null>,
): Promise<TestAttempt> {
  const normalizedAnswers: Record<string, number | null> = {};
  for (const [questionIndex, answerIndex] of Object.entries(answers)) {
    if (!/^\d+$/.test(questionIndex)) continue;
    normalizedAnswers[questionIndex] = Number.isInteger(answerIndex) ? answerIndex : null;
  }

  const { data, error } = await requireSupabase()
    .rpc('submit_test_attempt', {
      p_attempt_id: attemptId,
      p_answers: normalizedAnswers,
    });

  if (error) throw error;
  return data as TestAttempt;
}

/** RLS limits this query to the current student's own attempt history. */
export async function getMyTestAttempts(): Promise<TestAttempt[]> {
  const { data, error } = await requireSupabase()
    .from('test_attempts')
    .select('id, student_id, test_id, attempt_number, status, started_at, expires_at, submitted_at, score, total_marks, percentage, correct_count, attempted_count')
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as TestAttempt[];
}

/** Admin-only result feed. The database RLS policy rejects non-admin users. */
export async function getAdminTestAttempts(): Promise<TestAttempt[]> {
  const { data, error } = await requireSupabase()
    .from('test_attempts')
    .select('id, student_id, test_id, attempt_number, status, started_at, expires_at, submitted_at, score, total_marks, percentage, correct_count, attempted_count')
    .order('started_at', { ascending: false })
    .limit(1000);

  if (error) throw error;
  return (data ?? []) as TestAttempt[];
}


export interface AdminTestSummary {
  id: string;
  title: { en: string; hi: string };
  class_level: string;
  subject: string;
  chapter: string;
  duration_minutes: number;
  total_marks: number;
  attempt_limit: number;
  is_published: boolean;
  question_count: number;
}

export interface AdminStudentSummary {
  user_id: string;
  student_name: string;
  class_level: string;
  roll_no: string;
  school_name: string;
}

/** Admin-only catalogue read; RLS is the authority for administrator access. */
export async function getAdminTests(): Promise<AdminTestSummary[]> {
  const { data, error } = await requireSupabase()
    .from('tests')
    .select('id, title, class_level, subject, chapter, duration_minutes, total_marks, attempt_limit, is_published, questions')
    .order('class_level', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    question_count: Array.isArray(row.questions) ? row.questions.length : 0,
  })) as AdminTestSummary[];
}

/** Updates only the administrator-controlled publication and attempt settings. */
export async function updateAdminTestSettings(
  testId: string,
  settings: { attempt_limit: number; is_published: boolean },
): Promise<void> {
  if (!Number.isInteger(settings.attempt_limit) || settings.attempt_limit < 1 || settings.attempt_limit > 2147483647) {
    throw new Error('Attempt limit must be a positive whole number.');
  }
  const { data, error } = await requireSupabase()
    .from('tests')
    .update({ attempt_limit: settings.attempt_limit, is_published: settings.is_published })
    .eq('id', testId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Test was not found or admin permission was denied.');
}

/** Admin-only student labels for the admin result table; no mobile numbers are fetched. */
export async function getAdminStudentSummaries(userIds: string[]): Promise<AdminStudentSummary[]> {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (!uniqueIds.length) return [];
  const { data, error } = await requireSupabase()
    .from('student_profiles')
    .select('user_id, student_name, class_level, roll_no, school_name')
    .in('user_id', uniqueIds);
  if (error) throw error;
  return (data ?? []) as AdminStudentSummary[];
}
