import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Readable,Writable} from 'node:stream';
import {once} from 'node:events';
import {PROJECT_REFS,validateCloudSettings,isCryptRemote,assessDownloadedToc,classifyBackupFailure,drainAfterTocInputCloses} from '../scripts/recovery/cloud-stream-backup.mjs';

const base={KSOL_DB_HOST:'db.'+PROJECT_REFS.preview+'.supabase.co',
 KSOL_DB_PORT:'5432',KSOL_DB_USER:'postgres',KSOL_DB_NAME:'postgres',
 KSOL_DB_PASSWORD:'synthetic-test-only'};
test('only exact explicitly selected Supabase source is accepted',()=>{
 assert.equal(validateCloudSettings('preview',base).ok,true);
 assert.equal(validateCloudSettings('production',base).ok,false);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_HOST:'localhost'}).ok,false);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_PASSWORD:''}).ok,false);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_PORT:'65536'}).ok,false);
 assert.equal(validateCloudSettings('preview',base,'../../unsafe').ok,false);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_HOST:'aws-0-ap-south-1.pooler.supabase.com',
    KSOL_DB_USER:'postgres.'+PROJECT_REFS.preview}).ok,true);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_HOST:'aws-0-ap-south-1.pooler.supabase.com',
    KSOL_DB_USER:'postgres.'+PROJECT_REFS.production}).ok,false);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_HOST:'aws-0-ap-south-1.pooler.supabase.co',
    KSOL_DB_USER:'postgres.'+PROJECT_REFS.preview}).ok,false);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_HOST:'aws-0-ap-south-1.pooler.supabase.com.evil.invalid',
    KSOL_DB_USER:'postgres.'+PROJECT_REFS.preview}).ok,false);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_HOST:'aws-0-ap-south-1.pooler.supabase.com',
    KSOL_DB_USER:'postgres.'+PROJECT_REFS.preview,KSOL_DB_PORT:'6543'}).ok,false);
});
test('cloud storage MUST have a crypt overlay, not raw Google Drive remote',()=>{
 const config=String.raw`[gdrive]
type = drive
token = SECRET_SHOULD_NOT_BE_LOGGED

[ksolcrypt]
type = crypt
remote = gdrive:KSOL-Private/Encrypted
password = OBSCURED
password2 = OBSCURED

[another]
type = local
`;
 assert.equal(isCryptRemote(config,'ksolcrypt'),true);
 assert.equal(isCryptRemote(config,'gdrive'),false);
 assert.equal(isCryptRemote('[ksolcrypt]\ntype = drive\nremote = gdrive:KSOL-Private\n','ksolcrypt'),false);
 assert.equal(isCryptRemote('[ksolcrypt]\ntype = crypt\n','ksolcrypt'),false);
 assert.equal(isCryptRemote('[ksolcrypt]\ntype = crypt\nremote = E:/folder\n','ksolcrypt'),true);
});
test('decrypted downloaded TOC checks managed auth/storage and student/attempt data',()=>{
 const content=[
  '21; 0 1 TABLE DATA public student_profiles postgres',
  '22; 0 1 TABLE DATA public test_attempts postgres',
  '23; 0 1 TABLE DATA auth users postgres',
  '24; 0 1 TABLE DATA storage objects postgres'].join('\n');
 assert.equal(assessDownloadedToc(content).tocCoverage,true);
 assert.equal(assessDownloadedToc(content.replace('auth users','auth roles')).tocCoverage,false);
 assert.deepEqual(assessDownloadedToc('').missingTables,
  ['auth users','storage objects','public student_profiles','public test_attempts']);
});
test('script never writes local plaintext dump or mistakes archive success for full restore',()=>{
 const content=readFileSync('scripts/recovery/cloud-stream-backup.mjs','utf8');
 assert.match(content,/pg\.stdout\.pipe\(put\.stdin\)/);
 assert.match(content,/read\.stdout\.pipe\(toc\.stdin\)/);
 assert.match(content,/fullSupabaseRestore:'NOT_VERIFIED'/);
 assert.match(content,/releaseGate:'NO_GO'/);
 assert.doesNotMatch(content,/writeFileSync|--file|DROP DATABASE|pg_restore.*--clean/);
});

