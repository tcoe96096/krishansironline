#!/usr/bin/env node
/**
 * Creates a READ-ONLY PostgreSQL custom dump from a separately configured source.
 * The Windows wrapper verifies local volume encryption and supplies credentials
 * using same-user DPAPI. NEVER call from CI. NEVER connects to a restore target.
 */
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream,existsSync,mkdirSync,renameSync,statSync,openSync,readSync,closeSync,writeFileSync,unlinkSync,realpathSync} from 'node:fs';
import {join,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';

export const PROJECT_REFS=Object.freeze({
  preview:'zgpkmfqioqvincmgyfpi',
  production:'vsqwlkqqsxcehvdsdbna'
});
const SUPPORTED_SOURCES=new Set(Object.keys(PROJECT_REFS));
const REQUIRED_TABLE_DATA=['auth users','storage objects','public student_profiles','public test_attempts'];
export function assessSource(config) {
  const errors=[];
  const source=String(config.source||'');
  const host=String(config.host||'').toLowerCase().trim();
  const username=String(config.username||'').toLowerCase().trim();
  const db=String(config.database||'');
  const port=Number(config.port);
  if(!SUPPORTED_SOURCES.has(source)) errors.push('Source must be explicit preview or production');
  const ref=PROJECT_REFS[source];
  if(!host.endsWith('.supabase.co')) errors.push('Only a hosted Supabase connection is accepted');
  if(ref && !(host.includes(ref)||username.includes(ref))) errors.push('Supabase project reference does not match the selected source');
  if(!/^[\w.-]{1,80}$/.test(db)) errors.push('Invalid database name');
  if(!Number.isInteger(port)||port<1||port>65535) errors.push('Invalid port');
  if(username.length===0||username.length>150) errors.push('Invalid database user');
  return {ok:errors.length===0,errors,projectRef:ref??null};
}
export function checkArchiveListing(text) {
  // PostgreSQL TOC lines: TABLE DATA schema table ... ; do not inspect actual rows.
  const found=REQUIRED_TABLE_DATA.filter(label=>{
    const [schema,table]=label.split(' ');
    const re=new RegExp('(?:^|\\n)\\s*\\d+;[^\\n]*\\bTABLE DATA\\s+'+schema+'\\s+'+table+'(?:\\s|\\n)','i');
    return re.test(text);
  });
  return {complete:found.length===REQUIRED_TABLE_DATA.length,found,missing:REQUIRED_TABLE_DATA.filter(x=>!found.includes(x))};
}
function readArg(argv,name) {
 const i=argv.indexOf(name);
 if(i<0||!argv[i+1]||argv[i+1].startsWith('--'))throw new Error('Missing '+name);
 return argv[i+1];
}
function ensurePrivateRoot(root){
 if(!existsSync(root)||!statSync(root).isDirectory())throw new Error('Backup root is missing');
 const actual=realpathSync(root);
 if(actual!==resolve(root))throw new Error('Backup root must not be redirected');
 return actual;
}
async function sha256(path){
 const h=createHash('sha256');
 for await(const chunk of createReadStream(path))h.update(chunk);
 return h.digest('hex');
}
export async function createVerifiedBackup({root,source,now=new Date(),environment=process.env,run=spawnSync}){
 if(environment.KSOL_STORAGE_ENCRYPTED!=='verified-by-windows-wrapper')
   throw new Error('Encrypted backup volume has not been verified by the Windows setup');
 const config={source,host:environment.KSOL_DB_HOST,username:environment.KSOL_DB_USER,
   database:environment.KSOL_DB_NAME,port:environment.KSOL_DB_PORT};
 const evaluated=assessSource(config);
 if(!evaluated.ok)throw new Error(evaluated.errors.join('; '));
 if(!environment.KSOL_DB_PASSWORD)throw new Error('Backup credential has not been configured locally');
 const base=ensurePrivateRoot(root);
 const destination=join(base,'09-Automated-Backups');
 const reports=join(base,'07-Recovery-Reports');
 mkdirSync(destination,{recursive:true,mode:0o700});
 mkdirSync(reports,{recursive:true,mode:0o700});
 const time=now.toISOString().replace(/[:.]/g,'-');
 const file=join(destination,'ksol-'+source+'-'+time+'-'+process.pid+'.dump');
 const tmp=file+'.partial';
 const childEnv={...environment,PGPASSWORD:environment.KSOL_DB_PASSWORD,PGCONNECT_TIMEOUT:'20'};
 delete childEnv.KSOL_DB_PASSWORD;
 // Do not put credentials or connection strings in process arguments or reports.
 let keepTmp=true;
 try {
   const cmd=['--no-password','--format=custom','--file',tmp,
    '--host',config.host,'--port',String(config.port),
    '--username',config.username,'--dbname',config.database];
   const exported=run('pg_dump',cmd,{env:childEnv,timeout:1800000,encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});
   if(exported.error||exported.status!==0||!existsSync(tmp))throw new Error('pg_dump failed (credentials, network or privileges); no verified backup was created');
   const stats=statSync(tmp);
   let fd;let header;
   try{fd=openSync(tmp,'r');header=Buffer.alloc(5);if(readSync(fd,header,0,5,0)!==5)throw new Error('Invalid short backup');}
   finally{if(fd!==undefined)closeSync(fd)}
   if(stats.size<=5||header.toString('ascii')!=='PGDMP')throw new Error('Backup is not a custom PostgreSQL archive');
   const listed=run('pg_restore',['--list',tmp],{env:childEnv,timeout:120000,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024});
   if(listed.error||listed.status!==0)throw new Error('pg_restore TOC verification failed');
   const coverage=checkArchiveListing(String(listed.stdout||''));
   const sha=await sha256(tmp);
   renameSync(tmp,file);keepTmp=false;
   const report={
     source,projectRef:evaluated.projectRef,createdAt:now.toISOString(),
     archiveName:basename(file),bytes:stats.size,sha256:sha,pgRestoreListPass:true,
     expectedTableData:coverage,backupStatus:coverage.complete?'READABLE_EXPORT_ONLY':'INCOMPLETE_EXPORT',
     restoreStatus:'NOT_VERIFIED',storageObjectBytesStatus:'NOT_VERIFIED',
     rolesAndAuthServicesStatus:'NOT_VERIFIED',releaseGate:'NO_GO',
     note:'Archive readability and table-data coverage never prove a complete Supabase restore.'
   };
   const reportPath=join(reports,'last-'+source+'-export.json');
   writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',mode:0o600});
   return {report,reportPath,archivePath:file};
 }finally{
   if(keepTmp&&existsSync(tmp))try{unlinkSync(tmp)}catch{}
 }
}
async function main(){
 try{
  const source=readArg(process.argv,'--source');
  const root=readArg(process.argv,'--root');
  const {report,reportPath}=await createVerifiedBackup({root,source});
  console.log('KSOL',source,'backup:',report.backupStatus,'; full restore:',report.restoreStatus,
    '; release:',report.releaseGate,'; local report:',reportPath);
  if(report.backupStatus!=='READABLE_EXPORT_ONLY')process.exitCode=1;
 }catch(e){
  console.error('KSOL backup not complete:',e instanceof Error?e.message:'Unexpected error');
  process.exitCode=2;
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
