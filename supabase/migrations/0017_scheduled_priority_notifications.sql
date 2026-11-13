alter table public.student_notifications
  add column if not exists priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  add column if not exists scheduled_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz;
create index if not exists student_notifications_schedule_idx
  on public.student_notifications(scheduled_at,expires_at,published_at desc);
drop policy if exists "Students read targeted notifications" on public.student_notifications;
create policy "Students read targeted notifications"
  on public.student_notifications for select to authenticated
  using (
    public.is_admin()
    or (
      scheduled_at <= now()
      and (expires_at is null or expires_at > now())
      and exists (
        select 1 from public.student_profiles sp
        where sp.user_id = auth.uid()
          and (student_notifications.target_class is null or student_notifications.target_class = sp.class_level)
      )
    )
  );
