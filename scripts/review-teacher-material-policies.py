"""Independent local PostgreSQL policy/recovery rehearsal. Never connects to Supabase.
Runs exact captured Preview policies/trigger against synthetic fixtures, compares
against separately defined access expectations, then tests rollback + dump/restore.
All containers have --network none and no published ports. Requires Docker.
"""
import hashlib,json,re,subprocess,time,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=json.loads((ROOT/'docs/reviews/teacher-v2-material-policy-baseline-2026-11-16.json').read_text())
IMAGE='postgres:17-alpine@sha256:a77aa70e641402a21411b92b721c58d10f23b50ae5fdd2333efd22d166e1e5f7'
OUT=ROOT/'work/policy-review';OUT.mkdir(parents=True,exist_ok=True)
containers=[]
def command(args,data=None,check=True):
    r=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if check and r.returncode: raise RuntimeError(r.stderr.decode()[-2500:])
    return r

def start():
    name='ksol-local-policy-'+uuid.uuid4().hex[:10];containers.append(name)
    command(['docker','run','-d','--network','none','--name',name,'-e','POSTGRES_PASSWORD=local-synthetic-only',IMAGE])
    for _ in range(60):
        if command(['docker','exec',name,'sh','-c','test "$(cat /proc/1/comm)" = postgres && pg_isready -U postgres'],check=False).returncode==0: return name
        time.sleep(.25)
    raise RuntimeError('Local PostgreSQL startup failed')
def sql(container,source,db='postgres',check=True):
    return command(['docker','exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-At','-U','postgres','-d',db],source.encode(),check)
def lit(value): return "'"+str(value).replace("'","''")+"'"
def ident(value): return '"'+value.replace('"','""')+'"'
def policy(p):
    s=f"CREATE POLICY {ident(p['policyname'])} ON public.{ident(p['tablename'])} AS {p['permissive']} FOR {p['cmd']} TO "+','.join(ident(r) for r in p['roles'])
    if p['qual']:s+=' USING ('+p['qual']+')'
    if p['with_check']:s+=' WITH CHECK ('+p['with_check']+')'
    return s+';'
def proposal(name):
    # Historical comparison is pinned to the reviewed source, not later revisions.
    path=f'docs/proposed-migrations/teacher_management_v2_{name}_REVIEW_ONLY.sql'
    return command(['git','-C',str(ROOT),'show',BASE['source_commit']+':'+path]).stdout.decode()
def stripped(s):return re.sub(r'(?m)^BEGIN;\s*$|^COMMIT;\s*$','',s)

def actor(name,grant=None,scope='10',active=True,status=None,assign=(),role=None):
    return dict(name=name,id=str(uuid.uuid5(uuid.NAMESPACE_DNS,'ksol-local-'+name)),grant=grant,scope=scope,active=active,status=status,assign=assign,role=role)
ALL=['materials.read','materials.draft.write','materials.review.propose']
BOTH=[('10','History','materials.draft'),('10','History','materials.review')]
ACTORS=[actor('anonymous'),actor('student'),actor('ordinary_admin',role='admin'),actor('super_admin',role='super_admin'),
 actor('legacy_scoped',ALL),actor('legacy_unscoped',ALL,scope=None),actor('legacy_readonly',['materials.read']),actor('legacy_reviewonly',['materials.read','materials.review.propose']),actor('legacy_revoked',ALL,active=False),
 actor('v2_pending_legacy',ALL,status='pending'),actor('v2_rejected_legacy',ALL,status='rejected'),actor('v2_pending_no_legacy',status='pending'),
 actor('v2_approved_multi',ALL,status='approved',assign=BOTH+[('12','Political Science','materials.draft'),('12','Political Science','materials.review')]),
 actor('v2_revoked_assignments',ALL,status='approved',assign=BOTH),actor('v2_suspended_active_legacy',ALL,status='suspended',assign=BOTH),
 actor('v2_draft_only',ALL,status='approved',assign=[('10','History','materials.draft')]),actor('v2_review_only',ALL,status='approved',assign=[('10','History','materials.review')]),
 actor('v2_new_without_legacy',status='approved',assign=BOTH),actor('v2_result_only',ALL,status='approved',assign=[('10','History','result.review')])]
