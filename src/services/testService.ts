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
