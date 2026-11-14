-- PREVIEW-ONLY SCHEMA PROPOSAL — NOT APPLIED
-- Review and validate against the Preview project before applying.
-- Do not apply this SQL to Production.

-- 1. Student lifecycle fields.
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

-- Existing accounts must remain usable after rollout.
update public.student_profiles
set approval_status = 'approved',
    approved_at = coalesce(approved_at, created_at),
    account_status = 'active'
where approval_status = 'pending'
  and approved_at is null
  and account_status = 'active';

create index if not exists student_profiles_lifecycle_idx
  on public.student_profiles(approval_status, account_status, created_at desc);

-- 2. Append-only admin audit history.
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

-- No UPDATE or DELETE policy: audit entries remain append-only.
grant select, insert on public.student_admin_audit to authenticated;

-- IMPORTANT:
-- This proposal is intentionally incomplete as a release migration.
-- Before application, add trusted enforcement for pending/suspended/deleted student
-- access to student routes and ensure all existing student RLS policies honor the
-- lifecycle state. Auth suspension/session revocation must be implemented server-side.