ADMIN=next(a['id'] for a in ACTORS if a['name']=='super_admin');OTHER=str(uuid.uuid5(uuid.NAMESPACE_DNS,'ksol-local-separate-owner'))
next(a for a in ACTORS if a['name']=='v2_revoked_assignments')['revoked']=True
SCOPES=[('10','History'),('10','Geography'),('12','Political Science'),('12','History')]
STATUSES=['draft','pending_review','published','archived']
# Independent expectation model: no SQL helper/policy implementation is reused.
def rights(a,scope,version):
    if a['name']=='anonymous':return set()
    if version=='new' and a['status'] in ('approved','suspended'):
        if a['status']=='suspended':return set()
        work={w for c,s,w in a['assign'] if (c,s)==scope and not a.get('revoked')}
        return ({'read'} if work.intersection({'materials.draft','materials.review'}) else set())|({'write'} if 'materials.draft' in work else set())|({'review'} if 'materials.review' in work else set())
    if not a['grant'] or not a['active'] or a['scope'] not in (None,scope[0]):return set()
    return {r for permission,r in [('materials.read','read'),('materials.draft.write','write'),('materials.review.propose','review')] if permission in a['grant']}

def setup():
    s="""CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;CREATE SCHEMA private;GRANT USAGE ON SCHEMA auth,public TO anon,authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE public.user_roles(user_id uuid,role text);
CREATE TABLE public.result_staff_grants(user_id uuid PRIMARY KEY,role text,permissions text[],scope_class text,is_active boolean);
CREATE TABLE public.tests(id text PRIMARY KEY,class_level text,subject text);CREATE TABLE public.test_attempts(id uuid,test_id text,status text,percentage numeric);
INSERT INTO public.tests VALUES('local-test-10','10','History'),('local-test-12','12','History');
"""
    for f in BASE['functions']:s+=f['definition']+';\n'
    s+=BASE['dependencies']['is_admin']+';\n'
    material=(ROOT/'docs/proposed-migrations/study_material_permission_and_linking_review_only.sql').read_text()
    s+=material[material.index('create table if not exists public.study_material_items'):material.index('drop policy if exists "Published material is readable"')]
    s+='ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;ALTER TABLE public.result_staff_grants ENABLE ROW LEVEL SECURITY;GRANT SELECT ON public.user_roles,public.result_staff_grants TO authenticated;\n'
    for p in BASE['policies']+BASE['dependencies']['grant_policies']+BASE['dependencies']['role_policies']:s+=policy(p)+'\n'
    s+=proposal('schema')+'\n'
    s+=f"INSERT INTO auth.users VALUES({lit(OTHER)});\n"
    for a in ACTORS:s+=f"INSERT INTO auth.users VALUES({lit(a['id'])});\n"
    for a in ACTORS:
        if a['role']:s+=f"INSERT INTO public.user_roles VALUES({lit(a['id'])},{lit(a['role'])});\n"
        if a['grant']:s+=f"INSERT INTO public.result_staff_grants VALUES({lit(a['id'])},'teacher',ARRAY["+','.join(lit(x) for x in a['grant'])+f"],{'NULL' if a['scope'] is None else lit(a['scope'])},{str(a['active']).lower()});\n"
        if a['status']:
            reviewed=a['status'] in ('approved','suspended')
            s+=f"INSERT INTO public.teacher_profiles(user_id,display_name,status,employee_id,approved_by,approved_at) VALUES({lit(a['id'])},{lit(a['name'])},{lit(a['status'])},{lit('KSOL-T-'+a['id'].replace('-','')[:12].upper()) if reviewed else 'NULL'},{lit(ADMIN) if reviewed else 'NULL'},{'now()' if reviewed else 'NULL'});\n"
            for c,subject,work in a['assign']:
                s+=f"INSERT INTO public.teacher_assignments(teacher_user_id,class_level,subject,work_type,assigned_by,status,revoked_by,revoked_at) VALUES({lit(a['id'])},{lit(c)},{lit(subject)},{lit(work)},{lit(ADMIN)},{lit('revoked' if a.get('revoked') else 'active')},{lit(ADMIN) if a.get('revoked') else 'NULL'},{'now()' if a.get('revoked') else 'NULL'});\n"
        for c,subject in SCOPES:
            for status in STATUSES:
                for own in (True,False):
                    key=f"{a['name']}:{c}:{subject}:{status}:{own}"
                    mid=str(uuid.uuid5(uuid.NAMESPACE_DNS,key))
                    s+=f"INSERT INTO public.study_material_items(id,class_level,subject,title,kind,status,created_by,updated_by) VALUES({lit(mid)},{lit(c)},{lit(subject)},'Local synthetic material','notes',{lit(status)},{lit(a['id'] if own else OTHER)},{lit(ADMIN)});\n"
    s+='\n'.join(t+';' for t in BASE['triggers'])
    s+="""
CREATE TABLE private.review_results(phase text,actor text,case_name text,expected boolean,actual boolean,error_state text,error_message text);
CREATE FUNCTION private.review_probe(p_phase text,p_actor text,p_uid text,p_case text,p_sql text,p_expected boolean) RETURNS void LANGUAGE plpgsql AS $$
DECLARE n bigint;v_actual boolean:=false;v_state text;v_message text;
BEGIN
 EXECUTE CASE WHEN p_actor='anonymous' THEN 'SET LOCAL ROLE anon' ELSE 'SET LOCAL ROLE authenticated' END;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'Probe role unexpectedly bypasses RLS'; END IF;
 PERFORM set_config('request.jwt.claim.sub',CASE WHEN p_actor='anonymous' THEN '' ELSE p_uid END,true);
 BEGIN
  EXECUTE p_sql INTO n;v_actual:=n>0;
  RAISE EXCEPTION 'rollback probe' USING ERRCODE='PZ001';
 EXCEPTION WHEN SQLSTATE 'PZ001' THEN NULL;
 WHEN insufficient_privilege OR check_violation THEN v_actual:=false;
 WHEN OTHERS THEN v_actual:=false;v_state:=SQLSTATE;v_message:=SQLERRM;
 END;
 RESET ROLE;
 INSERT INTO private.review_results VALUES(p_phase,p_actor,p_case,p_expected,v_actual,v_state,v_message);
END $$;
"""
    return s

