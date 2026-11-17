"""Owner-authorized recovery verification ONLY. Reads exact Preview, restores LOCAL.
Needs securely configured PREVIEW_DB_URL. Never applies application migrations,
changes source data, deploys or touches Production. Backup files remain private.
A failed full restore is a failed gate; no schema/extension error is ignored.
"""
import hashlib,json,os,subprocess,time,uuid
from pathlib import Path
from urllib.parse import urlparse,unquote,parse_qs
TARGET='zgpkmfqioqvincmgyfpi'
IMAGE='postgres:17-alpine@sha256:a77aa70e641402a21411b92b721c58d10f23b50ae5fdd2333efd22d166e1e5f7'

def preview_connection(value):
    u=urlparse(value);host=u.hostname or '';user=unquote(u.username or '')
    direct=host==f'db.{TARGET}.supabase.co' and user=='postgres'
    pooler=host.endswith('.pooler.supabase.com') and user==f'postgres.{TARGET}' and u.port in (None,5432)
    if u.scheme not in ('postgres','postgresql') or not (direct or pooler) or u.path not in ('','/postgres'):raise ValueError('Only the exact isolated Preview database is allowed')
    if not u.password:raise ValueError('A securely configured Preview DB credential is required')
    if parse_qs(u.query).get('sslmode',['require'])[0] not in ('require','verify-ca','verify-full'):raise ValueError('TLS is required')
    return {'PGHOST':host,'PGPORT':str(u.port or 5432),'PGUSER':user,'PGPASSWORD':unquote(u.password),'PGDATABASE':'postgres','PGSSLMODE':parse_qs(u.query).get('sslmode',['require'])[0],'PGOPTIONS':'-c default_transaction_read_only=on -c statement_timeout=120000'}

class RecoveryCommandError(RuntimeError):
    def __init__(self,details):
        super().__init__('Backup/restore command failed; recovery is NOT verified');self.details=details

def run(args,data=None,env=None):
    r=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env)
    if r.returncode:raise RecoveryCommandError(r.stderr)
    return r.stdout

def main():
    if not os.environ.get('PREVIEW_DB_URL'):
        print(json.dumps({'status':'BLOCKED','reason':'No secure PREVIEW_DB_URL configured','remote_changes':False,'project_id':TARGET}));return 2
    connection=preview_connection(os.environ['PREVIEW_DB_URL']);env={**os.environ,**connection}
    out=Path('work/private-preview-recovery')/uuid.uuid4().hex;out.mkdir(parents=True,mode=0o700);os.chmod(out,0o700)
    def source(binary,arguments):
        docker=['docker','run','--rm','-i']
        for key in connection:docker+=['-e',key]
        return run(docker+[IMAGE,binary]+arguments,env=env)
    def source_sql(query):return source('psql',['-X','-v','ON_ERROR_STOP=1','-At','-c',query])
    def private_file(name,data):
        p=out/name;p.write_bytes(data);os.chmod(p,0o600);return p
    container=None
    try:
        # Metadata/role export precedes a consistent pg_dump snapshot. Source writes
        # must be quiesced by the owner; a later hash/count mismatch fails readiness.
        globals_sql=source('pg_dumpall',['--globals-only','--no-role-passwords'])
        private_file('roles.sql',globals_sql)
        baseline_schema=source('pg_dump',['--schema-only'])
        private_file('baseline-schema.sql',baseline_schema)
        table_query="SELECT format('SELECT json_build_object(''table'',%L,''rows'',count(*),''digest'',md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' ORDER BY md5(to_jsonb(r)::text)),''''))) FROM %I.%I r;',n.nspname||'.'||c.relname,n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' ORDER BY n.nspname,c.relname"
        count_sql=source_sql(table_query).decode();counts=b'\n'.join(line for line in source_sql("SET TIME ZONE 'UTC';"+count_sql).splitlines() if line.startswith(b'{'));private_file('source-counts.jsonl',counts)
        backup=source('pg_dump',['-Fc']);private_file('preview.dump',backup)
        container='ksol-recovery-local-'+uuid.uuid4().hex[:10]
        run(['docker','run','-d','--network','none','--name',container,'-e','POSTGRES_PASSWORD=local-recovery-only',IMAGE])
        for _ in range(80):
            ready=subprocess.run(['docker','exec',container,'sh','-c','test "$(cat /proc/1/comm)" = postgres && pg_isready -U postgres'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            if ready.returncode==0:break
            time.sleep(.25)
        else:raise RuntimeError('Local restore database did not start')
        # Preserve the local recovery operator's superuser role; all other source
        # roles are restored without password hashes. No source credentials change.
        roles='\n'.join(line for line in globals_sql.decode().splitlines() if not line.startswith(('CREATE ROLE postgres;','ALTER ROLE postgres ')))
        run(['docker','exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres'],roles.encode())
        run(['docker','exec','-i',container,'pg_restore','--exit-on-error','-U','postgres','-d','postgres'],backup)
        restored_counts=run(['docker','exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-At','-U','postgres'],("SET TIME ZONE 'UTC';"+count_sql).encode());restored_counts=b'\n'.join(line for line in restored_counts.splitlines() if line.startswith(b'{'));private_file('restored-counts.jsonl',restored_counts)
        restored_schema=run(['docker','exec',container,'pg_dump','--schema-only','-U','postgres']);private_file('restored-schema.sql',restored_schema)
        def normalized(data):return '\n'.join(line for line in data.decode().splitlines() if not line.startswith(('--','\\restrict','\\unrestrict')) and line.strip())
        if sorted(counts.splitlines())!=sorted(restored_counts.splitlines()) or normalized(baseline_schema)!=normalized(restored_schema):raise RuntimeError('Restored schema/table-count mismatch; readiness NOT verified')
        report={'status':'LOGICAL_RESTORE_VERIFIED','project_id':TARGET,'remote_writes':False,'tables_compared':len(counts.splitlines()),'backup_sha256':hashlib.sha256(backup).hexdigest(),'limitations':'Database-only logical recovery. No Auth API/OAuth or storage-object restore is claimed. Migration needs separate final preflight and approval.'}
        private_file('verification.json',json.dumps(report,indent=2).encode());print(json.dumps(report));return 0
    except Exception as error:
        if isinstance(error,RecoveryCommandError):private_file('restore-error_PRIVATE.log',error.details)
        private_file('verification.json',json.dumps({'status':'FAILED_NOT_READY','project_id':TARGET,'remote_writes':False,'reason':'Credential, export, extension/platform compatibility, schema or restore verification failed. Inspect private local evidence; do not bypass.'}).encode())
        print(json.dumps({'status':'FAILED_NOT_READY','project_id':TARGET,'remote_writes':False,'reason':'Full logical restore not verified; inspect private local evidence. No failure was ignored.'}));return 1
    finally:
        if container:subprocess.run(['docker','rm','-f',container],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
if __name__=='__main__':raise SystemExit(main())
