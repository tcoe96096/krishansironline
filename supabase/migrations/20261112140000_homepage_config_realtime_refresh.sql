-- Refresh the homepage immediately when an Admin publishes section visibility settings.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_config_versions'
  ) then
    execute 'alter publication supabase_realtime add table public.site_config_versions';
  end if;
end
$$;
