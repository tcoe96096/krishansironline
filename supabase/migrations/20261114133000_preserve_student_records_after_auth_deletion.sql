-- Preserve student-owned profile and learning/academic records when the
-- student's Supabase Auth login identity is permanently removed after the
-- approved 30-day recovery period.
--
-- These UUIDs remain stable archival identifiers and continue to join
-- student_profiles to test attempts/progress for authorized admin reports.
-- They intentionally no longer require a live auth.users row.
--
-- This migration is Preview-only. Admin identity/accountability foreign keys
-- are deliberately NOT changed.

alter table public.student_profiles
  drop constraint if exists student_profiles_user_id_fkey;

alter table public.test_attempts
  drop constraint if exists test_attempts_student_id_fkey;

alter table public.student_bookmarks
  drop constraint if exists student_bookmarks_student_id_fkey;

alter table public.student_daily_activity
  drop constraint if exists student_daily_activity_student_id_fkey;

alter table public.student_flashcard_progress
  drop constraint if exists student_flashcard_progress_student_id_fkey;

alter table public.student_learning_progress
  drop constraint if exists student_learning_progress_student_id_fkey;

alter table public.student_mistake_notebook
  drop constraint if exists student_mistake_notebook_student_id_fkey;

alter table public.student_notification_reads
  drop constraint if exists student_notification_reads_student_id_fkey;

comment on column public.student_profiles.user_id is
  'Stable student archive identifier. Auth FK intentionally absent so profile and named academic history survive approved Auth login deletion.';

comment on column public.test_attempts.student_id is
  'Stable student archive identifier; retained after Auth identity deletion for named academic reporting.';
