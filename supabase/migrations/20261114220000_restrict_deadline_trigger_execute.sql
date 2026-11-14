-- Trigger functions are invoked by PostgreSQL triggers, not by API clients.
-- Remove direct RPC execution from public-facing roles.
revoke all on function public.set_student_deletion_deadline() from public;
revoke all on function public.set_student_deletion_deadline() from anon;
revoke all on function public.set_student_deletion_deadline() from authenticated;
