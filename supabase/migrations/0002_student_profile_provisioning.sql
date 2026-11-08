-- Provision the canonical student profile when a student signs up.
-- The profile is created by a trusted auth.users trigger, not by browser-supplied SQL.
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
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', '') <> 'student' then
    return new;
  end if;

  v_class := trim(coalesce(new.raw_user_meta_data ->> 'student_class', ''));
  v_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  v_roll := trim(coalesce(new.raw_user_meta_data ->> 'roll_no', ''));
  v_school := trim(coalesce(new.raw_user_meta_data ->> 'school_name', ''));

  if v_class not in ('6','7','8','9','10','11','12')
     or v_name = '' or v_roll = '' or v_school = '' then
    raise exception 'Student registration details are incomplete or invalid';
  end if;

  insert into public.student_profiles (
    user_id, student_name, class_level, roll_no, school_name
  ) values (
    new.id, v_name, v_class, v_roll, v_school
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_student_profile on auth.users;
create trigger on_auth_user_created_student_profile
  after insert on auth.users
  for each row execute function public.handle_new_student_profile();

-- Keep updated_at accurate for profile edits performed by an authorized admin.
create or replace function public.set_student_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists student_profiles_updated_at on public.student_profiles;
create trigger student_profiles_updated_at
  before update on public.student_profiles
  for each row execute function public.set_student_profile_updated_at();

-- The trigger function is invoked by PostgreSQL's auth insert trigger only.
revoke all on function public.handle_new_student_profile() from public, anon, authenticated;
