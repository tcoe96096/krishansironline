-- Run manually in the EXISTING Supabase project's SQL Editor
-- only AFTER signing in once with the approved Google account.
-- This script grants admin only to the exact email supplied by the owner.
-- Do not expose this SQL through the public website.

do $$
declare
  target_user_id uuid;
  matches integer;
begin
  select count(*), (array_agg(id))[1]
    into matches, target_user_id
  from auth.users
  where lower(email) = lower('tcoe96096@gmail.com')
    and email_confirmed_at is not null;

  if matches = 0 then
    raise exception 'No confirmed Supabase Auth user found for the approved admin email. Sign in once with Google OAuth first.';
  elsif matches > 1 then
    raise exception 'More than one Auth user matches the approved admin email. Resolve duplicate identities manually.';
  end if;

  insert into public.user_roles (user_id, role)
  values (target_user_id, 'admin')
  on conflict (user_id, role) do nothing;
end
$$;

select u.email, r.role, r.created_at
from public.user_roles r
join auth.users u on u.id = r.user_id
where lower(u.email) = lower('tcoe96096@gmail.com')
  and r.role = 'admin';