test('backup failure categories never log credential-bearing stderr',()=>{
 assert.equal(classifyBackupFailure('psql: password authentication failed for user postgres.x'), 'DATABASE_AUTH');
 assert.equal(classifyBackupFailure('could not translate host name aws-0.example.com'), 'DNS_HOST');
 assert.equal(classifyBackupFailure('Failed to refresh token: invalid_grant'), 'GOOGLE_AUTH');
 assert.equal(classifyBackupFailure('storage quota exceeded'), 'DRIVE_QUOTA');
 assert.equal(classifyBackupFailure('unclassified secret value 12345'), 'UNCLASSIFIED');
 const content=readFileSync('scripts/recovery/cloud-stream-backup.mjs','utf8');
 assert.ok(content.includes("source+' database preflight failed [DB_"));
 assert.match(content,/Encrypted Drive preflight failed/);
 assert.match(content,/const pgDiagnostic=collectDiagnostic/);
 assert.match(content,/const uploadDiagnostic=collectDiagnostic/);
 assert.doesNotMatch(content,/console\.error\([^\n]*\.stderr/);
});

test('backup exports have phase markers and terminate before workflow timeout',()=>{
 const source=readFileSync('scripts/recovery/cloud-stream-backup.mjs','utf8');
 for(const phase of ['DATABASE_PREFLIGHT_OK','DRIVE_PREFLIGHT_OK','EXPORT_UPLOAD_START','EXPORT_UPLOAD_COMPLETE','READBACK_START','READBACK_INTEGRITY_OK'])
  assert.ok(source.includes('KSOL_BACKUP_PHASE: '+phase),'missing safe phase '+phase);
 assert.match(source,/timeout:18\*60\*1000/);
 assert.match(source,/timeout:8\*60\*1000/);
 assert.match(source,/EXPORT_UPLOAD_STOPPED/);
 assert.match(source,/READBACK_STOPPED/);
 assert.doesNotMatch(source,/console\.log\([^\n]*(password|token|PGPASSWORD)/i);
});

test('readback keeps draining cloud bytes when pg_restore finishes listing early',async()=>{
 const payload=['archive-header','archive-data','archive-trailer'];
 async function* streamChunks(){
  for(const item of payload){
   yield Buffer.from(item);
   await new Promise(resolve=>setImmediate(resolve));
  }
 }
 const source=Readable.from(streamChunks());
 let checkedBytes=0;
 source.on('data',chunk=>{checkedBytes+=chunk.length;});
 const tocInput=new Writable({
  write(_chunk,_enc,done){done();this.destroy();}
 });
 const hadInputError=drainAfterTocInputCloses(source,tocInput);
 source.pipe(tocInput);
 await once(source,'end');
 assert.equal(checkedBytes,payload.join('').length);
 assert.equal(hadInputError(),false);
});

test('production source accepts only its own exact project and session pooler identity',()=>{
 const prod={...base,KSOL_DB_HOST:'db.'+PROJECT_REFS.production+'.supabase.co'};
 assert.equal(validateCloudSettings('production',prod).ok,true);
 assert.equal(validateCloudSettings('preview',prod).ok,false);
 const pool={...prod,KSOL_DB_HOST:'aws-0-ap-south-1.pooler.supabase.com',
  KSOL_DB_USER:'postgres.'+PROJECT_REFS.production};
 assert.equal(validateCloudSettings('production',pool).ok,true);
 assert.equal(validateCloudSettings('production',{...pool,KSOL_DB_USER:'postgres.'+PROJECT_REFS.preview}).ok,false);
 assert.equal(validateCloudSettings('production',{...pool,KSOL_DB_PORT:'6543'}).ok,false);
 assert.equal(validateCloudSettings('production',{...prod,KSOL_DB_PASSWORD:''}).ok,false);
});
test('production backup is manual or separately scheduled opt-in, main-only and does not reuse preview database credentials',()=>{
 const workflow=readFileSync('.github/workflows/ksol-production-cloud-encrypted-backup.yml','utf8');
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/^\s+(pull_request|push):/m);
 assert.match(workflow,/schedule:/);
 assert.ok(workflow.includes("github.event_name == 'schedule'"));
 assert.ok(workflow.includes("github.event_name == 'workflow_dispatch'"));
 assert.ok(workflow.includes("vars.KSOL_PRODUCTION_AUTO_BACKUP_ENABLED == 'true'"));
 assert.ok(workflow.includes("7 21 * * 6"));
 assert.match(workflow,/rclone about ksolcrypt:/);
 assert.match(workflow,/rclone size ksolcrypt:production\//);
 assert.doesNotMatch(workflow,/rclone (delete|purge|sync|move)/);
 assert.ok(workflow.includes("github.ref == 'refs/heads/main'"));
 assert.ok(workflow.includes("vars.KSOL_PRODUCTION_BACKUP_ENABLED == 'true'"));
 assert.ok(workflow.includes("inputs.acknowledgment == 'BACKUP_PRODUCTION_READ_ONLY'"));
 for(const name of ['HOST','PORT','USER','NAME','PASSWORD'])
  assert.ok(workflow.includes('secrets.KSOL_PRODUCTION_DB_'+name));
 assert.doesNotMatch(workflow,/secrets\.KSOL_PREVIEW_DB_|secrets\.KSOL_DB_/);
 assert.match(workflow,/persist-credentials: false/);
 assert.match(workflow,/--source production/);
 assert.doesNotMatch(workflow,/pg_restore|--source preview/);
});

test('Production storage export is explicitly opt-in, fixed-source and encrypted',()=>{
 const workflow=readFileSync('.github/workflows/ksol-production-storage-backup.yml','utf8');
 const code=readFileSync('scripts/recovery/backup-production-storage.mjs','utf8');
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/^\s+(pull_request|push):/m);
 assert.match(workflow,/schedule:/);
 assert.ok(workflow.includes('7 22 * * 6'));
 assert.ok(workflow.includes("vars.KSOL_PRODUCTION_STORAGE_AUTO_BACKUP_ENABLED == 'true'"));
 assert.ok(workflow.includes("github.event_name == 'workflow_dispatch'"));
 assert.ok(workflow.includes("github.event_name == 'schedule'"));
 assert.match(code,/scheduled\?128:512/);
 assert.match(code,/if\(scheduled\)scheduledQuotaPreflight\(drive,first.bytes\)/);
 assert.match(code,/capacity\.free<reserve\+estimated/);
 assert.match(code,/usage\.bytes\+estimated>reserve/);
 assert.ok(workflow.includes("github.ref == 'refs/heads/main'"));
 assert.ok(workflow.includes("vars.KSOL_PRODUCTION_STORAGE_BACKUP_ENABLED == 'true'"));
 assert.ok(workflow.includes('BACKUP_PRODUCTION_STORAGE_READ_ONLY'));
 assert.match(code,/PROJECT_REFS\.production/);
 assert.match(code,/isCryptRemote\(config,'ksolcrypt'\)/);
 assert.match(code,/digest!==readback/);
 assert.match(code,/digest!==reread/);
 assert.match(code,/JSON\.stringify\(first\)!==JSON\.stringify\(inventory\(\)\)/);
 assert.match(code,/FULL_SUPABASE_RESTORE=NOT_VERIFIED/);
 assert.doesNotMatch(code,/writeFileSync|\['sync'|\['delete'|\['purge'|\['move'/);
});

test('Storage manifest verification rejects invalid object identity, duplicates and byte totals',async()=>{
 const {validateManifest}=await import('../scripts/recovery/verify-production-storage-archive.mjs');
 const {createHash}=await import('node:crypto');
 const {PROJECT_REFS}=await import('../scripts/recovery/cloud-stream-backup.mjs');
 const obj={bucket:'synthetic',key:'sample.txt',size:3,sha256:createHash('sha256').update('abc').digest('hex')};
 obj.id=createHash('sha256').update(JSON.stringify([obj.bucket,obj.key])).digest('hex');
 const valid={version:1,project:PROJECT_REFS.production,scope:'STORAGE_OBJECT_BYTES_ONLY',
  buckets:['synthetic'],objects:[obj],bytes:3};
 assert.equal(validateManifest(valid).size,1);
 assert.throws(()=>validateManifest({...valid,bytes:4}));
 assert.throws(()=>validateManifest({...valid,objects:[obj,obj],bytes:6}));
 assert.throws(()=>validateManifest({...valid,objects:[{...obj,key:'../escape'}]}));
 assert.throws(()=>validateManifest({...valid,objects:[{...obj,sha256:'bad'}]}));
 assert.throws(()=>validateManifest({...valid,project:PROJECT_REFS.preview}));
 assert.throws(()=>validateManifest({...valid,objects:[{...obj,id:'other'}]}));
});

test('Storage reconciliation requires exact bucket, key and byte size matches',async()=>{
 const {storageMetadataMatches}=await import('../scripts/recovery/reconcile-production-storage-metadata.mjs');
 const {createHash}=await import('node:crypto');
 const {PROJECT_REFS}=await import('../scripts/recovery/cloud-stream-backup.mjs');
 const obj={bucket:'test-bucket',key:'file.txt',size:3,sha256:createHash('sha256').update('abc').digest('hex')};
 obj.id=createHash('sha256').update(JSON.stringify([obj.bucket,obj.key])).digest('hex');
 const manifest={version:1,project:PROJECT_REFS.production,scope:'STORAGE_OBJECT_BYTES_ONLY',buckets:[obj.bucket],objects:[obj],bytes:3};
 const metadata={buckets:[obj.bucket],objects:[{bucket:obj.bucket,key:obj.key,size:'3'}]};
 assert.equal(storageMetadataMatches(manifest,metadata),true);
 assert.equal(storageMetadataMatches(manifest,{...metadata,objects:[{...metadata.objects[0],size:'4'}]}),false);
 assert.equal(storageMetadataMatches(manifest,{...metadata,objects:[{...metadata.objects[0],size:null}]}),false);
 assert.equal(storageMetadataMatches(manifest,{...metadata,objects:[]}),false);
 assert.equal(storageMetadataMatches(manifest,{...metadata,buckets:['wrong']}),false);
 assert.equal(storageMetadataMatches(manifest,{...metadata,objects:[{...metadata.objects[0],key:'wrong'}]}),false);
});

test('backup subprocesses receive only their own service credentials',async()=>{
 const {splitBackupEnvironments}=await import('../scripts/recovery/cloud-stream-backup.mjs');
 const {pgEnv,cloudEnv,tocEnv}=splitBackupEnvironments({
  PATH:'/synthetic',KSOL_DB_PASSWORD:'synthetic-db',KSOL_PRODUCTION_DB_PASSWORD:'synthetic-db',
  RCLONE_CONFIG:'/synthetic-config',RCLONE_CONFIG_PASS:'synthetic-cloud',
  PGOPTIONS:'synthetic-override',KSOL_PRODUCTION_S3_SECRET_ACCESS_KEY:'synthetic-s3'});
 assert.equal(pgEnv.PGPASSWORD,'synthetic-db');
 assert.equal(pgEnv.RCLONE_CONFIG_PASS,undefined);
 assert.equal(pgEnv.PGOPTIONS,undefined);
 assert.equal(cloudEnv.RCLONE_CONFIG_PASS,'synthetic-cloud');
 assert.equal(cloudEnv.PGPASSWORD,undefined);
 assert.equal(cloudEnv.KSOL_DB_PASSWORD,undefined);
 assert.equal(cloudEnv.KSOL_PRODUCTION_DB_PASSWORD,undefined);
 assert.equal(cloudEnv.KSOL_PRODUCTION_S3_SECRET_ACCESS_KEY,undefined);
 assert.deepEqual(tocEnv,{PATH:'/synthetic'});
});

test('local Storage payload restore is restricted to a fresh loopback target and verifies bytes',async()=>{
 const {objectPath,exactBytes}=await import('../scripts/recovery/restore-storage-to-local-supabase.mjs');
 const {createHash}=await import('node:crypto');
 const bytes=Buffer.from('synthetic fixture');
 const record={size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 assert.equal(exactBytes(bytes,record),true);
 assert.equal(exactBytes(Buffer.from('synthetic fail!!!'),record),false);
 assert.equal(objectPath('test-bucket','folder/a b#%.pdf'),'object/test-bucket/folder/a%20b%23%25.pdf');
 for(const invalid of ['../bad','a//b','a/./b','a/../b'])assert.throws(()=>objectPath('test-bucket',invalid));
 const code=readFileSync('scripts/recovery/restore-storage-to-local-supabase.mjs','utf8');
 assert.ok(code.includes("http://127.0.0.1:54321/storage/v1/"));
 assert.ok(code.includes("redirect:'error'"));
 assert.ok(code.includes("existing.length"));
 assert.ok(code.includes("public:false"));
 assert.ok(code.includes("'x-upsert':'false'"));
 assert.ok(code.includes("FULL_SUPABASE_RESTORE=NOT_VERIFIED"));
 assert.doesNotMatch(code,/supabase\.co|secrets\.KSOL_PRODUCTION/);
});
