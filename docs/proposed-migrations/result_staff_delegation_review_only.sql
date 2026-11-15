-- PROPOSED / REVIEW-ONLY SQL
-- Smart Result Studio: Super Admin-controlled, auditable delegated RESULT permissions.
-- DO NOT RUN against production. This file is intentionally outside supabase/migrations.
-- First test against the isolated PREVIEW database after explicit owner approval.
-- Existing auth roles in public.user_roles remain admin/super_admin only; this is
-- an additive, scoped result-specific grant table, NOT a global admin elevation.
-- This proposal does not yet modify result/attempt RLS; delegated staff have NO new
-- access to test_attempts until a separately audited and approved read path exists.

begin;

create schema if not exists private;

create table if not exists public.result_staff_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('result_manager','academic_admin','teacher','viewer')),
  permissions text[] not null default array[]::text[],
  scope_class text null,
  scope_test_id text null,
  is_active boolean not null default true,
  change_reason text not null check (length(btrim(change_reason)) between 12 and 1000),
  assigned_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint result_role_allowed_capabilities check (
    permissions <@ (
      case role
        when 'result_manager' then array['results.read','results.export','results.correction.request','results.release.propose']::text[]
        when 'academic_admin' then array['results.read','tests.manage','results.correction.request']::text[]
        when 'teacher' then array['results.read','results.correction.request']::text[]
        when 'viewer' then array['results.read']::text[]
        else array[]::text[]
      end
    )
  ),
  constraint result_scope_class_valid check (scope_class is null or scope_class in ('6','7','8','9','10','11','12')),
  constraint result_scope_test_nonempty check (scope_test_id is null or length(btrim(scope_test_id)) between 1 and 200)
);

create table if not exists public.result_staff_grant_audit (
  id bigint generated always as identity primary key,
  affected_user_id uuid not null,
  actor_id uuid not null,
  operation text not null check(operation in ('INSERT','UPDATE','DELETE')),
  old_state jsonb null,
  new_state jsonb null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists result_staff_grant_audit_target_time
  on public.result_staff_grant_audit(affected_user_id,created_at desc);

alter table public.result_staff_grants enable row level security;
alter table public.result_staff_grant_audit enable row level security;

-- Supabase projects can have broad default grants. Remove them first.
revoke all on table public.result_staff_grants from public, anon, authenticated;
revoke all on table public.result_staff_grant_audit from public, anon, authenticated;
revoke all on sequence public.result_staff_grant_audit_id_seq from public, anon, authenticated;
grant select, insert, update, delete on table public.result_staff_grants to authenticated;
grant select on table public.result_staff_grant_audit to authenticated;

drop policy if exists "Result staff can inspect own grants or super admin lists" on public.result_staff_grants;
create policy "Result staff can inspect own grants or super admin lists"
  on public.result_staff_grants for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_super_admin()));

drop policy if exists "Super admin inserts result staff grants" on public.result_staff_grants;
create policy "Super admin inserts result staff grants"
  on public.result_staff_grants for insert to authenticated
  with check ((select public.is_super_admin()));

drop policy if exists "Super admin updates result staff grants" on public.result_staff_grants;
create policy "Super admin updates result staff grants"
  on public.result_staff_grants for update to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

drop policy if exists "Super admin revokes result staff grants" on public.result_staff_grants;
create policy "Super admin revokes result staff grants"
  on public.result_staff_grants for delete to authenticated
  using ((select public.is_super_admin()));

drop policy if exists "Only super admin reads result staff audit" on public.result_staff_grant_audit;
create policy "Only super admin reads result staff audit"
  on public.result_staff_grant_audit for select to authenticated
  using ((select public.is_super_admin()));

-- Guard and audit are trigger-only. Never expose this routine as a browser RPC.
create or replace function private.audit_result_staff_grant_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_reason text;
  v_target uuid;
begin
  if v_actor is null or not public.is_super_admin() then
    raise exception 'Only Super Admin can change Result staff grants'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    v_target := old.user_id;
    v_reason := old.change_reason;
    insert into public.result_staff_grant_audit
      (affected_user_id,actor_id,operation,old_state,new_state,reason)
    values (v_target,v_actor,'DELETE',to_jsonb(old),null,'Grant revoked');
    return old;
  end if;

  v_target := new.user_id;
  v_reason := btrim(coalesce(new.change_reason,''));
  if length(v_reason) < 12 or length(v_reason) > 1000 then
    raise exception 'A change reason of 12-1000 characters is required'
      using errcode = '22023';
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'Cannot reassign grant ownership' using errcode = '42501';
    end if;
    new.assigned_by := old.assigned_by;
    new.assigned_at := old.assigned_at;
  else
    new.assigned_by := v_actor;
    new.assigned_at := now();
  end if;
  new.updated_by := v_actor;
  new.updated_at := now();

  insert into public.result_staff_grant_audit
    (affected_user_id,actor_id,operation,old_state,new_state,reason)
  values (
    v_target, v_actor, tg_op,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new),v_reason
  );
  return new;
end;
$function$;

revoke all on function private.audit_result_staff_grant_change() from public, anon, authenticated;

drop trigger if exists audit_result_staff_grant_change on public.result_staff_grants;
create trigger audit_result_staff_grant_change
before insert or update or delete on public.result_staff_grants
for each row execute function private.audit_result_staff_grant_change();

-- Do not grant insert/update/delete on the audit table to API roles.
-- Never grant access to test_attempts via this proposal: existing broad admin
-- policies must be separately reviewed and replaced to honor delegated scopes.

commit;

-- Mandatory preview acceptance tests before activation:
-- 1. No logged-out / student / ordinary admin user can grant or modify roles.
-- 2. Super Admin can grant, narrow, deactivate and audit; cannot target unknown user.
-- 3. Invalid role or over-broad permissions fail at CHECK constraint.
-- 4. UPDATE cannot reassign user_id and never trusts supplied assigned_by/updated_by.
-- 5. Missing reason fails; change audit stores actor, old/new state and timestamp.
-- 6. New result_manager / teacher have no inherited access to private attempt rows.
-- 7. Test revocation + stale token: old grant no longer authorizes any action.
-- 8. Keep historical Super Admin records and existing auth users untouched.
