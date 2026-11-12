-- Public test catalogue policies call is_admin() to permit admin previews.
-- Keep the function body SECURITY DEFINER and expose only its boolean result
-- for the current auth.uid(); without EXECUTE, anon SELECT fails with 42501.
grant execute on function public.is_admin() to anon, authenticated;
