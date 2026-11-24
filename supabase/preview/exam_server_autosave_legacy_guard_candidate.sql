-- Apply AFTER the private draft schema/RPCs, before enabling the client flag.
-- Preserve the installed legacy scoring implementation; do not rewrite historic results.
-- Fail closed if the installed RPC does not match the expected audited boundaries.
do $patch$
declare
  v_definition text;
  v_auth text := 'if auth.uid() is null then';
  v_expiry text := 'if now() > v_attempt.expires_at then';
  v_boundary text := 'select * into v_test';
  v_guard text := 'if exists (select 1 from ksol_exam_private.attempt_drafts where attempt_id = v_attempt.id) then raise exception ''Use the acknowledged server draft to submit this attempt''; end if;';
begin
  if to_regclass('ksol_exam_private.attempt_drafts') is null then raise exception 'Install exam drafts first'; end if;
  select pg_get_functiondef('public.submit_test_attempt(uuid,jsonb)'::regprocedure) into v_definition;
  if position(v_guard in v_definition)>0 then return; end if;
  if position(v_auth in v_definition)=0 or position(v_expiry in v_definition)=0 or position(v_boundary in v_definition)=0
    or (length(v_definition)-length(replace(v_definition,v_boundary,'')))/length(v_boundary)<>1 then
    raise exception 'Legacy submission RPC differs from reviewed source';
  end if;
  -- Eligibility is checked for both legacy and draft-enabled exam requests.
  if position('public.student_account_is_eligible(auth.uid())' in v_definition)=0 then
    v_definition:=replace(v_definition,v_auth,'if auth.uid() is not null and not public.student_account_is_eligible(auth.uid()) then raise exception ''Student account is not eligible to submit this test''; end if; '||v_auth);
  end if;
  v_definition:=replace(v_definition,v_expiry,'if clock_timestamp() >= v_attempt.expires_at then');
  v_definition:=replace(v_definition,v_boundary,v_guard||E'\n  '||v_boundary);
  execute v_definition;
end;
$patch$;
revoke all on function public.submit_test_attempt(uuid,jsonb) from public, anon;
grant execute on function public.submit_test_attempt(uuid,jsonb) to authenticated;