def probes(phase,version):
    lines=[]
    for a in ACTORS:
        superuser=a['role']=='super_admin'
        for c,subject in SCOPES:
            r=rights(a,(c,subject),version);visible='read' in r
            def case(name,statement,expected):
                lines.append('SELECT private.review_probe('+','.join(lit(v) for v in [phase,a['name'],a['id'],f'{c}/{subject}/{name}',statement])+','+str(expected).lower()+');')
            def mid(status,own=True):return str(uuid.uuid5(uuid.NAMESPACE_DNS,f"{a['name']}:{c}:{subject}:{status}:{own}"))
            def update(status,changes,own=True):return f"WITH x AS (UPDATE public.study_material_items SET {changes} WHERE id={lit(mid(status,own))} RETURNING id) SELECT count(*) FROM x"
            for status in STATUSES:
                for own in (True,False):
                    # The anonymous fixture owns no identity, even when labeled own.
                    owns=own and a['name']!='anonymous'
                    case(f'read/{status}/{own}',f"SELECT count(*) FROM public.study_material_items WHERE id={lit(mid(status,own))}",superuser or status=='published' or owns and visible)
                insert=f"WITH x AS (INSERT INTO public.study_material_items(class_level,subject,title,kind,status,review_note) VALUES({lit(c)},{lit(subject)},'Inserted synthetic material','notes',{lit(status)},'Independent test review reason') RETURNING id) SELECT count(*) FROM x"
                case(f'insert/{status}',insert,superuser or status=='draft' and visible and 'write' in r)
                case(f'edit/{status}',update(status,"title='Changed synthetic title'"),superuser or status=='draft' and visible and 'write' in r)
                delete=f"WITH x AS (DELETE FROM public.study_material_items WHERE id={lit(mid(status))} RETURNING id) SELECT count(*) FROM x"
                case(f'delete/{status}',delete,superuser or status=='draft' and visible and 'write' in r)
            case('submit',update('draft',"status='pending_review'"),superuser or visible and 'review' in r)
            case('submit-and-change-content',update('draft',"status='pending_review',title='Unauthorized combined edit'"),superuser)
            case('edit-other',update('draft',"title='Other owner edit'",False),superuser)
            case('delete-other',f"WITH x AS (DELETE FROM public.study_material_items WHERE id={lit(mid('draft',False))} RETURNING id) SELECT count(*) FROM x",superuser)
            case('change-owner',update('draft',f'created_by={lit(OTHER)}'),False)
            case('wrong-class-link',update('draft',f"linked_test_id={lit('local-test-12' if c=='10' else 'local-test-10')}"),False)
            if (c,subject)==('10','History'):
                for nc,ns in [('10','Geography'),('12','History')]:
                    dest=rights(a,(nc,ns),version)
                    case(f'move-to/{nc}/{ns}',update('draft',f'class_level={lit(nc)},subject={lit(ns)}'),superuser or visible and 'write' in r and 'write' in dest and 'read' in dest)
    return '\n'.join(lines)

