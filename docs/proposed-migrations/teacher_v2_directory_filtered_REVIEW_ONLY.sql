-- KSOL Teacher v2 — server-filtered pending application review queue.
-- Core Teacher schema must already exist. No change to existing role grants or application rows.
BEGIN;
DO $gate$
BEGIN
 IF to_regclass('public.teacher_profiles') IS NULL
    OR to_regprocedure('public.teacher_v2_snapshot(uuid)') IS NULL
    OR to_regprocedure('public.is_super_admin()') IS NULL THEN
   RAISE EXCEPTION 'Teacher Core preconditions missing';
 END IF;
 IF to_regprocedure('public.teacher_v2_directory_filtered(integer,text,text)') IS NOT NULL THEN
   RAISE EXCEPTION 'Filtered directory RPC already exists; review before replacement';
 END IF;
END $gate$;

CREATE FUNCTION public.teacher_v2_directory_filtered(
 p_offset integer DEFAULT 0,
 p_search text DEFAULT '',
 p_status text DEFAULT 'pending'
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $rpc$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_super_admin(),false) THEN
  RAISE EXCEPTION 'Super Admin required' USING ERRCODE='42501';
 END IF;
 IF p_offset IS NULL OR p_offset<0 OR p_offset>100000
    OR p_search IS NULL OR char_length(p_search)>160
    OR p_status IS NULL OR p_status NOT IN ('all','pending','draft','approved','rejected','suspended') THEN
  RAISE EXCEPTION 'Invalid teacher directory filter' USING ERRCODE='22023';
 END IF;
 RETURN coalesce((
  SELECT jsonb_agg(public.teacher_v2_snapshot(p.user_id) ORDER BY p.created_at,p.user_id)
  FROM (
   SELECT t.user_id,t.created_at
   FROM public.teacher_profiles t
   WHERE (t.display_name ILIKE '%'||p_search||'%' OR t.employee_id ILIKE '%'||p_search||'%')
     AND (
       p_status='all'
       OR (p_status='pending' AND t.status='pending' AND t.submitted_at IS NOT NULL)
       OR (p_status='draft' AND t.status='pending' AND t.submitted_at IS NULL)
       OR (p_status IN ('approved','rejected','suspended') AND t.status=p_status)
     )
   ORDER BY t.created_at,t.user_id
   LIMIT 25 OFFSET p_offset
  ) p
 ),'[]'::jsonb);
END $rpc$;

REVOKE ALL ON FUNCTION public.teacher_v2_directory_filtered(integer,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_v2_directory_filtered(integer,text,text)
 TO authenticated;
COMMIT;

-- Protected by auth.uid() + the existing, independent Super Admin role guard.
-- The default pending filter excludes unsubmitted drafts; all is opt-in.
