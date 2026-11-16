-- REVIEW ONLY. Never execute or grant privileges without owner approval and RLS review.
-- Requires teacher_management_v2_schema_REVIEW_ONLY.sql.
-- Profile edits are owner-bound; approval, employee IDs and assignments are not client-writable.
BEGIN;
CREATE OR REPLACE FUNCTION public.teacher_v2_save_profile(
  p_display_name text, p_contact_email text, p_phone text, p_experience_years integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid(); v_status text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;
  IF p_display_name IS NULL OR char_length(btrim(p_display_name)) NOT BETWEEN 2 AND 160
     OR p_display_name ~ '[[:cntrl:]]'
     OR (p_contact_email IS NOT NULL AND (
          char_length(p_contact_email) > 254 OR
          (p_contact_email <> '' AND p_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')))
     OR (p_phone IS NOT NULL AND (char_length(p_phone)>20 OR p_phone ~ '[^0-9+ ()-]'))
     OR (p_experience_years IS NOT NULL AND p_experience_years NOT BETWEEN 0 AND 70)
  THEN
    RAISE EXCEPTION 'Invalid teacher profile' USING ERRCODE='22023';
  END IF;
  SELECT status INTO v_status FROM public.teacher_profiles
    WHERE user_id=v_actor FOR UPDATE;
  IF FOUND AND v_status <> 'pending' THEN
    RAISE EXCEPTION 'Reviewed teacher profiles cannot be edited by applicants'
      USING ERRCODE='42501';
  END IF;
  INSERT INTO public.teacher_profiles
    (user_id,display_name,contact_email,phone,experience_years)
  VALUES (v_actor,btrim(p_display_name),nullif(btrim(p_contact_email),''),nullif(btrim(p_phone),''),p_experience_years)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name=excluded.display_name,contact_email=excluded.contact_email,
    phone=excluded.phone,experience_years=excluded.experience_years,updated_at=now()
  WHERE public.teacher_profiles.status='pending';
  RETURN v_actor;
END;
$$;
REVOKE ALL ON FUNCTION public.teacher_v2_save_profile(text,text,text,integer)
  FROM PUBLIC,anon,authenticated;

-- A SECURITY DEFINER reader intentionally returns an allowlisted row, never resume paths.
CREATE OR REPLACE FUNCTION public.teacher_v2_get_my_profile()
RETURNS TABLE(user_id uuid,employee_id text,display_name text,contact_email text,
              phone text,experience_years integer,status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT p.user_id,p.employee_id,p.display_name,p.contact_email,
    p.phone,p.experience_years,p.status
    FROM public.teacher_profiles p WHERE p.user_id=auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.teacher_v2_get_my_profile()
  FROM PUBLIC,anon,authenticated;
COMMIT;
-- REVIEW GATES: role tests, email/phone validation parity, concurrent approval/edit,
-- privilege inspection, no data leakage, legacy compatibility, explicit owner approval.
