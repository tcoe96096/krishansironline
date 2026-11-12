-- Versioned website configuration with Admin-only draft/publish controls.
create table if not exists public.site_config_versions (
  id uuid primary key default gen_random_uuid(),
  version_number bigint generated always as identity unique,
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create unique index if not exists site_config_one_draft_idx
  on public.site_config_versions ((status)) where status = 'draft';
create unique index if not exists site_config_one_published_idx
  on public.site_config_versions ((status)) where status = 'published';

alter table public.site_config_versions enable row level security;
drop policy if exists "Public reads published site config" on public.site_config_versions;
create policy "Public reads published site config"
  on public.site_config_versions for select to anon, authenticated
  using (status = 'published' or (auth.uid() is not null and public.is_admin()));
drop policy if exists "Admins manage site config versions" on public.site_config_versions;
create policy "Admins manage site config versions"
  on public.site_config_versions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.site_config_versions to anon, authenticated;
grant insert, update, delete on public.site_config_versions to authenticated;

create or replace function public.admin_save_site_config(p_config jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if jsonb_typeof(p_config) <> 'object' then
    raise exception 'Invalid website configuration';
  end if;
  insert into public.site_config_versions(config,status,created_by)
  values(p_config,'draft',auth.uid())
  on conflict ((status)) where status = 'draft'
  do update set config = excluded.config, created_by = auth.uid(), created_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_publish_site_config(p_version_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v_version bigint;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  perform 1 from public.site_config_versions where id = p_version_id and status = 'draft' for update;
  if not found then raise exception 'Draft version not found'; end if;
  update public.site_config_versions set status = 'archived'
    where status = 'published';
  update public.site_config_versions
    set status = 'published', published_at = now()
    where id = p_version_id
    returning version_number into v_version;
  return v_version;
end;
$$;
revoke all on function public.admin_save_site_config(jsonb) from public, anon;
grant execute on function public.admin_save_site_config(jsonb) to authenticated;
revoke all on function public.admin_publish_site_config(uuid) from public, anon;
grant execute on function public.admin_publish_site_config(uuid) to authenticated;
