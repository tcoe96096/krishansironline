-- Allow the public SELECT policy on site_notices to evaluate its admin branch.
-- is_admin() is SECURITY DEFINER and only returns whether auth.uid() has an admin role.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
