import { requireSupabase } from '../lib/supabase';

export interface StudentProfile {
  user_id: string;
  student_name: string;
  class_level: string;
  roll_no: string;
  school_name: string;
  country: string;
  state: string | null;
  district: string | null;
  area_type: string | null;
  locality_name: string | null;
  pin_code: string | null;
  created_at: string;
  updated_at: string;
}


export interface PublishedTestQuestion {
  id: string;
  chapter: string;
  question: { en: string; hi: string };
  options: { en: string[]; hi: string[] };
  explanation?: { en: string; hi: string };
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
 * The public payload may include authored bilingual explanations after publication, but never includes correctAnswer indexes or the private answer key.
 */
export async function getPublishedTests(classLevel?: string): Promise<PublishedTest[]> {
  let query = requireSupabase()
    .from('tests')
    .select('id, title, class_level, subject, chapter, duration_minutes, total_marks, attempt_limit, questions')
    .eq('is_published', true)
    .order('class_level', { ascending: true });

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
    .select('user_id, student_name, class_level, roll_no, school_name, country, state, district, area_type, locality_name, pin_code, created_at, updated_at')
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

/** Disabled unless a preview build explicitly opts into the deployed draft RPCs. */
export const examServerAutosaveEnabled = import.meta.env.VITE_EXAM_SERVER_AUTOSAVE_ENABLED === 'true';
export interface TestAttemptDraft {
  answers: Record<number, number>;
  revision: number;
  saved_at: string | null;
  expires_at: string;
  server_now: string;
}
export interface TestAttemptDraftAck {
  conflict: boolean;
  revision: number;
  saved_at: string | null;
  expires_at?: string;
  server_now?: string;
}
export async function readTestAttemptDraft(attemptId: string): Promise<TestAttemptDraft> {
  const {data,error} = await requireSupabase().rpc('read_test_attempt_draft',{p_attempt_id:attemptId});
  if(error) throw error;
  if(!data || !Number.isSafeInteger(data.revision) || data.revision<0 || !data.answers || typeof data.answers!=='object' || Array.isArray(data.answers)) throw new Error('Invalid server draft response');
  const answers: Record<number,number> = {};
  for(const [key,value] of Object.entries(data.answers)) {
    if(/^\d+$/.test(key) && typeof value==='number' && Number.isInteger(value) && value>=0) answers[Number(key)]=value;
  }
  return {...data,answers} as TestAttemptDraft;
}
export async function saveTestAttemptDraft(attemptId: string, answers: Record<number,number>, revision: number): Promise<TestAttemptDraftAck> {
  const {data,error}=await requireSupabase().rpc('save_test_attempt_draft',{p_attempt_id:attemptId,p_answers:answers,p_expected_revision:revision});
  if(error) throw error;
  if(!data || typeof data.conflict!=='boolean' || !Number.isSafeInteger(data.revision) || data.revision<0) throw new Error('Invalid server draft acknowledgement');
  return data as TestAttemptDraftAck;
}

/** Null revision is an expiry-only request; PostgreSQL checks its own clock. */
export async function finishTestAttemptDraft(attemptId: string, revision: number | null): Promise<TestAttempt> {
  const {data,error}=await requireSupabase().rpc('finish_test_attempt_draft',{p_attempt_id:attemptId,p_expected_revision:revision});
  if(error) throw error;
  if(!data || data.id!==attemptId || !['submitted','expired'].includes(data.status)) throw new Error('Final result not confirmed');
  return data as TestAttempt;
}
