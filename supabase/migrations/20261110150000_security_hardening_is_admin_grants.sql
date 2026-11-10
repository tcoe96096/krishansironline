-- Keep the SECURITY DEFINER helper callable by signed-in users for RLS checks,
-- but never expose it to anonymous visitors or the PUBLIC pseudo-role.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
