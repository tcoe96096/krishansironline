-- ACTIVATION UPDATE 2026-11-15: This reviewed SQL was activated in the ISOLATED
-- krishan-sir-lms-preview database as preview_study_material_scoped_authoring_20261115.
-- ORIGINAL pre-approval warnings below are historical. This file is NOT a
-- production migration and must not be auto-applied to Production.
-- REVIEW-ONLY: unified Result + Study Material delegated authorization.
-- Prerequisite: docs/proposed-migrations/result_staff_delegation_review_only.sql
-- NOT a deployed migration; do not run on Production or Preview without owner approval.
-- The public STUDY_CHAPTERS static catalogue remains unchanged until safe import and QA.
-- Staff cannot edit existing score rows or access answer keys through this proposal.
begin;

-- Extend the separately proposed role-grant contract, without changing global user_roles.
alter table public.result_staff_grants
  drop constraint if exists result_staff_grants_role_check;
alter table public.result_staff_grants
  add constraint result_staff_grants_role_check
  check (role in ('result_manager','academic_admin','content_manager','teacher','viewer'));

alter table public.result_staff_grants
  drop constraint if exists result_role_allowed_capabilities;
alter table public.result_staff_grants
  add constraint result_role_allowed_capabilities check (
    permissions <@ (
      case role
        when 'result_manager' then array['results.read','results.export','results.correction.request','results.release.propose']::text[]
        when 'academic_admin' then array['results.read','tests.manage','results.correction.request','materials.read','materials.draft.write','materials.review.propose']::text[]
        when 'content_manager' then array['materials.read','materials.draft.write','materials.review.propose']::text[]
        when 'teacher' then array['results.read','results.correction.request','materials.read','materials.draft.write','materials.review.propose']::text[]
        when 'viewer' then array['results.read','materials.read']::text[]
        else array[]::text[]
      end
    )
  );

