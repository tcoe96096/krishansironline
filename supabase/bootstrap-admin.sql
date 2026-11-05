-- Run this in Supabase SQL Editor AFTER the approved administrator has
-- completed Google OAuth at least once. It grants admin only to the exact
-- Google account approved by the portal owner.
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('tcoe96096@gmail.com')
  and raw_app_meta_data ->> 'provider' = 'google'
on conflict (user_id, role) do nothing;

-- Verify the grant. Expected: one row for the approved Google account.
select u.id, u.email, r.role
from auth.users u
join public.user_roles r on r.user_id = u.id
where lower(u.email) = lower('tcoe96096@gmail.com')
  and r.role = 'admin';
