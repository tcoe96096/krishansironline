-- Isolated PPT library: original and rendered slides are always private buckets.
create or replace function public.ksol_presentation_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select auth.uid() is not null and exists (
  select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','super_admin')
) $$;
revoke all on function public.ksol_presentation_admin() from public, anon;
grant execute on function public.ksol_presentation_admin() to authenticated;

create table public.ksol_presentations (
  id uuid primary key,
  class_level text not null check (class_level in ('6','7','8','9','10','11','12')),
  subject text not null check (subject in ('History','Political Science','Geography','Economics')),
  chapter text not null check (length(trim(chapter)) between 1 and 150),
  title text not null check (length(trim(title)) between 1 and 200),
  status text not null default 'queued' check (status in ('queued','processing','ready','error','deleting')),
  slide_count integer not null default 0 check (slide_count between 0 and 200),
  published boolean not null default false,
  allow_download boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not published or (status='ready' and slide_count > 0)),
  check (status <> 'ready' or slide_count > 0)
);
alter table public.ksol_presentations enable row level security;
revoke all on public.ksol_presentations from anon, authenticated;
grant select on public.ksol_presentations to anon, authenticated;
grant insert, update, delete on public.ksol_presentations to authenticated;
grant all on public.ksol_presentations to service_role;
create policy "Published ready presentations" on public.ksol_presentations for select to anon, authenticated
using (published and status='ready');
create policy "Presentation admin management" on public.ksol_presentations for all to authenticated
using (public.ksol_presentation_admin()) with check (public.ksol_presentation_admin());
create index ksol_presentations_catalogue on public.ksol_presentations(class_level, subject, published);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
('ksol-ppt-originals','ksol-ppt-originals',false,52428800,array['application/vnd.openxmlformats-officedocument.presentationml.presentation']),
('ksol-ppt-slides','ksol-ppt-slides',false,10485760,array['image/png']);
create policy "Presentation admin read" on storage.objects for select to authenticated
using (bucket_id in ('ksol-ppt-originals','ksol-ppt-slides') and public.ksol_presentation_admin());
create policy "Presentation admin upload" on storage.objects for insert to authenticated
with check (bucket_id in ('ksol-ppt-originals','ksol-ppt-slides') and public.ksol_presentation_admin());
create policy "Presentation admin remove" on storage.objects for delete to authenticated
using (bucket_id in ('ksol-ppt-originals','ksol-ppt-slides') and public.ksol_presentation_admin());
create policy "Published rendered slide access" on storage.objects for select to anon, authenticated
using (bucket_id='ksol-ppt-slides' and exists (
  select 1 from public.ksol_presentations p where p.published and p.status='ready'
    and name like p.id::text || '/slide-%' and (storage.foldername(name))[1]=p.id::text
));
create policy "Explicitly enabled original download" on storage.objects for select to anon, authenticated
using (bucket_id='ksol-ppt-originals' and exists (
  select 1 from public.ksol_presentations p where p.published and p.status='ready'
    and p.allow_download and name=p.id::text || '/source.pptx'
));
