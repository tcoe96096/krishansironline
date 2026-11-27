#!/usr/bin/env node
// Production-only encrypted archive restore. No live DB credentials or writes.
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PROJECT_REFS,isCryptRemote} from './cloud-stream-backup.mjs';

const remote='ksolcrypt';
const root=remote+':production/';
const pattern=/^ksol-production-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-\d+\.dump\.verified\.json$/;
function safeRead(args,maxBuffer=1024*1024){
 const p=spawnSync('rclone',args,{encoding:'utf8',timeout:60000,maxBuffer});
 if(p.error||p.status!==0)throw new Error('Encrypted remote read failed');
 return p.stdout;
}
function wait(child){
 return new Promise((resolve,reject)=>{
  child.once('error',reject);
  child.once('close',(code,signal)=>resolve(code===0&&!signal));
 });
}
async function run(){
 if(process.env.KSOL_PRODUCTION_ISOLATED_RESTORE_ACK!=='RESTORE_PRODUCTION_TO_DISPOSABLE_ONLY')
  throw new Error('Explicit isolated-only acknowledgment required');
 if(!isCryptRemote(safeRead(['config','show',remote]),remote))
  throw new Error('Encrypted remote validation failed');
 const markers=safeRead(['lsf',root,'--files-only']).split(/\r?\n/).filter(n=>pattern.test(n)).sort();
 const latest=markers.at(-1);
 if(!latest)throw new Error('No verified Production backup marker found');
 const marker=JSON.parse(safeRead(['cat',root+latest],131072));
 const archive=latest.slice(0,-'.verified.json'.length);
 if(marker.version!==1||marker.source!=='production'||marker.ref!==PROJECT_REFS.production||
    marker.archive!==archive||marker.scope!=='READABLE_ARCHIVE_ONLY'||
    !Number.isSafeInteger(marker.bytes)||marker.bytes<=5||
    !/^[a-f0-9]{64}$/.test(marker.sha256))
  throw new Error('Production marker invalid');
 // Hash every byte in the same stream sent to the networkless temporary DB.
 // A partial stream, failed restore, or checksum mismatch never passes.
 const childEnv={...process.env};
 for(const key of Object.keys(childEnv))
  if(/^(RCLONE|PG|KSOL_DB_|KSOL_PRODUCTION_DB_)/.test(key))delete childEnv[key];
 Object.assign(childEnv,{KSOL_DISPOSABLE_RESTORE_ACK:'I_UNDERSTAND_ISOLATED_ONLY',
  KSOL_EXPECT_SUPABASE_SCHEMA:'1',KSOL_VERIFY_EXAM_CATALOG:'1',KSOL_RESTORE_VERIFY_SCOPE:'full'});
 const read=spawn('rclone',['cat',root+archive],{stdio:['ignore','pipe','ignore'],timeout:18*60*1000});
 const restore=spawn('bash',['scripts/recovery/restore-archive-to-disposable-postgres.sh'],
  {env:childEnv,stdio:['pipe','inherit','inherit'],timeout:25*60*1000});
 const readDone=wait(read),restoreDone=wait(restore);
 const hash=createHash('sha256');let bytes=0,pipeFailed=false;
 read.stdout.on('data',chunk=>{bytes+=chunk.length;hash.update(chunk)});
 restore.stdin.on('error',()=>{pipeFailed=true;read.kill()});
 read.stdout.on('error',()=>{pipeFailed=true;restore.kill()});
 restore.once('close',()=>{if(!read.stdout.readableEnded)read.kill()});
 read.stdout.pipe(restore.stdin);
 try{
  const [readOK,restoreOK]=await Promise.all([readDone,restoreDone]);
  if(!readOK||!restoreOK||pipeFailed||bytes!==marker.bytes||hash.digest('hex')!==marker.sha256)
   throw new Error('Production isolated restore or archive integrity check failed');
 }finally{
  if(read.exitCode===null)read.kill();
  if(restore.exitCode===null)restore.kill();
 }
 console.log('PRODUCTION_ISOLATED_DATABASE_RESTORE=VERIFIED');
 console.log('FULL_SUPABASE_RESTORE=NOT_VERIFIED');
 console.log('RELEASE_GATE=NO_GO');
}
run().catch(()=>{console.error('PRODUCTION_ISOLATED_RESTORE_NOT_VERIFIED');process.exitCode=2});
