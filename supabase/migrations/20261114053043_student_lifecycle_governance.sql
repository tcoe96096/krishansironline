
-- Preview-only student lifecycle and governance migration.
-- Existing Preview students are grandfathered as approved/active.
-- New self-registrations default to pending because mobile ownership is not OTP-verified.

alter table public.student_profiles
  add column if not exists approval_status text not null default 'pending'
    check (approval_status in ('pending','approved','rejected')),
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active','suspended','deleted')),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approval_note text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references auth.users(id) on delete set null,
  add column if not exists suspension_reason text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists deletion_reason text;

update public.student_profiles
set approval_status = 'approved',
    approved_at = coalesce(approved_at, created_at),
    account_status = 'active'
where approved_at is null
  and approval_status = 'pending'
  and account_status = 'active'
  and deleted_at is null;

create index if not exists student_profiles_lifecycle_idx
  on public.student_profiles(approval_status, account_status, deleted_at, created_at desc);

create table if not exists public.student_admin_audit (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in (
    'approve','reject','suspend','activate','soft_delete','restore',
    'profile_update','diagnostic_repair'
  )),
  reason text,
  before_state jsonb not null default '{}'::jsonb check (jsonb_typeof(before_state) = 'object'),
  after_state jsonb not null default '{}'::jsonb check (jsonb_typeof(after_state) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists student_admin_audit_student_created_idx
  on public.student_admin_audit(student_id, created_at desc);

alter table public.student_admin_audit enable row level security;
drop policy if exists "Admins read student admin audit" on public.student_admin_audit;
create policy "Admins read student admin audit"
  on public.student_admin_audit for select to authenticated
  using (public.is_admin());
drop policy if exists "Admins insert student admin audit" on public.student_admin_audit;
create policy "Admins insert student admin audit"
  on public.student_admin_audit for insert to authenticated
  with check (public.is_admin() and actor_id = auth.uid());
grant select, insert on public.student_admin_audit to authenticated;

create or replace function public.student_account_is_eligible(p_student_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.student_profiles sp
    where sp.user_id = p_student_id
      and sp.approval_status = 'approved'
      and sp.account_status = 'active'
      and sp.deleted_at is null
  );
$$;
revoke all on function public.student_account_is_eligible(uuid) from public, anon;
grant execute on function public.student_account_is_eligible(uuid) to authenticated;

create or replace function public.audit_student_profile_admin_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_action text := 'profile_update';
  v_reason text;
begin
  if not public.is_admin() then
    return new;
  end if;

  if old.approval_status is distinct from new.approval_status then
    v_action := case when new.approval_status = 'approved' then 'approve' else 'reject' end;
    v_reason := new.approval_note;
  elsif old.account_status is distinct from new.account_status then
    if new.account_status = 'suspended' then
      v_action := 'suspend';
      v_reason := new.suspension_reason;
    elsif new.account_status = 'deleted' then
      v_action := 'soft_delete';
      v_reason := new.deletion_reason;
    elsif old.account_status = 'deleted' and new.account_status = 'active' then
      v_action := 'restore';
    else
      v_action := 'activate';
    end if;
  end if;

  insert into public.student_admin_audit(
    student_id, actor_id, action, reason, before_state, after_state
  ) values (
    new.user_id, auth.uid(), v_action, v_reason, to_jsonb(old), to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists student_profile_admin_audit on public.student_profiles;
create trigger student_profile_admin_audit
after update on public.student_profiles
for each row execute function public.audit_student_profile_admin_change();

-- Preserve the student's ability to read their own profile so pending/rejected
-- states can be explained, while gating learning and assessment data below.

drop policy if exists "Students manage own bookmarks" on public.student_bookmarks;
create policy "Students manage own bookmarks"
  on public.student_bookmarks for all to authenticated
  using (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()))
  with check (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()));

drop policy if exists "Students read own daily activity" on public.student_daily_activity;
create policy "Students read own daily activity"
  on public.student_daily_activity for select to authenticated
  using (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()));

drop policy if exists "Students manage own flashcard progress" on public.student_flashcard_progress;
create policy "Students manage own flashcard progress"
  on public.student_flashcard_progress for all to authenticated
  using (
    student_id = auth.uid()
    and public.student_account_is_eligible(auth.uid())
  )
  with check (
    student_id = auth.uid()
    and public.student_account_is_eligible(auth.uid())
    and exists (
      select 1 from public.flashcard_decks d
      where d.id = student_flashcard_progress.deck_id and d.is_published = true
    )
  );

drop policy if exists "Students insert own learning progress" on public.student_learning_progress;
create policy "Students insert own learning progress"
  on public.student_learning_progress for insert to authenticated
  with check (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()));
