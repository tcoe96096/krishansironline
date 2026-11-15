-- REVIEW ONLY — NOT APPLIED TO PREVIEW OR PRODUCTION
-- Central published KSOL result-card template, versioned and Super Admin controlled.
-- This file is deliberately NOT in supabase/migrations; separate explicit owner
-- approval, isolated Preview rollout, RLS tests and rollback rehearsal are required.
-- This feature is presentation-only: NO columns for grade, student, answer or attempt.
--
-- Security:
-- - Only authenticated, server-confirmed Super Admin can publish via vetted RPC.
-- - No direct INSERT/UPDATE/DELETE browser permission.
-- - The public may SELECT only the singleton published template (no private data).
-- - Publish appends immutable audit record; client-supplied actor/version ignored.
-- - Uploaded local data-image previews MUST NOT be published through this RPC.
--   Future centrally published custom images require separately reviewed Storage
--   upload, ownership, moderation, size bounds and permission rules.
-- - Never publish while result embargo policies are incomplete; the styling
--   record itself must not contain scores.

begin;

create schema if not exists private;

create table if not exists public.result_card_templates (
  template_key text primary key default 'default' check (template_key='default'),
  theme text not null check(theme in ('modern','classic','minimal')),
  options jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version>=1),
  is_published boolean not null default true,
  change_reason text not null check (length(btrim(change_reason)) between 12 and 1000),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.result_card_template_audit (
  id bigint generated always as identity primary key,
  template_key text not null,
  template_version integer not null,
  actor_id uuid not null,
  old_state jsonb,
  new_state jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists result_card_template_audit_version_idx
  on public.result_card_template_audit (template_key,template_version desc);

alter table public.result_card_templates enable row level security;
alter table public.result_card_template_audit enable row level security;

revoke all on public.result_card_templates from public,anon,authenticated;
revoke all on public.result_card_template_audit from public,anon,authenticated;
revoke all on sequence public.result_card_template_audit_id_seq from public,anon,authenticated;

grant select on public.result_card_templates to anon,authenticated;
grant select on public.result_card_template_audit to authenticated;

drop policy if exists "Only published styling is public" on public.result_card_templates;
create policy "Only published styling is public"
  on public.result_card_templates for select to anon,authenticated
  using (template_key='default' and is_published);

drop policy if exists "Super Admin can view template audit" on public.result_card_template_audit;
create policy "Super Admin can view template audit"
  on public.result_card_template_audit for select to authenticated
  using ((select public.is_super_admin()));

-- Trigger-only definer: caller cannot alter version, actor or timestamps.
create or replace function private.audit_result_card_template()
returns trigger language plpgsql security definer set search_path=''
as $body$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.is_super_admin() then
    raise exception 'Super Admin required to publish a result-card template'
      using errcode='42501';
  end if;
  if tg_op='UPDATE' then
    new.version := old.version+1;
  else
    new.version := 1;
  end if;
  new.template_key := 'default';
  new.is_published := true;
  new.updated_by := v_actor;
  new.updated_at := now();
  insert into public.result_card_template_audit
    (template_key,template_version,actor_id,old_state,new_state,reason)
  values (
    new.template_key,new.version,v_actor,
    case when tg_op='UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new),new.change_reason
  );
  return new;
end;
$body$;

revoke all on function private.audit_result_card_template() from public,anon,authenticated;
drop trigger if exists audit_result_card_template on public.result_card_templates;
create trigger audit_result_card_template
before insert or update on public.result_card_templates
for each row execute function private.audit_result_card_template();

-- A read-only capability probe lets the UI suppress the Publish button until
-- this entire reviewed backend is installed; the publish RPC still rechecks.
create or replace function public.can_publish_result_card_template()
returns boolean language sql stable security invoker set search_path=''
as $capability$
  select auth.uid() is not null and public.is_super_admin();
$capability$;
revoke all on function public.can_publish_result_card_template() from public,anon;
grant execute on function public.can_publish_result_card_template() to authenticated;

create or replace function public.publish_result_card_template(
  p_theme text, p_options jsonb, p_reason text
)
returns integer
language plpgsql security definer set search_path = ''
as $publish$
declare
  v_actor uuid := auth.uid();
  v_new_version integer;
begin
  if v_actor is null or not public.is_super_admin() then
    raise exception 'Super Admin publishing permission required' using errcode='42501';
  end if;
  if p_theme is null or p_theme not in ('modern','classic','minimal') then
    raise exception 'Unknown theme' using errcode='22023';
  end if;
  if p_options is null or jsonb_typeof(p_options) <> 'object' then
    raise exception 'Design options must be an object' using errcode='22023';
  end if;
  if octet_length(p_options::text) > 3000 then
    raise exception 'Design options too large' using errcode='22023';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 12
     or length(btrim(p_reason)) > 1000 then
    raise exception 'A reason of 12 to 1000 characters is required' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_each(p_options) e
    where e.key not in (
      'showInstitution','showMetrics','showLogo','showPortrait','showSubjectTable',
      'brandTitle','tagline','footerNote','watermarkOpacity'
    )
  ) then
    raise exception 'Design contains an unknown or private data field' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_each(p_options) e
    where e.key in ('showInstitution','showMetrics','showLogo','showPortrait','showSubjectTable')
      and jsonb_typeof(e.value) <> 'boolean'
  ) then
    raise exception 'Invalid visibility setting' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_each(p_options) e
    where (e.key='brandTitle' and (jsonb_typeof(e.value)<>'string' or length(e.value #>> '{}')>80))
       or (e.key='tagline' and (jsonb_typeof(e.value)<>'string' or length(e.value #>> '{}')>110))
       or (e.key='footerNote' and (jsonb_typeof(e.value)<>'string' or length(e.value #>> '{}')>180))
  ) then
    raise exception 'Invalid design text length' using errcode='22023';
  end if;
  if p_options ? 'watermarkOpacity' then
    if jsonb_typeof(p_options->'watermarkOpacity') <> 'number' then
      raise exception 'Invalid watermark format' using errcode='22023';
    end if;
    if (p_options->>'watermarkOpacity')::numeric < 0
       or (p_options->>'watermarkOpacity')::numeric > 18 then
      raise exception 'Invalid watermark percentage' using errcode='22023';
    end if;
  end if;
  insert into public.result_card_templates
    (template_key,theme,options,change_reason,updated_by)
    values ('default',p_theme,p_options,btrim(p_reason),v_actor)
  on conflict (template_key) do update
    set theme=excluded.theme, options=excluded.options,
        change_reason=excluded.change_reason
  returning version into v_new_version;
  return v_new_version;
end;
$publish$;
revoke all on function public.publish_result_card_template(text,jsonb,text) from public,anon;
grant execute on function public.publish_result_card_template(text,jsonb,text) to authenticated;

commit;

-- Mandatory isolated Preview tests before enablement:
-- 1. Public SELECT retrieves only a non-sensitive single published template.
-- 2. Anonymous, student, teacher, ordinary Admin cannot publish or write tables.
-- 3. Super Admin publishes a new version, old/new audit rows are correct.
-- 4. A stale/removed Super Admin loses publish permission immediately.
-- 5. Invalid theme, reason, options, embedded scores, images, XSS-related keys
--    are rejected with no partial changes.
-- 6. Student Result Card displays new published layout without giving them
--    any private audit, score or role data beyond their own submitted attempts.
-- 7. Revert published version safely; preserve history, no silent audit deletion.
-- 8. Roll back this migration ONLY after exported audit backup and owner approval.
