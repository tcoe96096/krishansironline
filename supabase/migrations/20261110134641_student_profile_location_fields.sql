-- Add structured student location fields without changing existing student identities.
alter table public.student_profiles
  add column if not exists country text not null default 'India',
  add column if not exists state text,
  add column if not exists district text,
  add column if not exists area_type text,
  add column if not exists locality_name text,
  add column if not exists pin_code text;

alter table public.student_profiles
  add constraint student_profiles_area_type_check
  check (area_type is null or area_type in ('village','city','town','other'));

alter table public.student_profiles
  add constraint student_profiles_pin_code_check
  check (pin_code is null or pin_code ~ '^[0-9]{6}$');

create or replace function public.handle_new_student_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class text;
  v_name text;
  v_roll text;
  v_school text;
  v_country text;
  v_state text;
  v_district text;
  v_area_type text;
  v_locality text;
  v_pin text;
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', '') <> 'student' then
    return new;
  end if;

  v_class := trim(coalesce(new.raw_user_meta_data ->> 'student_class', ''));
  v_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  v_roll := trim(coalesce(new.raw_user_meta_data ->> 'roll_no', ''));
  v_school := trim(coalesce(new.raw_user_meta_data ->> 'school_name', ''));
  v_country := trim(coalesce(new.raw_user_meta_data ->> 'country', 'India'));
  v_state := trim(coalesce(new.raw_user_meta_data ->> 'state', ''));
  v_district := trim(coalesce(new.raw_user_meta_data ->> 'district', ''));
  v_area_type := trim(coalesce(new.raw_user_meta_data ->> 'area_type', ''));
  v_locality := trim(coalesce(new.raw_user_meta_data ->> 'locality_name', ''));
  v_pin := nullif(trim(coalesce(new.raw_user_meta_data ->> 'pin_code', '')), '');

  if v_class not in ('6','7','8','9','10','11','12')
     or v_name = '' or v_roll = '' or v_school = ''
     or v_country = '' or v_state = '' or v_district = ''
     or v_area_type not in ('village','city','town','other')
     or v_locality = ''
     or (v_pin is not null and v_pin !~ '^[0-9]{6}$') then
    raise exception 'Student registration details are incomplete or invalid';
  end if;

  insert into public.student_profiles (
    user_id, student_name, class_level, roll_no, school_name,
    country, state, district, area_type, locality_name, pin_code
  ) values (
    new.id, v_name, v_class, v_roll, v_school,
    v_country, v_state, v_district, v_area_type, v_locality, v_pin
  );

  return new;
end;
$$;

revoke all on function public.handle_new_student_profile() from public, anon, authenticated;
