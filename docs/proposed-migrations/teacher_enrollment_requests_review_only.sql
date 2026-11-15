-- REVIEW ONLY: teacher self-application + audited Super Admin approval.
-- NOT executed; keep outside supabase/migrations/ pending explicit Preview approval.
-- Prerequisites, in order: result_staff_delegation_review_only.sql and
-- study_material_permission_and_linking_review_only.sql. Both require security fixes
-- and Preview RLS regression testing before any release.
-- Authentication = Google OAuth. A Google login alone never assigns a staff role.
-- This table holds minimal volunteered application details; no student/grade data.
begin;

create table if not exists public.teacher_enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 2 and 100),
  subject text not null check (subject in ('Political Science','History','Geography','Economics','Other')),
  requested_class text not null check (requested_class in ('6','7','8','9','10','11','12')),
  reason text not null check (length(btrim(reason)) between 12 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  review_reason text null check (review_reason is null or length(btrim(review_reason)) between 12 and 1000),
  reviewed_by uuid null references auth.users(id),
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teacher_enrollment_requests_pending
on public.teacher_enrollment_requests(status,created_at desc);

create table if not exists public.teacher_enrollment_audit (
  id bigint generated always as identity primary key,
  request_id uuid not null,
  actor_id uuid not null,
  operation text not null check (operation in ('SUBMIT','RESUBMIT','APPROVE','REJECT','WITHDRAW')),
  note text not null,
  created_at timestamptz not null default now()
);

alter table public.teacher_enrollment_requests enable row level security;
alter table public.teacher_enrollment_audit enable row level security;
revoke all on public.teacher_enrollment_requests from public,anon,authenticated;
revoke all on public.teacher_enrollment_audit from public,anon,authenticated;
revoke all on sequence public.teacher_enrollment_audit_id_seq from public,anon,authenticated;
grant select on public.teacher_enrollment_requests to authenticated;
grant select on public.teacher_enrollment_audit to authenticated;

drop policy if exists "Teacher sees own enrollment or Super Admin reviews" on public.teacher_enrollment_requests;
create policy "Teacher sees own enrollment or Super Admin reviews"
on public.teacher_enrollment_requests for select to authenticated
using (applicant_id=(select auth.uid()) or (select public.is_super_admin()));

drop policy if exists "Teacher enrollment audit is Super Admin only" on public.teacher_enrollment_audit;
create policy "Teacher enrollment audit is Super Admin only"
on public.teacher_enrollment_audit for select to authenticated
using ((select public.is_super_admin()));

create or replace function public.submit_teacher_enrollment(
  p_display_name text,p_subject text,p_class_level text,p_reason text
) returns uuid
language plpgsql security definer set search_path=''
as $body$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Teacher Google login required' using errcode='42501';
  end if;
  if length(btrim(coalesce(p_display_name,''))) not between 2 and 100
    or p_subject not in ('Political Science','History','Geography','Economics','Other')
    or p_class_level not in ('6','7','8','9','10','11','12')
    or length(btrim(coalesce(p_reason,''))) not between 12 and 1000
  then
    raise exception 'Invalid teacher registration details' using errcode='22023';
  end if;
  -- Never allow a teacher to silently register over an existing privileged role.
  if exists (select 1 from public.user_roles r where r.user_id=v_uid) then
    raise exception 'Existing platform role requires administrator review'
      using errcode='42501';
  end if;
  select status into v_status from public.teacher_enrollment_requests
  where applicant_id=v_uid for update;
  if v_status in ('pending','approved') then
    raise exception 'Teacher application already pending or approved'
      using errcode='23505';
  end if;
  if exists (select 1 from public.result_staff_grants g
             where g.user_id=v_uid and g.is_active) then
    raise exception 'Account already has active delegated permissions'
      using errcode='42501';
  end if;
  if v_status is null then
    insert into public.teacher_enrollment_requests
      (applicant_id,display_name,subject,requested_class,reason)
    values (v_uid,btrim(p_display_name),p_subject,p_class_level,btrim(p_reason))
    returning id into v_id;
  else
    update public.teacher_enrollment_requests set
      display_name=btrim(p_display_name),subject=p_subject,
      requested_class=p_class_level,reason=btrim(p_reason),
      status='pending',review_reason=null,reviewed_by=null,
      reviewed_at=null,updated_at=now()
    where applicant_id=v_uid returning id into v_id;
  end if;
  insert into public.teacher_enrollment_audit(request_id,actor_id,operation,note)
    values(v_id,v_uid,case when v_status is null then 'SUBMIT' else 'RESUBMIT' end,'Teacher requested scoped access');
  return v_id;
end;
$body$;
revoke all on function public.submit_teacher_enrollment(text,text,text,text) from public,anon;
grant execute on function public.submit_teacher_enrollment(text,text,text,text) to authenticated;

create or replace function public.review_teacher_enrollment(
  p_request_id uuid,p_action text,p_reason text
) returns text
language plpgsql security definer set search_path=''
as $body$
declare
  v_actor uuid := auth.uid();
  v_request public.teacher_enrollment_requests%rowtype;
  v_existing_role text;
begin
  if v_actor is null or not public.is_super_admin() then
    raise exception 'Super Admin permission required' using errcode='42501';
  end if;
  if p_action not in ('approve','reject')
     or length(btrim(coalesce(p_reason,''))) not between 12 and 1000
  then
    raise exception 'Invalid review decision or reason' using errcode='22023';
  end if;
  select * into v_request from public.teacher_enrollment_requests
     where id=p_request_id for update;
  if not found or v_request.status<>'pending' then
    raise exception 'Only pending applications can be reviewed' using errcode='22023';
  end if;
  if p_action='approve' then
    if exists (select 1 from public.user_roles r
               where r.user_id=v_request.applicant_id) then
      raise exception 'Cannot overwrite an existing platform role'
        using errcode='42501';
    end if;
    select role into v_existing_role from public.result_staff_grants
      where user_id=v_request.applicant_id for update;
    if v_existing_role is not null and v_existing_role <> 'teacher' then
      raise exception 'Cannot overwrite a different delegated role'
        using errcode='42501';
    end if;
    -- Teacher can create own class-limited private drafts, then request review.
    -- NEVER grant full site editing, student identity access, result corrections,
    -- answers, admin access, or material publishing through enrollment.
    insert into public.result_staff_grants
      (user_id,role,permissions,scope_class,is_active,change_reason)
    values (
      v_request.applicant_id,'teacher',
      array['materials.read','materials.draft.write','materials.review.propose']::text[],
      v_request.requested_class,true,btrim(p_reason)
    )
    on conflict (user_id) do update set
      role='teacher',permissions=excluded.permissions,
      scope_class=excluded.scope_class,scope_test_id=null,
      is_active=true,change_reason=excluded.change_reason;
  end if;
  update public.teacher_enrollment_requests set
    status=case when p_action='approve' then 'approved' else 'rejected' end,
    reviewed_by=v_actor,reviewed_at=now(),review_reason=btrim(p_reason),
    updated_at=now()
  where id=p_request_id;
  insert into public.teacher_enrollment_audit
    (request_id,actor_id,operation,note)
  values(p_request_id,v_actor,upper(p_action),btrim(p_reason));
  return case when p_action='approve' then 'approved' else 'rejected' end;
end;
$body$;
revoke all on function public.review_teacher_enrollment(uuid,text,text) from public,anon;
grant execute on function public.review_teacher_enrollment(uuid,text,text) to authenticated;

create or replace function public.withdraw_teacher_enrollment()
returns boolean language plpgsql security definer set search_path=''
as $body$
declare
  v_actor uuid := auth.uid();
  v_request_id uuid;
begin
  if v_actor is null then raise exception 'Login required' using errcode='42501'; end if;
  update public.teacher_enrollment_requests
    set status='withdrawn',updated_at=now()
    where applicant_id=v_actor and status='pending'
    returning id into v_request_id;
  if v_request_id is null then return false; end if;
  insert into public.teacher_enrollment_audit
    (request_id,actor_id,operation,note)
  values(v_request_id,v_actor,'WITHDRAW','Withdrawn by applicant');
  return true;
end;
$body$;
revoke all on function public.withdraw_teacher_enrollment() from public,anon;
grant execute on function public.withdraw_teacher_enrollment() to authenticated;
commit;

-- REQUIRED REVIEW/TESTS BEFORE APPLYING ANYWHERE:
-- 1. Verify user_roles.user_id column and result_staff_grants permissions
--    match the prerequisite migrations and current PREVIEW schema exactly.
-- 2. Validate all security definer helpers under anonymous/student/teacher/admin/
--    superadmin JWT; public/anon may not call functions and cannot write tables.
-- 3. Applicants cannot self-approve, modify status, choose role, or grant rights.
-- 4. One pending request per account; withdrawn/rejected may reapply.
-- 5. Approve assigns only teacher-scoped material permissions atomically and logs.
-- 6. Reject/withdraw never grant a role. Request history cannot be deleted via API.
-- 7. Superadmin review invalid request rejected; concurrent approvals serialized.
-- 8. Revoke disables all editor/reader capabilities immediately.
-- 9. No unapproved application or unreviewed material is student-visible.
-- 10. Data-retention/DSAR policy required for teacher PII and audit logs.
-- 11. Existing 'study_material_items' RLS and triggers must be hardened against
--     indirect changes to ownership/status/approval fields before production.
