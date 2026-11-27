-- REVIEW CANDIDATE ONLY. Do not apply automatically.
-- Template styling only, not student results or PDF delivery.
BEGIN;
DO $preflight$
BEGIN
 IF pg_catalog.to_regclass('public.result_card_templates') IS NOT NULL
 OR pg_catalog.to_regclass('public.result_card_template_audit') IS NOT NULL
 OR pg_catalog.to_regprocedure('public.publish_result_card_template(text,jsonb,text)') IS NOT NULL
 OR pg_catalog.to_regprocedure('public.can_publish_result_card_template()') IS NOT NULL
 OR pg_catalog.to_regprocedure('private.audit_result_card_template()') IS NOT NULL
 OR pg_catalog.to_regprocedure('public.is_super_admin()') IS NULL
 OR pg_catalog.to_regnamespace('private') IS NULL THEN
 RAISE EXCEPTION 'Template catalog drift or dependency missing; stop';
 END IF;
END
$preflight$;
CREATE TABLE public.result_card_templates (
 template_key text PRIMARY KEY DEFAULT 'default' CHECK(template_key='default'),
 theme text NOT NULL CHECK(theme IN ('modern','classic','minimal')),
 options jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(options)='object'),
 version integer NOT NULL DEFAULT 1 CHECK(version>=1),
 is_published boolean NOT NULL DEFAULT true,
 change_reason text NOT NULL CHECK(length(btrim(change_reason)) BETWEEN 12 AND 1000),
 updated_by uuid NOT NULL REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.result_card_template_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 template_key text NOT NULL,
 template_version integer NOT NULL,
 actor_id uuid NOT NULL,
 old_state jsonb,
 new_state jsonb NOT NULL,
 reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.result_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_card_template_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.result_card_templates,public.result_card_template_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT(template_key,theme,options,version,is_published) ON public.result_card_templates TO anon,authenticated;
GRANT SELECT ON public.result_card_template_audit TO authenticated;
CREATE POLICY published_style_read ON public.result_card_templates FOR SELECT TO anon,authenticated USING(template_key='default' AND is_published);
CREATE POLICY template_audit_admin_read ON public.result_card_template_audit FOR SELECT TO authenticated USING((SELECT public.is_super_admin()) IS TRUE);
CREATE FUNCTION private.audit_result_card_template() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $audit$
BEGIN
 IF auth.uid() IS NULL OR public.is_super_admin() IS DISTINCT FROM TRUE
 OR NEW.updated_by IS DISTINCT FROM auth.uid() THEN
 RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.result_card_template_audit(template_key,template_version,actor_id,old_state,new_state,reason)
 VALUES(NEW.template_key,NEW.version,auth.uid(),
 CASE WHEN TG_OP='UPDATE' THEN pg_catalog.to_jsonb(OLD) ELSE NULL END,
 pg_catalog.to_jsonb(NEW),NEW.change_reason);
 RETURN NEW;
END;
$audit$;
REVOKE ALL ON FUNCTION private.audit_result_card_template() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER audit_result_card_template AFTER INSERT OR UPDATE ON public.result_card_templates
FOR EACH ROW EXECUTE FUNCTION private.audit_result_card_template();
CREATE FUNCTION public.can_publish_result_card_template() RETURNS boolean LANGUAGE sql STABLE SET search_path=''
AS $can$ SELECT auth.uid() IS NOT NULL AND public.is_super_admin() IS TRUE; $can$;
CREATE FUNCTION public.publish_result_card_template(p_theme text, p_options jsonb, p_reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_new_version integer;
begin
  if v_actor is null or public.is_super_admin() is distinct from true then
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
        change_reason=excluded.change_reason,
        version=public.result_card_templates.version+1,
        updated_by=v_actor, updated_at=pg_catalog.now(), is_published=true
  returning version into v_new_version;
  return v_new_version;
end;
$function$
REVOKE ALL ON FUNCTION public.can_publish_result_card_template(),public.publish_result_card_template(text,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.can_publish_result_card_template(),public.publish_result_card_template(text,jsonb,text) TO authenticated;
COMMIT;
