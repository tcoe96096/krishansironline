-- Harden Preview purge claim audit: deduplicate blocked-review events and
-- write claim events only for rows claimed by this exact batch.
-- Preview project only; no Auth identities are deleted and no cron job is enabled.

create or replace function private.claim_student_purge_batch(p_batch_size integer default 10)
returns table (
  student_id uuid,
  student_name text,
  claim_token uuid,
  purge_after timestamptz,
  class_level text,
  roll_no text,
  school_name text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_batch_size < 1 or p_batch_size > 25 then
    raise exception 'Invalid batch size';
  end if;

  -- Avoid an audit-row storm for profiles that remain blocked. A new event is
  -- recorded only when the same student/reason has not been logged in 24 hours.
  insert into private.student_purge_events(student_id, student_name, event_type, reason_code)
  select sp.user_id, sp.student_name, 'blocked_review',
    case
      when private.student_name_needs_review(sp.student_name) then 'student_name_needs_review'
      when nullif(btrim(coalesce(sp.class_level,'')), '') is null then 'class_missing'
      when nullif(btrim(coalesce(sp.roll_no,'')), '') is null then 'roll_missing'
      when nullif(btrim(coalesce(sp.school_name,'')), '') is null then 'school_missing'
      when exists (select 1 from public.user_roles ur where ur.user_id=sp.user_id) then 'role_assigned'
      when exists (select 1 from public.visual_studio_drafts vd where vd.user_id=sp.user_id) then 'visual_studio_owner'
      else 'manual_review'
    end
  from public.student_profiles sp
  where sp.account_status='deleted'
    and sp.deleted_at is not null
    and sp.purge_after <= now()
    and sp.purge_completed_at is null
    and sp.purge_claim_token is null
    and (
      private.student_name_needs_review(sp.student_name)
      or nullif(btrim(coalesce(sp.class_level,'')), '') is null
      or nullif(btrim(coalesce(sp.roll_no,'')), '') is null
      or nullif(btrim(coalesce(sp.school_name,'')), '') is null
      or exists (select 1 from public.user_roles ur where ur.user_id=sp.user_id)
      or exists (select 1 from public.visual_studio_drafts vd where vd.user_id=sp.user_id)
    )
    and not exists (
      select 1
      from private.student_purge_events e
      where e.student_id=sp.user_id
        and e.event_type='blocked_review'
        and e.reason_code=case
          when private.student_name_needs_review(sp.student_name) then 'student_name_needs_review'
          when nullif(btrim(coalesce(sp.class_level,'')), '') is null then 'class_missing'
          when nullif(btrim(coalesce(sp.roll_no,'')), '') is null then 'roll_missing'
          when nullif(btrim(coalesce(sp.school_name,'')), '') is null then 'school_missing'
          when exists (select 1 from public.user_roles ur where ur.user_id=sp.user_id) then 'role_assigned'
          when exists (select 1 from public.visual_studio_drafts vd where vd.user_id=sp.user_id) then 'visual_studio_owner'
          else 'manual_review'
        end
        and e.created_at > now() - interval '24 hours'
    );

  return query
  with candidates as (
    select sp.user_id
    from public.student_profiles sp
    where sp.account_status='deleted'
      and sp.deleted_at is not null
      and sp.purge_after <= now()
      and sp.purge_completed_at is null
      and sp.purge_claim_token is null
      and not private.student_name_needs_review(sp.student_name)
      and nullif(btrim(coalesce(sp.class_level,'')), '') is not null
      and nullif(btrim(coalesce(sp.roll_no,'')), '') is not null
      and nullif(btrim(coalesce(sp.school_name,'')), '') is not null
      and not exists (select 1 from public.user_roles ur where ur.user_id=sp.user_id)
      and not exists (select 1 from public.visual_studio_drafts vd where vd.user_id=sp.user_id)
    order by sp.purge_after, sp.user_id
    for update skip locked
    limit p_batch_size
  ),
  claimed as (
    update public.student_profiles sp
    set purge_claim_token=gen_random_uuid(),
        purge_claimed_at=now(),
        purge_attempts=sp.purge_attempts+1,
        purge_last_error_code=null
    from candidates c
    where sp.user_id=c.user_id
    returning sp.user_id, sp.student_name, sp.purge_claim_token,
      sp.purge_after, sp.class_level, sp.roll_no, sp.school_name
  ),
  logged as (
    insert into private.student_purge_events(student_id, student_name, event_type)
    select c.user_id, c.student_name, 'claimed'
    from claimed c
    returning id
  )
  select c.user_id, c.student_name, c.purge_claim_token,
    c.purge_after, c.class_level, c.roll_no, c.school_name
  from claimed c;
end;
$$;

revoke all on function private.claim_student_purge_batch(integer) from public, anon, authenticated;
grant execute on function private.claim_student_purge_batch(integer) to service_role;
