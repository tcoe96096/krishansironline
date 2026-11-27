#!/usr/bin/env node
// Production Storage object-byte export only. No writes to Supabase.
// Streams through memory to a separate encrypted Drive namespace.
import {spawn,spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {PROJECT_REFS,isCryptRemote} from './cloud-stream-backup.mjs';

const source='ksolprodstorage:';
const crypt='ksolcrypt:';
const scheduled=process.env.GITHUB_EVENT_NAME==='schedule';
const limit=(scheduled?128:512)*1024*1024; // scheduled runs have stricter source-byte cap
const maxObjects=10000;
const timeout=120000;
const cloudEnv=Object.fromEntries(Object.entries(process.env).filter(([k])=>
 !k.startsWith('KSOL_PRODUCTION_S3_')&&!k.startsWith('RCLONE_CONFIG_')));
if(process.env.RCLONE_CONFIG_PASS)cloudEnv.RCLONE_CONFIG_PASS=process.env.RCLONE_CONFIG_PASS;
const sourceEnv={...cloudEnv,
 RCLONE_CONFIG_KSOLPRODSTORAGE_TYPE:'s3',
 RCLONE_CONFIG_KSOLPRODSTORAGE_PROVIDER:'Other',
 RCLONE_CONFIG_KSOLPRODSTORAGE_ENV_AUTH:'false',
 RCLONE_CONFIG_KSOLPRODSTORAGE_ACCESS_KEY_ID:process.env.KSOL_PRODUCTION_S3_ACCESS_KEY_ID||'',
 RCLONE_CONFIG_KSOLPRODSTORAGE_SECRET_ACCESS_KEY:process.env.KSOL_PRODUCTION_S3_SECRET_ACCESS_KEY||'',
 RCLONE_CONFIG_KSOLPRODSTORAGE_REGION:process.env.KSOL_PRODUCTION_S3_REGION||'',
 RCLONE_CONFIG_KSOLPRODSTORAGE_ENDPOINT:'https://'+PROJECT_REFS.production+'.storage.supabase.co/storage/v1/s3',
 RCLONE_CONFIG_KSOLPRODSTORAGE_FORCE_PATH_STYLE:'true',
 RCLONE_CONFIG_KSOLPRODSTORAGE_LIST_VERSION:'2',
 RCLONE_CONFIG_KSOLPRODSTORAGE_NO_CHECK_BUCKET:'true'};
function cmd(args,env=cloudEnv,input){
 const r=spawnSync('rclone',args,{env,input,encoding:'utf8',timeout,maxBuffer:16*1024*1024});
 if(r.error||r.status!==0)throw Error('Storage command failed');
 return r.stdout;
}
function validateDestination(){
 const config=cmd(['config','show','ksolcrypt']);
 if(!isCryptRemote(config,'ksolcrypt'))throw Error('Crypt remote required');
 const base=/^\s*remote\s*=\s*([a-zA-Z][a-zA-Z0-9_-]*):[^\n]+$/m.exec(config)?.[1];
 if(!base||base.toLowerCase()==='ksolprodstorage'||
    !/^\s*type\s*=\s*drive\s*$/m.test(cmd(['config','show',base])))
  throw Error('Encrypted Google Drive destination required');
 return base;
}
function scheduledQuotaPreflight(base,bytes){
 const capacity=JSON.parse(cmd(['about',base+':','--json']));
 const usage=JSON.parse(cmd(['size',crypt+'production-storage/','--json']));
 const reserve=1024*1024*1024;
 // Allow for encrypted object overhead and manifest; never prune existing backups.
 const estimated=bytes+16*1024*1024;
 if(!Number.isSafeInteger(capacity.free)||capacity.free<reserve+estimated||
    !Number.isSafeInteger(usage.bytes)||usage.bytes<0||usage.bytes+estimated>reserve)
  throw Error('Scheduled Storage quota preflight failed');
 console.log('STORAGE_SCHEDULED_QUOTA_PREFLIGHT=PASSED');
}
function validKey(key){
 return typeof key==='string'&&key.length>0&&key.length<=2048&&
  !/[\x00-\x1f\x7f\\]/.test(key)&&
  key.split('/').every(p=>p!==''&&p!=='.'&&p!=='..');
}
function inventory(){
 const buckets=JSON.parse(cmd(['lsjson',source,'--dirs-only','--max-depth','1'],sourceEnv))
  .map(x=>x.Path).sort();
 if(!buckets.length||new Set(buckets).size!==buckets.length)throw Error('Bucket list invalid');
 const objects=[];
 let bytes=0;
 for(const bucket of buckets){
  if(!validKey(bucket)||bucket.includes('/'))throw Error('Bucket invalid');
  const entries=JSON.parse(cmd(['lsjson',source+bucket,'--recursive','--files-only'],sourceEnv));
  for(const item of entries){
   if(!validKey(item.Path)||!Number.isSafeInteger(item.Size)||item.Size<0)
    throw Error('Object listing invalid');
   bytes+=item.Size;
   if(bytes>limit||objects.length>=maxObjects)throw Error('Run quota bound exceeded');
   objects.push({bucket,key:item.Path,size:item.Size,modTime:item.ModTime||''});
  }
 }
 objects.sort((a,b)=>JSON.stringify([a.bucket,a.key]).localeCompare(JSON.stringify([b.bucket,b.key]),'en'));
 if(new Set(objects.map(x=>JSON.stringify([x.bucket,x.key]))).size!==objects.length)
  throw Error('Duplicate object listing');
 return {buckets,objects,bytes};
}
function done(child){
 return new Promise((resolve,reject)=>{
  child.once('error',reject);
  child.once('close',(code,signal)=>resolve(code===0&&!signal));
 });
}
async function streamDigest(remotePath,env,expectedSize,destination){
 const reader=spawn('rclone',['cat',remotePath],{env,stdio:['ignore','pipe','ignore'],timeout});
 const readerDone=done(reader);
 const writer=destination?spawn('rclone',['rcat',destination,'--size',String(expectedSize)],
  {env:cloudEnv,stdio:['pipe','ignore','ignore'],timeout}):null;
 const writerDone=writer?done(writer):Promise.resolve(true);
 let count=0,failed=false;const hash=createHash('sha256');
 reader.stdout.on('data',chunk=>{
  count+=chunk.length;
  if(count>expectedSize){failed=true;reader.kill();writer?.kill();return}
  hash.update(chunk);
 });
 reader.stdout.on('error',()=>{failed=true;writer?.kill()});
 if(writer){
  writer.stdin.on('error',()=>{failed=true;reader.kill()});
  writer.once('close',()=>{if(!reader.stdout.readableEnded)reader.kill()});
  reader.stdout.pipe(writer.stdin);
 }else reader.stdout.resume();
 try{
  const [readOK,writeOK]=await Promise.all([readerDone,writerDone]);
  if(!readOK||!writeOK||failed||count!==expectedSize)throw Error('Storage byte stream failed');
  return hash.digest('hex');
 }finally{
  if(reader.exitCode===null)reader.kill();
  if(writer&&writer.exitCode===null)writer.kill();
 }
}
async function main(){
 if(process.env.KSOL_STORAGE_BACKUP_ACK!=='BACKUP_PRODUCTION_STORAGE_READ_ONLY')
  throw Error('Explicit acknowledgment required');
 if(!sourceEnv.RCLONE_CONFIG_KSOLPRODSTORAGE_ACCESS_KEY_ID||
    !sourceEnv.RCLONE_CONFIG_KSOLPRODSTORAGE_SECRET_ACCESS_KEY||
    !/^[a-z0-9-]{2,40}$/.test(sourceEnv.RCLONE_CONFIG_KSOLPRODSTORAGE_REGION))
  throw Error('Production S3 configuration required');
 const drive=validateDestination();
 const first=inventory();
 if(scheduled)scheduledQuotaPreflight(drive,first.bytes);
 // A unique immutable run namespace; no delete/sync/overwrite of prior backups.
 const root=crypt+'production-storage/'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()+'/';
 const records=[];
 for(const obj of first.objects){
  // Object keys only in encrypted manifest; opaque names for archived bytes.
  const id=createHash('sha256').update(JSON.stringify([obj.bucket,obj.key])).digest('hex');
  const destination=root+'objects/'+id;
  const origin=source+obj.bucket+'/'+obj.key;
  const digest=await streamDigest(origin,sourceEnv,obj.size,destination);
  const readback=await streamDigest(destination,cloudEnv,obj.size);
  if(digest!==readback)throw Error('Encrypted object checksum mismatch');
  const reread=await streamDigest(origin,sourceEnv,obj.size);
  if(digest!==reread)throw Error('Source object changed during backup');
  records.push({...obj,id,sha256:digest});
 }
 if(JSON.stringify(first)!==JSON.stringify(inventory()))throw Error('Source listing changed');
 const manifest=JSON.stringify({version:1,project:PROJECT_REFS.production,
  scope:'STORAGE_OBJECT_BYTES_ONLY',buckets:first.buckets,objects:records,bytes:first.bytes})+'\n';
 const path=root+'manifest.json';
 cmd(['rcat',path,'--size',String(Buffer.byteLength(manifest))],cloudEnv,manifest);
 if(cmd(['cat',path])!==manifest)throw Error('Manifest readback mismatch');
 // No full or point-in-time snapshot claim: separate DB/auth and restore checks needed.
 console.log('PRODUCTION_STORAGE_OBJECT_BYTES=READBACK_VERIFIED');
 console.log('STORAGE_OBJECT_COUNT='+records.length);
 console.log('FULL_SUPABASE_RESTORE=NOT_VERIFIED');
 console.log('RELEASE_GATE=NO_GO');
}
main().catch(()=>{console.error('PRODUCTION_STORAGE_BACKUP_NOT_VERIFIED');process.exitCode=2});
