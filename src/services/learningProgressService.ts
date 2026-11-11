import { requireSupabase } from '../lib/supabase';

export interface StudentLearningProgress {
  id: string;
  student_id: string;
  material_id: string;
  class_level: string;
  subject: string;
  chapter_title: string;
  progress_percent: number;
  last_position: Record<string, unknown>;
  last_opened_at: string;
  completed_at: string | null;
  updated_at: string;
}

/** Reads only the signed-in student's learning history; RLS is the authority. */
export async function getMyLearningProgress(): Promise<StudentLearningProgress[]> {
  const { data, error } = await requireSupabase()
    .from('student_learning_progress')
    .select('id, student_id, material_id, class_level, subject, chapter_title, progress_percent, last_position, last_opened_at, completed_at, updated_at')
    .order('last_opened_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudentLearningProgress[];
}

/** Reads one chapter's saved position for the signed-in student. */
export async function getMyLearningProgressForMaterial(materialId: string): Promise<StudentLearningProgress | null> {
  const { data, error } = await requireSupabase()
    .from('student_learning_progress')
    .select('id, student_id, material_id, class_level, subject, chapter_title, progress_percent, last_position, last_opened_at, completed_at, updated_at')
    .eq('material_id', materialId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as StudentLearningProgress | null;
}

/** Upserts a student's position for a material without exposing another student's records. */
export async function saveMyLearningProgress(input: {
  materialId: string;
  classLevel: string;
  subject: string;
  chapterTitle: string;
  progressPercent: number;
  lastPosition?: Record<string, unknown>;
}): Promise<void> {
  const { data: authData, error: authError } = await requireSupabase().auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('विद्यार्थी लॉगिन आवश्यक है।');

  const progressPercent = Math.max(0, Math.min(100, Math.round(input.progressPercent)));
  const { error } = await requireSupabase()
    .from('student_learning_progress')
    .upsert({
      student_id: authData.user.id,
      material_id: input.materialId,
      class_level: input.classLevel,
      subject: input.subject,
      chapter_title: input.chapterTitle,
      progress_percent: progressPercent,
      last_position: input.lastPosition ?? {},
    }, { onConflict: 'student_id,material_id' });
  if (error) throw error;
}