drop policy if exists "Students read own learning progress" on public.student_learning_progress;
create policy "Students read own learning progress"
  on public.student_learning_progress for select to authenticated
  using (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()));
drop policy if exists "Students update own learning progress" on public.student_learning_progress;
create policy "Students update own learning progress"
  on public.student_learning_progress for update to authenticated
  using (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()))
  with check (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()));

drop policy if exists "Students read own mistakes" on public.student_mistake_notebook;
create policy "Students read own mistakes"
  on public.student_mistake_notebook for select to authenticated
  using (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()));
drop policy if exists "Students update own mistake mastery" on public.student_mistake_notebook;
create policy "Students update own mistake mastery"
  on public.student_mistake_notebook for update to authenticated
  using (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()))
  with check (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()));

drop policy if exists "Students read own attempts" on public.test_attempts;
create policy "Students read own attempts"
  on public.test_attempts for select to authenticated
  using (
    student_id = auth.uid()
    and public.student_account_is_eligible(auth.uid())
  );

drop policy if exists "Students read published mock series" on public.mock_test_series;
create policy "Students read published mock series"
  on public.mock_test_series for select to authenticated
  using (
    is_published = true
    and public.student_account_is_eligible(auth.uid())
    and exists (
      select 1 from public.student_profiles sp
      where sp.user_id = auth.uid() and sp.class_level = mock_test_series.class_level
    )
  );

drop policy if exists "Students read targeted notifications" on public.student_notifications;
create policy "Students read targeted notifications"
  on public.student_notifications for select to authenticated
  using (
    public.is_admin()
    or (
      public.student_account_is_eligible(auth.uid())
      and scheduled_at <= now()
      and (expires_at is null or expires_at > now())
      and exists (
        select 1 from public.student_profiles sp
        where sp.user_id = auth.uid()
          and (student_notifications.target_class is null or student_notifications.target_class = sp.class_level)
      )
    )
  );

drop policy if exists "Students mark own notifications read" on public.student_notification_reads;
create policy "Students mark own notifications read"
  on public.student_notification_reads for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.student_account_is_eligible(auth.uid())
    and exists (
      select 1
      from public.student_notifications n
      join public.student_profiles sp on sp.user_id = auth.uid()
      where n.id = student_notification_reads.notification_id
        and (n.target_class is null or n.target_class = sp.class_level)
    )
  );
drop policy if exists "Students read own notification receipts" on public.student_notification_reads;
create policy "Students read own notification receipts"
  on public.student_notification_reads for select to authenticated
  using (
    (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()))
    or public.is_admin()
  );
drop policy if exists "Students update own notification receipts" on public.student_notification_reads;
create policy "Students update own notification receipts"
  on public.student_notification_reads for update to authenticated
  using (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()))
  with check (student_id = auth.uid() and public.student_account_is_eligible(auth.uid()));

create or replace function public.start_test_attempt(p_test_id text)
returns public.test_attempts
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_test public.tests%rowtype;
  v_profile public.student_profiles%rowtype;
  v_count integer;
  v_attempt public.test_attempts%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_profile from public.student_profiles where user_id=auth.uid();
  if not found then raise exception 'Complete your student profile first'; end if;
  if v_profile.approval_status <> 'approved' then
    raise exception 'Student registration is awaiting admin approval';
  end if;
  if v_profile.account_status <> 'active' or v_profile.deleted_at is not null then
    raise exception 'Student account is not active';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || ':' || p_test_id));

  select * into v_test from public.tests where id=p_test_id and is_published=true;
  if not found then raise exception 'Test is not available'; end if;
  if v_profile.class_level <> v_test.class_level then
    raise exception 'This test is not assigned to your class';
  end if;

  update public.test_attempts
  set status='expired'
  where student_id=auth.uid() and test_id=p_test_id
    and status='in_progress' and expires_at <= now();

  select * into v_attempt from public.test_attempts
  where student_id=auth.uid() and test_id=p_test_id
    and status='in_progress' and expires_at > now()
  order by attempt_number desc limit 1;
  if found then return v_attempt; end if;

  select count(*) into v_count from public.test_attempts
  where student_id=auth.uid() and test_id=p_test_id;
  if v_count >= v_test.attempt_limit then raise exception 'Attempt limit reached'; end if;

  insert into public.test_attempts(student_id,test_id,attempt_number,expires_at,total_marks)
  values(auth.uid(),p_test_id,v_count+1,
    now()+make_interval(mins=>v_test.duration_minutes),v_test.total_marks)
  returning * into v_attempt;

  return v_attempt;
end;
$function$;
