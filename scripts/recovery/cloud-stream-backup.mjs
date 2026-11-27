#!/usr/bin/env node
/**
 * KSOL zero-extra-cost cloud backup transport (code-only until owner setup).
 * Streams a PostgreSQL custom archive directly into rclone's CRYPT remote:
 * no raw dump file is written to the local Windows disk or GitHub workspace.
 *
 * Does not restore, change cloud DB, grant access, delete or rotate backups.
 * Backup success is distinct from full recovery verification.
 */
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const PROJECT_REFS=Object.freeze({
 preview:'zgpkmfqioqvincmgyfpi',
 production:'vsqwlkqqsxcehvdsdbna'
});
const REQUIRED=['auth users','storage objects','public student_profiles','public test_attempts'];
export function validateCloudSettings(source,env,remote='ksolcrypt'){
 const errors=[];
 if(!Object.hasOwn(PROJECT_REFS,source))errors.push('Explicit preview or production source required');
 const ref=PROJECT_REFS[source];
 const host=String(env.KSOL_DB_HOST||'').trim().toLowerCase();
 const user=String(env.KSOL_DB_USER||'').trim();
 const port=Number(env.KSOL_DB_PORT);
 // Supabase shared Session Pooler is *.pooler.supabase.com:5432 (NOT *.supabase.co).
 // The pooler host is regional: the project reference is encoded in the USERNAME.
 const direct=Boolean(ref)&&host==='db.'+ref+'.supabase.co'&&user==='postgres'&&port===5432;
 const sessionPooler=Boolean(ref)&&/^[a-z0-9-]+[.]pooler[.]supabase[.]com$/.test(host)&&user==='postgres.'+ref&&port===5432;
 if(!direct&&!sessionPooler)errors.push('Source project identity, port or connection mode mismatch');
 if(!/^[a-zA-Z0-9_.-]{1,80}$/.test(String(env.KSOL_DB_NAME||'')))errors.push('Invalid database name');
 if(!Number.isInteger(port)||port<1||port>65535)errors.push('Invalid database port');
 if(!user||user.length>160)errors.push('Invalid database username');
 if(!env.KSOL_DB_PASSWORD)errors.push('Missing private database password');
 if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,50}$/.test(remote))errors.push('Invalid encrypted rclone remote name');
 return {ok:errors.length===0,errors,ref};
}
export function isCryptRemote(configText,name){
 // Never print this output: it can contain OAuth tokens and weakly obscured keys.
 let current='',crypt=false,baseRemote=false;
 const lines=String(configText).split(/\r?\n/);
 for(const line of lines){
   const heading=/^\[([^\]\n]+)\]\s*$/.exec(line);
   if(heading){current=heading[1];continue}
   if(current!==name)continue;
   if(/^\s*type\s*=\s*crypt\s*$/.test(line))crypt=true;
   if(/^\s*remote\s*=\s*[a-zA-Z][a-zA-Z0-9_-]*:[^\s]+\s*$/.test(line))baseRemote=true;
 }
 return crypt&&baseRemote;
}
export function assessDownloadedToc(text){
 const rows=REQUIRED.filter(label=>{
  const [schema,table]=label.split(' ');
  const re=new RegExp('(?:^|\\n)\\s*\\d+;[^\\n]*\\bTABLE DATA\\s+'+schema+'\\s+'+table+'(?:\\s|\\n)','i');
  return re.test(text);
 });
 return {tocCoverage:rows.length===REQUIRED.length,missingTables:REQUIRED.filter(x=>!rows.includes(x))};
}
// Diagnostic categories only: never forward stderr, URLs, passwords, tokens or SQL text into CI logs.
export function classifyBackupFailure(stderr){
 const msg=String(stderr||'').slice(0,32768).toLowerCase();
 if(/password authentication failed|invalid password|password failed|no password supplied/.test(msg))return 'DATABASE_AUTH';
 if(/could not translate host name|name or service not known|no such host|temporary failure in name resolution/.test(msg))return 'DNS_HOST';
 if(/connection timed out|i\/o timeout|context deadline exceeded|operation timed out/.test(msg))return 'CONNECTION_TIMEOUT';
 if(/connection refused|server closed the connection|cannot connect/.test(msg))return 'CONNECTION_REFUSED';
 if(/permission denied|insufficient privilege|must be owner|not permitted/.test(msg))return 'DATABASE_PERMISSIONS';
 if(/server version mismatch|aborting because of server version mismatch/.test(msg))return 'POSTGRES_VERSION';
 if(/invalid_grant|invalid_client|unauthorized|token expired|invalid token|failed to refresh token|oauth|access_denied/.test(msg))return 'GOOGLE_AUTH';
 if(/quota exceeded|storage quota|insufficient storage|not enough storage/.test(msg))return 'DRIVE_QUOTA';
 if(/403 forbidden|forbidden|insufficient permissions/.test(msg))return 'ACCESS_DENIED';
 if(/ssl|certificate verify failed/.test(msg))return 'TLS_FAILURE';
 return 'UNCLASSIFIED';
}
function collectDiagnostic(stream){
 let stderr='';
 stream.on('data',chunk=>{
   const remaining=16384-stderr.length;
   if(remaining>0)stderr+=chunk.toString('utf8').slice(0,remaining);
 });
 return ()=>classifyBackupFailure(stderr);
}
// pg_restore --list may finish after only the archive header/TOC. Detach its
// stdin when it closes, but continue draining the full cloud stream for SHA-256.
// A closed TOC input must never make a successful readback look like a timeout.
export function drainAfterTocInputCloses(readable,tocInput){
 let unexpectedInputError=false;
 const detach=()=>{readable.unpipe(tocInput);readable.resume();};
 tocInput.once('close',detach);
 tocInput.on('error',err=>{
  if(err?.code!=='EPIPE'&&err?.code!=='ERR_STREAM_DESTROYED')
   unexpectedInputError=true;
  detach();
 });
 return ()=>unexpectedInputError;
}
function exited(child){
 return new Promise((resolvePromise,reject)=>{
  child.once('error',reject);
  child.once('close',(code,signal)=>resolvePromise({code,signal}));
 });
}
// Separate source and destination credentials in subprocess environments.
// Preserve OS/tool configuration, not the other service's credentials.
export function splitBackupEnvironments(env){
 const clean=Object.fromEntries(Object.entries(env).filter(([key])=>
  !/^(PG|KSOL_DB_|KSOL_PRODUCTION_DB_|KSOL_PREVIEW_DB_|KSOL_PRODUCTION_S3_|RCLONE)/i.test(key)));
 const pgEnv={...clean,PGPASSWORD:env.KSOL_DB_PASSWORD,PGCONNECT_TIMEOUT:'20',PGSSLMODE:'require'};
 const cloudEnv={...clean,...Object.fromEntries(Object.entries(env).filter(([key])=>/^RCLONE(?:_|$)/i.test(key)))};
 return {pgEnv,cloudEnv,tocEnv:clean};
}
export async function cloudEncryptedBackup({source,env=process.env,remote='ksolcrypt'}){
 const v=validateCloudSettings(source,env,remote);
 if(!v.ok)throw new Error(v.errors.join('; '));
 const {pgEnv,cloudEnv,tocEnv}=splitBackupEnvironments(env);
 const show=spawnSync('rclone',['config','show',remote],{env:cloudEnv,windowsHide:true,
  encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 if(show.error||show.status!==0||!isCryptRemote(show.stdout,remote))
   throw new Error('Private rclone remote MUST be a configured crypt overlay; upload aborted');
 const name='ksol-'+source+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid+'.dump';
 const target=remote+':'+source+'/'+name;
 console.log('KSOL_BACKUP_PHASE: CRYPT_CONFIG_VALIDATED');
 // Preflight must finish before opening a cloud object. It never prints credential-bearing stderr.
 const common=['--no-password','--host',env.KSOL_DB_HOST,'--port',String(env.KSOL_DB_PORT),
  '--username',env.KSOL_DB_USER,'--dbname',env.KSOL_DB_NAME];
 const dbCheck=spawnSync('psql',[...common,'--no-psqlrc','--tuples-only','--no-align','--command','SELECT 1'],{
  env:pgEnv,encoding:'utf8',timeout:45000,maxBuffer:131072,windowsHide:true});
 if(dbCheck.error||dbCheck.status!==0||dbCheck.stdout.trim()!=='1')
  throw new Error(source+' database preflight failed [DB_'+classifyBackupFailure(dbCheck.stderr)+']; no cloud upload attempted');
 console.log('KSOL_BACKUP_PHASE: DATABASE_PREFLIGHT_OK');
 const cloudCheck=spawnSync('rclone',['lsf',remote+':'],{
  env:cloudEnv,encoding:'utf8',timeout:45000,maxBuffer:131072,windowsHide:true});
 if(cloudCheck.error||cloudCheck.status!==0)
  throw new Error('Encrypted Drive preflight failed [CLOUD_'+classifyBackupFailure(cloudCheck.stderr)+']; no database export attempted');
 console.log('KSOL_BACKUP_PHASE: DRIVE_PREFLIGHT_OK');
 console.log('KSOL_BACKUP_PHASE: EXPORT_UPLOAD_START');
 const args=['--no-password','--format=custom',
  '--host',env.KSOL_DB_HOST,'--port',String(env.KSOL_DB_PORT),
  '--username',env.KSOL_DB_USER,'--dbname',env.KSOL_DB_NAME];
 const pg=spawn('pg_dump',args,{env:pgEnv,stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:18*60*1000});
 const put=spawn('rclone',['rcat',target],{env:cloudEnv,stdio:['pipe','ignore','pipe'],windowsHide:true,timeout:18*60*1000});
 let bytes=0;const digest=createHash('sha256');
 pg.stdout.on('data',chunk=>{bytes+=chunk.length;digest.update(chunk)});
 pg.stdout.pipe(put.stdin);
 // Do not dump stderr content into logs; CLI can print connection details.
 const pgDiagnostic=collectDiagnostic(pg.stderr);
 const uploadDiagnostic=collectDiagnostic(put.stderr);
 put.stdin.on('error',()=>{try{pg.kill()}catch{}});
 const [dumpResult,uploadResult]=await Promise.all([exited(pg),exited(put)]);
 if(dumpResult.signal||uploadResult.signal)
  throw new Error('Export/upload subprocess timed out or was terminated [EXPORT_UPLOAD_STOPPED]; no verified backup');
 if(dumpResult.code!==0||uploadResult.code!==0||bytes<=5){
  const phase=dumpResult.code!==0?'PG_DUMP':'RCLONE_UPLOAD';
  const code=dumpResult.code!==0?pgDiagnostic():uploadDiagnostic();
  throw new Error('Database export/upload failed ['+phase+':'+code+']; any incomplete remote object is NOT a recoverable backup');
 }
 const expectedDigest=digest.digest('hex');
 console.log('KSOL_BACKUP_PHASE: EXPORT_UPLOAD_COMPLETE');
 console.log('KSOL_BACKUP_PHASE: READBACK_START');
 // Read BACK the decrypted cloud object only through memory to confirm its
 // integrity and archive TOC. Never cache raw records, data or backup bytes.
 const read=spawn('rclone',['cat',target],{env:cloudEnv,stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:8*60*1000});
 const toc=spawn('pg_restore',['--list'],{env:tocEnv,stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:8*60*1000});
 let checkedBytes=0,checkedText='',overflow=false;const checkedHash=createHash('sha256');
 read.stdout.on('data',chunk=>{checkedBytes+=chunk.length;checkedHash.update(chunk)});
 const tocInputError=drainAfterTocInputCloses(read.stdout,toc.stdin);
 read.stdout.pipe(toc.stdin);
 toc.stdout.on('data',chunk=>{
  if(checkedText.length+chunk.length>32*1024*1024){overflow=true;toc.kill();return}
  checkedText+=chunk.toString('utf8');
 });
 // Classify errors without printing raw stderr (which may contain private URLs).
 const readDiagnostic=collectDiagnostic(read.stderr);
 const tocDiagnostic=collectDiagnostic(toc.stderr);
 let tocPhase='RUNNING';
 toc.once('close',(code,signal)=>{tocPhase=signal?'STOPPED':code===0?'OK':'FAILED';});
 const progress=setInterval(()=>{
  console.log('KSOL_BACKUP_PHASE: READBACK_PROGRESS bytes='+checkedBytes+' toc='+tocPhase);
 },30000);
 let readResult,tocResult;
 try{
  [readResult,tocResult]=await Promise.all([exited(read),exited(toc)]);
 }finally{clearInterval(progress);}
 if(readResult.signal||tocResult.signal){
  const phase=readResult.signal?'CLOUD_DOWNLOAD':'ARCHIVE_TOC';
  throw new Error('Cloud readback/TOC subprocess timed out or was terminated [READBACK_STOPPED:'+phase+']; no verified backup');
 }
 if(readResult.code!==0||tocResult.code!==0||overflow||tocInputError()||
    checkedBytes!==bytes||checkedHash.digest('hex')!==expectedDigest){
  const phase=readResult.code!==0?'CLOUD_DOWNLOAD:'+readDiagnostic():
   tocResult.code!==0?'ARCHIVE_TOC:'+tocDiagnostic():
   overflow?'ARCHIVE_TOC_OVERFLOW':tocInputError()?'ARCHIVE_TOC_PIPE':'CHECKSUM_MISMATCH';
  console.error('KSOL_BACKUP_DIAGNOSTIC: cloud_exit='+String(readResult.code)+' toc_exit='+String(tocResult.code)+' bytes_match='+(checkedBytes===bytes)+' toc_overflow='+overflow+' toc_pipe_error='+tocInputError());
  throw new Error('Encrypted cloud download/readback verification failed ['+phase+']; do not claim backup ready');
 }
 console.log('KSOL_BACKUP_PHASE: READBACK_INTEGRITY_OK');
 const coverage=assessDownloadedToc(checkedText);
 // A Production archive is eligible for isolated restore only after full
 // decrypted readback, matching digest, and expected table-data coverage.
 // Leave failed/partial uploads unmarked; never delete or rotate objects here.
 if(source==='production'&&coverage.tocCoverage){
  const marker=JSON.stringify({version:1,source,ref:v.ref,archive:name,
   bytes:checkedBytes,sha256:expectedDigest,scope:'READABLE_ARCHIVE_ONLY'})+'\n';
  const mark=spawnSync('rclone',['rcat',target+'.verified.json','--size',String(Buffer.byteLength(marker))],
   {env:cloudEnv,input:marker,encoding:'utf8',timeout:60000,maxBuffer:131072,windowsHide:true});
  if(mark.error||mark.status!==0)throw new Error('Production verification marker upload failed; archive not eligible for automated restore');
  const check=spawnSync('rclone',['cat',target+'.verified.json'],{env:cloudEnv,encoding:'utf8',
   timeout:60000,maxBuffer:131072,windowsHide:true});
  if(check.error||check.status!==0||check.stdout!==marker)
   throw new Error('Production verification marker readback failed; archive not eligible for automated restore');
  console.log('KSOL_BACKUP_PHASE: PRODUCTION_VERIFICATION_MARKER_OK');
 }
 return {
   source,ref:v.ref,encryptedCloudUpload:'READBACK_VERIFIED',
   checkedBytes,sha256:expectedDigest,tocCoverage:coverage.tocCoverage,missingTables:coverage.missingTables,
   backupStatus:coverage.tocCoverage?'READABLE_ARCHIVE_ONLY':'MISSING_EXPECTED_TABLE_DATA',
   fullSupabaseRestore:'NOT_VERIFIED',storageObjectBytes:'NOT_VERIFIED',releaseGate:'NO_GO',
   note:'No plaintext archive stored locally. Encrypted object in private Drive; no full Supabase restore proven.'
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const i=process.argv.indexOf('--source');
  if(i<0||!process.argv[i+1])throw new Error('Usage: cloud-stream-backup.mjs --source preview|production');
  const report=await cloudEncryptedBackup({source:process.argv[i+1]});
  // No filename or object identifier in CI stdout.
  console.log('KSOL',report.source,'encrypted cloud backup:',report.backupStatus,
    '| full restore:',report.fullSupabaseRestore,'| release:',report.releaseGate);
  if(report.backupStatus!=='READABLE_ARCHIVE_ONLY')process.exitCode=1;
 }catch(e){
  console.error('KSOL private cloud backup failed:',e instanceof Error?e.message:'Unexpected error');
  process.exitCode=2;
 }
}
