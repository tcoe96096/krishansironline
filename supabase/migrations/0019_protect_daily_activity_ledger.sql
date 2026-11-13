-- Daily activity is a server-maintained ledger, not a student-editable scorecard.
-- Students retain read access to their own rows. SECURITY DEFINER triggers record
-- lesson and test activity without granting direct write access through PostgREST.
drop policy if exists "Students write own daily activity" on public.student_daily_activity;
revoke insert, update, delete on public.student_daily_activity from authenticated;
grant select on public.student_daily_activity to authenticated;
