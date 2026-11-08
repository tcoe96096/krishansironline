-- Run manually in the EXISTING Supabase project's SQL Editor only AFTER:
-- 1) Google provider has been configured and enabled in Supabase Auth.
-- 2) The approved owner account has signed in through Google OAuth at least once.
-- This grants admin to exactly one verified Google identity. Never run on a public endpoint.

do $$
declare
  target_user_id uuid;
  match_count integer;
begin
  select count(*), (array_agg(id))[1]
    into match_count, target_user_id
  from auth.users
  where lower(email) = lower('tcoe96096@gmail.com')
    and email_confirmed_at is not null
    and raw_app_meta_data ->> 'provider' = 'google';

  if match_count = 0 then
    raise exception 'Approved Google account not found. Enable Google OAuth and sign in once before running this script.';
  elsif match_count > 1 then
    raise exception 'Multiple Auth users match the approved Google account. Resolve duplicate identities manually.';
  end if;

  insert into public.user_roles (user_id, role)
  values (target_user_id, 'admin')
  on conflict (user_id, role) do nothing;
end
$$;

-- Verification query: expected exactly one admin row for the approved Google identity.
select u.id, u.email, r.role, r.created_at
from public.user_roles r
join auth.users u on u.id = r.user_id
where lower(u.email) = lower('tcoe96096@gmail.com')
  and u.email_confirmed_at is not null
  and u.raw_app_meta_data ->> 'provider' = 'google'
  and r.role = 'admin';
