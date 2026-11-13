import { requireSupabase } from '../lib/supabase';

export type StudentBookmark = {
  id: string; item_type: 'question' | 'material' | 'test'; item_id: string;
  title: string; snapshot: Record<string, unknown>; created_at: string;
};
export type DailyActivity = {
  id: string; activity_date: string; study_minutes: number; lessons_opened: number;
  lessons_completed: number; tests_completed: number; questions_reviewed: number;
};
export type StudentMistake = {
  id: string; attempt_id: string; test_id: string; question_index: number;
  question_snapshot: Record<string, any>; selected_option: number | null;
  correct_option: number; explanation: Record<string, string>;
  mastered: boolean; created_at: string;
};
export type FlashcardDeck = {
  id: string; title: { en?: string; hi?: string }; description: { en?: string; hi?: string };
  class_level: string | null; subject: string; chapter: string | null;
  cards: Array<{ id: string; front: { en?: string; hi?: string }; back: { en?: string; hi?: string } }>;
};
export type FlashcardProgress = {
  deck_id: string; card_id: string; review_state: 'learning' | 'known';
  review_count: number; last_reviewed_at: string | null;
};

export async function getMyBookmarks(): Promise<StudentBookmark[]> {
  const { data, error } = await requireSupabase().from('student_bookmarks')
    .select('id,item_type,item_id,title,snapshot,created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudentBookmark[];
}
export async function saveBookmark(input: {
  itemType: StudentBookmark['item_type']; itemId: string; title: string; snapshot?: Record<string, unknown>;
}): Promise<void> {
  const { data: auth, error: authError } = await requireSupabase().auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error('विद्यार्थी लॉगिन आवश्यक है।');
  const { error } = await requireSupabase().from('student_bookmarks').upsert({
    student_id: auth.user.id, item_type: input.itemType, item_id: input.itemId,
    title: input.title, snapshot: input.snapshot ?? {},
  }, { onConflict: 'student_id,item_type,item_id' });
  if (error) throw error;
}
export async function removeBookmark(id: string): Promise<void> {
  const { error } = await requireSupabase().from('student_bookmarks').delete().eq('id', id);
  if (error) throw error;
}
export async function getMyDailyActivity(): Promise<DailyActivity[]> {
  const { data, error } = await requireSupabase().from('student_daily_activity')
    .select('id,activity_date,study_minutes,lessons_opened,lessons_completed,tests_completed,questions_reviewed')
    .order('activity_date', { ascending: false }).limit(90);
  if (error) throw error;
  return (data ?? []) as DailyActivity[];
}
export async function getMyMistakes(): Promise<StudentMistake[]> {
  const { data, error } = await requireSupabase().from('student_mistake_notebook')
    .select('id,attempt_id,test_id,question_index,question_snapshot,selected_option,correct_option,explanation,mastered,created_at')
    .order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as StudentMistake[];
}
export async function setMistakeMastered(id: string, mastered: boolean): Promise<void> {
  const { error } = await requireSupabase().from('student_mistake_notebook')
    .update({ mastered, mastered_at: mastered ? new Date().toISOString() : null }).eq('id', id);
  if (error) throw error;
}
export async function getPublishedFlashcardDecks(classLevel?: string): Promise<FlashcardDeck[]> {
  let query = requireSupabase().from('flashcard_decks')
    .select('id,title,description,class_level,subject,chapter,cards')
    .eq('is_published', true).order('updated_at', { ascending: false });
  if (classLevel) query = query.or(`class_level.eq.${classLevel},class_level.is.null`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as FlashcardDeck[];
}
export async function getMyFlashcardProgress(): Promise<FlashcardProgress[]> {
  const { data, error } = await requireSupabase().from('student_flashcard_progress')
    .select('deck_id,card_id,review_state,review_count,last_reviewed_at');
  if (error) throw error;
  return (data ?? []) as FlashcardProgress[];
}
export async function saveFlashcardProgress(input: {
  deckId: string; cardId: string; state: 'learning' | 'known'; previousCount: number;
}): Promise<void> {
  const { data: auth, error: authError } = await requireSupabase().auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error('विद्यार्थी लॉगिन आवश्यक है।');
  const { error } = await requireSupabase().from('student_flashcard_progress').upsert({
    student_id: auth.user.id, deck_id: input.deckId, card_id: input.cardId,
    review_state: input.state, review_count: input.previousCount + 1,
    last_reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: 'student_id,deck_id,card_id' });
  if (error) throw error;
}
