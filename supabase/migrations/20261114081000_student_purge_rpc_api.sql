-- Expose only narrowly scoped purge RPC entry points to PostgREST.
-- They are callable by service_role only; anon/authenticated cannot execute them.
create or replace function public.claim_student_purge_batch(p_batch_size integer default 10)
returns table(student_id uuid, student_name text, claim_token uuid, purge_after timestamptz, class_level text, roll_no text, school_name text)
language sql security definer set search_path = ''
as $$ select * from private.claim_student_purge_batch(p_batch_size); $$;
revoke all on function public.claim_student_purge_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_student_purge_batch(integer) to service_role;

create or replace function public.authorize_student_purge(p_student_id uuid,p_claim_token uuid)
returns boolean language sql security definer set search_path = ''
as $$ select private.authorize_student_purge(p_student_id,p_claim_token); $$;
revoke all on function public.authorize_student_purge(uuid,uuid) from public, anon, authenticated;
grant execute on function public.authorize_student_purge(uuid,uuid) to service_role;

create or replace function public.complete_student_purge(p_student_id uuid,p_claim_token uuid,p_auth_user_absent boolean default false)
returns boolean language sql security definer set search_path = ''
as $$ select private.complete_student_purge(p_student_id,p_claim_token,p_auth_user_absent); $$;
revoke all on function public.complete_student_purge(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.complete_student_purge(uuid,uuid,boolean) to service_role;

create or replace function public.release_student_purge_claim(p_student_id uuid,p_claim_token uuid,p_error_code text)
returns void language sql security definer set search_path = ''
as $$ select private.release_student_purge_claim(p_student_id,p_claim_token,p_error_code); $$;
revoke all on function public.release_student_purge_claim(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.release_student_purge_claim(uuid,uuid,text) to service_role;