def fingerprints(container):
    q="""SELECT json_build_object(
      'policies',(SELECT json_agg(x) FROM (SELECT policyname,cmd,roles,permissive,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='study_material_items' ORDER BY policyname)x),
      'rows',(SELECT count(*) FROM public.study_material_items),
      'material_hash',(SELECT md5(string_agg(to_jsonb(m)::text,'' ORDER BY id)) FROM public.study_material_items m),
      'profiles',(SELECT count(*) FROM public.teacher_profiles),
      'profile_hash',(SELECT md5(string_agg((to_jsonb(p)-'resume_upload_after')::text,'' ORDER BY user_id)) FROM public.teacher_profiles p),
      'assignment_hash',(SELECT md5(string_agg(to_jsonb(a)::text,'' ORDER BY id)) FROM public.teacher_assignments a),
      'audit_rows',(SELECT count(*) FROM public.study_material_change_audit),
      'triggers',(SELECT json_agg(pg_get_triggerdef(oid) ORDER BY tgname) FROM pg_trigger WHERE tgrelid='public.study_material_items'::regclass AND NOT tgisinternal))"""
    return json.loads(sql(container,q).stdout.decode().strip())
def matrix(container,phase,version):
    sql(container,probes(phase,version))
    result=sql(container,"SELECT coalesce(json_agg(r),'[]'::json) FROM private.review_results r WHERE phase="+lit(phase)).stdout.decode().strip()
    rows=json.loads(result);bad=[r for r in rows if r['actual']!=r['expected'] or r['error_state']]
    print(json.dumps({'phase':phase,'checks':len(rows),'failures':len(bad)}),flush=True)
    if bad:
        (OUT/'failures.json').write_text(json.dumps(bad,indent=2));raise RuntimeError(json.dumps(bad[:3]))
    return rows

