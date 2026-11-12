-- Student notifications: manual announcements plus automatic publication events.
create table if not exists public.student_notifications (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null check (jsonb_typeof(title) = 'object'),
  body jsonb not null default '{}'::jsonb check (jsonb_typeof(body) = 'object'),
  target_class text check (target_class is null or target_class in ('6','7','8','9','10','11','12')),
  source_type text not null check (source_type in ('manual','notice','test','material','question')),
  source_id text not null default gen_random_uuid()::text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz not null default now(),
  unique(source_type, source_id)
);
create index if not exists student_notifications_published_idx
  on public.student_notifications (published_at desc);
create index if not exists student_notifications_class_idx
  on public.student_notifications (target_class, published_at desc);

create table if not exists public.student_notification_reads (
  notification_id uuid not null references public.student_notifications(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, student_id)
);
create index if not exists student_notification_reads_student_idx
  on public.student_notification_reads (student_id, read_at desc);

alter table public.student_notifications enable row level security;
alter table public.student_notification_reads enable row level security;

drop policy if exists "Students read targeted notifications" on public.student_notifications;
create policy "Students read targeted notifications"
  on public.student_notifications for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.student_profiles sp
      where sp.user_id = auth.uid()
        and (student_notifications.target_class is null or student_notifications.target_class = sp.class_level)
    )
  );
drop policy if exists "Admins manage student notifications" on public.student_notifications;
create policy "Admins manage student notifications"
  on public.student_notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Students read own notification receipts" on public.student_notification_reads;
create policy "Students read own notification receipts"
  on public.student_notification_reads for select to authenticated
  using (student_id = auth.uid() or public.is_admin());
drop policy if exists "Students mark own notifications read" on public.student_notification_reads;
create policy "Students mark own notifications read"
  on public.student_notification_reads for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.student_notifications n
      join public.student_profiles sp on sp.user_id = auth.uid()
      where n.id = notification_id
        and (n.target_class is null or n.target_class = sp.class_level)
    )
  );
drop policy if exists "Students update own notification receipts" on public.student_notification_reads;
create policy "Students update own notification receipts"
  on public.student_notification_reads for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
drop policy if exists "Admins read notification receipts" on public.student_notification_reads;
create policy "Admins read notification receipts"
  on public.student_notification_reads for select to authenticated
  using (public.is_admin());

grant select on public.student_notifications to authenticated;
grant insert, update, delete on public.student_notifications to authenticated;
grant select, insert, update on public.student_notification_reads to authenticated;

create or replace function public.notify_on_content_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_type text;
  v_title jsonb;
  v_body jsonb;
  v_target_class text;
  v_published_at timestamptz;
begin
  if tg_op = 'UPDATE' and old.is_published = true then
    return new;
  end if;
  if new.is_published is distinct from true then
    return new;
  end if;

  if tg_table_name = 'tests' then
    v_source_type := 'test';
    v_title := new.title;
    v_body := jsonb_build_object(
      'en', concat_ws(' · ', new.subject, new.chapter, 'New online test published'),
      'hi', concat_ws(' · ', new.subject, new.chapter, 'नया ऑनलाइन टेस्ट प्रकाशित')
    );
    v_target_class := new.class_level;
  elsif tg_table_name = 'site_notices' then
    v_source_type := 'notice';
    v_title := new.title;
    v_body := new.details;
    v_target_class := null;
  else
    v_source_type := case when new.section = 'materials' then 'material' else 'question' end;
    v_title := coalesce(nullif(new.title, '{}'::jsonb), new.question, '{}'::jsonb);
    v_body := coalesce(nullif(new.details, '{}'::jsonb), new.explanation, '{}'::jsonb);
    v_target_class := new.class_level;
  end if;

  v_published_at := coalesce(new.published_at, now());
  insert into public.student_notifications (
    title, body, target_class, source_type, source_id, created_by, published_at
  ) values (
    coalesce(v_title, '{}'::jsonb), coalesce(v_body, '{}'::jsonb),
    v_target_class, v_source_type, new.id::text, new.created_by, v_published_at
  )
  on conflict (source_type, source_id) do nothing;

  return new;
end;
$$;

drop trigger if exists notify_published_tests on public.tests;
create trigger notify_published_tests
  after insert or update of is_published on public.tests
  for each row execute function public.notify_on_content_published();

drop trigger if exists notify_published_notices on public.site_notices;
create trigger notify_published_notices
  after insert or update of is_published on public.site_notices
  for each row execute function public.notify_on_content_published();

drop trigger if exists notify_published_admin_content on public.admin_content_items;
create trigger notify_published_admin_content
  after insert or update of is_published on public.admin_content_items
  for each row execute function public.notify_on_content_published();

revoke all on function public.notify_on_content_published() from public, anon, authenticated;