-- A distinct table prevents delegated content editors from modifying existing static
-- catalogue, private answer keys or automated test scores.
create table if not exists public.study_material_items (
  id uuid primary key default gen_random_uuid(),
  class_level text not null check (class_level in ('6','7','8','9','10','11','12')),
  subject text not null check (length(btrim(subject)) between 2 and 120),
  title text not null check (length(btrim(title)) between 3 and 200),
  description text not null default '',
  review_note text not null default '' check (length(review_note) <= 1000),
  kind text not null check (kind in ('notes','pdf','video','presentation','link')),
  resource_url text null check (resource_url is null or (resource_url like 'https://%' and length(resource_url) <= 2000)),
  linked_test_id text null references public.tests(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','pending_review','published','archived')),
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists study_material_items_class_subject
on public.study_material_items(class_level,subject,status);

create table if not exists public.study_material_change_audit (
  id bigint generated always as identity primary key,
  item_id uuid not null,
  actor_id uuid not null,
  operation text not null check(operation in ('INSERT','UPDATE','DELETE')),
  old_state jsonb,
  new_state jsonb,
  logged_at timestamptz not null default now()
);
create index if not exists study_material_change_audit_item_time
on public.study_material_change_audit(item_id,logged_at desc);

alter table public.study_material_items enable row level security;
alter table public.study_material_change_audit enable row level security;
revoke all on public.study_material_items from public,anon,authenticated;
revoke all on public.study_material_change_audit from public,anon,authenticated;
revoke all on sequence public.study_material_change_audit_id_seq from public,anon,authenticated;
grant select on public.study_material_items to anon,authenticated;
grant insert,update,delete on public.study_material_items to authenticated;
grant select on public.study_material_change_audit to authenticated;

drop policy if exists "Published material is readable" on public.study_material_items;
create policy "Published material is readable" on public.study_material_items
for select to anon,authenticated
using (status='published');

drop policy if exists "Owner or super admin reads review drafts" on public.study_material_items;
create policy "Owner or super admin reads review drafts" on public.study_material_items
for select to authenticated
using (
  (select public.is_super_admin())
  or (
    created_by=(select auth.uid())
    and exists (
      select 1 from public.result_staff_grants g
      where g.user_id=(select auth.uid()) and g.is_active
      and 'materials.read'=any(g.permissions)
      and (g.scope_class is null or g.scope_class=study_material_items.class_level)
    )
  )
);

drop policy if exists "Scoped editors create drafts" on public.study_material_items;
create policy "Scoped editors create drafts" on public.study_material_items
for insert to authenticated
with check (
  (select public.is_super_admin())
  or (
    created_by=(select auth.uid()) and status='draft'
    and exists (
      select 1 from public.result_staff_grants g
      where g.user_id=(select auth.uid()) and g.is_active
      and 'materials.draft.write'=any(g.permissions)
      and (g.scope_class is null or g.scope_class=study_material_items.class_level)
    )
  )
);

drop policy if exists "Scoped editors update only own drafts" on public.study_material_items;
create policy "Scoped editors update only own drafts" on public.study_material_items
for update to authenticated
using (
  (select public.is_super_admin())
  or (
    status='draft' and created_by=(select auth.uid())
    and exists (
      select 1 from public.result_staff_grants g
      where g.user_id=(select auth.uid()) and g.is_active
      and 'materials.draft.write'=any(g.permissions)
      and (g.scope_class is null or g.scope_class=study_material_items.class_level)
    )
  )
)
with check (
  (select public.is_super_admin())
  or (
    status='draft' and created_by=(select auth.uid())
    and exists (
      select 1 from public.result_staff_grants g
      where g.user_id=(select auth.uid()) and g.is_active
      and 'materials.draft.write'=any(g.permissions)
      and (g.scope_class is null or g.scope_class=study_material_items.class_level)
    )
  )
);

drop policy if exists "Scoped staff submit own drafts for review" on public.study_material_items;
create policy "Scoped staff submit own drafts for review" on public.study_material_items
for update to authenticated
using (
  status='draft' and created_by=(select auth.uid())
  and exists (
    select 1 from public.result_staff_grants g
    where g.user_id=(select auth.uid()) and g.is_active
    and 'materials.review.propose'=any(g.permissions)
    and (g.scope_class is null or g.scope_class=study_material_items.class_level)
  )
)
with check (
  status='pending_review' and created_by=(select auth.uid())
  and exists (
    select 1 from public.result_staff_grants g
    where g.user_id=(select auth.uid()) and g.is_active
    and 'materials.review.propose'=any(g.permissions)
    and (g.scope_class is null or g.scope_class=study_material_items.class_level)
  )
);

drop policy if exists "Owner may delete only own drafts" on public.study_material_items;
create policy "Owner may delete only own drafts" on public.study_material_items
for delete to authenticated
using (
  (select public.is_super_admin())
  or (
    status='draft' and created_by=(select auth.uid())
    and exists (
      select 1 from public.result_staff_grants g
      where g.user_id=(select auth.uid()) and g.is_active
      and 'materials.draft.write'=any(g.permissions)
      and (g.scope_class is null or g.scope_class=study_material_items.class_level)
    )
  )
);

drop policy if exists "Super admin audits material changes" on public.study_material_change_audit;
create policy "Super admin audits material changes" on public.study_material_change_audit
for select to authenticated
using ((select public.is_super_admin()));

-- A private trigger prevents spoofing of audit actor/time and cross-class test links.
create or replace function private.audit_study_material_change()
returns trigger
language plpgsql security definer set search_path=''
as $body$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if tg_op='DELETE' then
    v_id:=old.id;
    insert into public.study_material_change_audit(item_id,actor_id,operation,old_state)
      values(v_id,v_actor,'DELETE',to_jsonb(old));
    return old;
  end if;

  if tg_op='INSERT' then
    new.created_by:=v_actor;
    new.created_at:=now();
  else
    if new.id is distinct from old.id or new.created_by is distinct from old.created_by then
      raise exception 'Material ownership cannot change' using errcode='42501';
    end if;
  end if;

  if tg_op='UPDATE' then
    -- A delegated reviewer may only propose the state transition, not mutate content
    -- at the same time or elevate directly to a published state.
    if old.status='draft' and new.status='pending_review'
      and not public.is_super_admin()
      and (old.class_level,old.subject,old.title,old.description,old.kind,old.resource_url,old.linked_test_id)
        is distinct from
          (new.class_level,new.subject,new.title,new.description,new.kind,new.resource_url,new.linked_test_id)
    then raise exception 'Submit for review without editing other fields' using errcode='42501';
    end if;
    if new.status in ('published','archived') and new.status is distinct from old.status then
      if not public.is_super_admin() then raise exception 'Only Super Admin publishes or archives' using errcode='42501'; end if;
      if length(btrim(new.review_note)) < 12 then
        raise exception 'A review reason of at least 12 characters is required' using errcode='22023';
      end if;
    end if;
  end if;

  if new.linked_test_id is not null and not exists (
    select 1 from public.tests t
    where t.id=new.linked_test_id and t.class_level=new.class_level
  ) then
    raise exception 'Linked test must match material class' using errcode='23514';
  end if;

  new.updated_by:=v_actor;
  new.updated_at:=now();
  v_id:=new.id;
  insert into public.study_material_change_audit(item_id,actor_id,operation,old_state,new_state)
    values(v_id,v_actor,tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
  return new;
end;
$body$;
revoke all on function private.audit_study_material_change() from public,anon,authenticated;
drop trigger if exists audit_study_material_change on public.study_material_items;
create trigger audit_study_material_change
before insert or update or delete on public.study_material_items
for each row execute function private.audit_study_material_change();

commit;

-- REQUIRED PREVIEW TEST GATES:
-- A. Student/anonymous can read only published items, never drafts or audit.
-- B. Teacher can create/update only own class-scoped drafts; can never publish.
-- C. Teacher cannot modify another author, another class or private test answers.
-- D. Content Manager and Academic Admin are bounded by an active grant.
-- E. Revoked grant blocks new reads/updates immediately; no JWT permission caching.
-- F. Super Admin can review/publish and sees complete audit with correct actor.
-- G. Link to wrong class, invalid resource URL, spoofed author/actor are rejected.
-- H. Existing public static study chapters must remain available during migration.
-- I. Before any release, review and narrow existing broad is_admin() result policies.
-- J. Storage uploads and signed/private access need separate bucket policy approval.