def main():
    c=start();sql(c,setup());before=fingerprints(c);old=matrix(c,'old','old')
    dump=command(['docker','exec',c,'pg_dump','-U','postgres','-Fc','postgres']).stdout;(OUT/'synthetic-baseline.dump').write_bytes(dump)
    bundle='\n'.join(stripped(proposal(name)) for name in ['schema','profile_rpc','functions','lifecycle','integration','resume'])
    failed=sql(c,'BEGIN;\n'+bundle+'\nSELECT 1/0;\nCOMMIT;',check=False)
    if failed.returncode==0 or fingerprints(c)!=before:raise RuntimeError('Atomic abort recovery failed')
    print('PASS: deliberately failed migration leaves policies and fixture counts unchanged',flush=True)
    sql(c,'BEGIN;\n'+bundle+'\nCOMMIT;');new=matrix(c,'new','new');after=fingerprints(c)
    # Supplemental confidentiality review of the exact proposed aggregate RPC.
    reviewer=next(a['id'] for a in ACTORS if a['name']=='v2_result_only')
    cohort_sql=f"""BEGIN;
      INSERT INTO public.test_attempts VALUES(gen_random_uuid(),'local-test-10','submitted',87);
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub',{lit(reviewer)},true);
      SELECT json_agg(s) FROM public.teacher_v2_result_summary('10','History') s;
      RESET ROLE;ROLLBACK;"""
    cohort=json.loads(next(line for line in sql(c,cohort_sql).stdout.decode().splitlines() if line.startswith('[')))
    if cohort[0]['submitted_count']!=1 or cohort[0]['average_percentage']!=87:raise RuntimeError('Unexpected small-cohort summary behavior')
    for key in ['rows','profiles','material_hash','profile_hash','assignment_hash','triggers']:
        if before[key]!=after[key]:raise RuntimeError('Policy replacement changed fixture data or trigger: '+key)
    drops=['V2 read own material','V2 create own draft','V2 update own draft','V2 submit own draft','V2 delete own draft']
    rollback='BEGIN;\n'+''.join('DROP POLICY IF EXISTS '+ident(n)+' ON public.study_material_items;\n' for n in drops)
    rollback+='\n'.join(policy(p) for p in BASE['policies'] if p['policyname']!='Published material is readable')+'\nCOMMIT;\n'
    (OUT/'policy-only-rollback.sql').write_text('-- LOCAL REHEARSAL ONLY. Remote use requires separate review/approval.\n'+rollback)
    sql(c,rollback)
    if fingerprints(c)!=before:raise RuntimeError('Policy rollback fingerprint or rows mismatch')
    recovered=matrix(c,'policy-rollback','old')
    restored=start();sql(restored,'CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE ROLE service_role NOLOGIN BYPASSRLS;')
    command(['docker','exec','-i',restored,'pg_restore','-U','postgres','-d','postgres','--exit-on-error'],dump)
    if fingerprints(restored)!=before:raise RuntimeError('Backup restore fingerprint or rows mismatch')
    restored_rows=matrix(restored,'backup-restore','old')
    differences=[{'actor':a['actor'],'case':a['case_name'],'old':a['actual'],'proposed':b['actual']} for a,b in zip(old,new) if a['actual']!=b['actual']]
    summary={'project_ref':BASE['project_ref'],'remote_changes':False,'engine':sql(c,'SELECT version()').stdout.decode().strip(),'image':IMAGE,'checks_per_phase':len(old),'total_checks':len(old)+len(new)+len(recovered)+len(restored_rows),'failures':0,'differences':differences,'before':before,'after':after,'atomic_abort_passed':True,'policy_rollback_passed':True,'synthetic_dump_restore_passed':True,'synthetic_dump_sha256':hashlib.sha256(dump).hexdigest(),'managed_preview_backup_verified':False,'small_cohort_privacy_review':{'synthetic_summary':cohort,'finding':'An authorized scoped result reviewer sees the exact score when only one attempt is present; owner confidentiality decision/redaction required before Beta.'}}
    (OUT/'results.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k not in ['differences','before','after']}),flush=True)
try: main()
finally:
    for container in containers:command(['docker','rm','-f',container],check=False)
