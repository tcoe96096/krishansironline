-- Visual Website Studio Canvas Cloud Drafts and private Media Library.
-- Admin-only access; this migration is intentionally applied only after PR approval.

create table if not exists public.visual_studio_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_key text not null default 'main' check (length(draft_key) between 1 and 100),
  content jsonb not null default '[]'::jsonb check (jsonb_typeof(content) = 'array'),
  updated_at timestamptz not null default now(),
  unique (user_id, draft_key)
);

alter table public.visual_studio_drafts enable row level security;

drop policy if exists "Admins manage own Visual Studio drafts" on public.visual_studio_drafts;
create policy "Admins manage own Visual Studio drafts"
  on public.visual_studio_drafts
  for all
  to authenticated
  using (auth.uid() = user_id and public.is_admin())
  with check (auth.uid() = user_id and public.is_admin());

grant select, insert, update, delete on public.visual_studio_drafts to authenticated;
revoke all on public.visual_studio_drafts from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visual-studio-media',
  'visual-studio-media',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm']
)
on conflict (id) do update
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins read own Visual Studio media" on storage.objects;
create policy "Admins read own Visual Studio media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'visual-studio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_admin()
  );

drop policy if exists "Admins upload own Visual Studio media" on storage.objects;
create policy "Admins upload own Visual Studio media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'visual-studio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_admin()
  );

drop policy if exists "Admins update own Visual Studio media" on storage.objects;
create policy "Admins update own Visual Studio media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'visual-studio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_admin()
  )
  with check (
    bucket_id = 'visual-studio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_admin()
  );

drop policy if exists "Admins delete own Visual Studio media" on storage.objects;
create policy "Admins delete own Visual Studio media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'visual-studio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_admin()
  );
