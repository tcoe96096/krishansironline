#!/usr/bin/env node
// Independent Storage archive verification: encrypted Drive -> memory only.
// No source or target Supabase credentials. This is not a Storage service restore.
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PROJECT_REFS,isCryptRemote} from './cloud-stream-backup.mjs';

const root='ksolcrypt:production-storage/';
const runPattern=/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9-]{36}\/$/;
function read(args){
 const r=spawnSync('rclone',args,{encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});
 if(r.error||r.status!==0)throw Error('Encrypted archive read failed');
 return r.stdout;
}
function validKey(key){
 return typeof key==='string'&&key.length>0&&key.length<=2048&&
  !/[\x00-\x1f\x7f\\]/.test(key)&&key.split('/').every(p=>p!==''&&p!=='.'&&p!=='..');
}
export function validateManifest(m){
 if(m?.version!==1||m.project!==PROJECT_REFS.production||m.scope!=='STORAGE_OBJECT_BYTES_ONLY'||
  !Array.isArray(m.buckets)||!m.buckets.length||!Array.isArray(m.objects)||m.objects.length>10000||
  !m.buckets.every(b=>validKey(b)&&!b.includes('/'))||
  new Set(m.buckets).size!==m.buckets.length)throw Error('Invalid storage manifest');
 const ids=new Set();let bytes=0;
 for(const o of m.objects){
  if(!m.buckets.includes(o.bucket)||!validKey(o.key)||!Number.isSafeInteger(o.size)||o.size<0||
   !/^[a-f0-9]{64}$/.test(o.sha256)||
   o.id!==createHash('sha256').update(JSON.stringify([o.bucket,o.key])).digest('hex')||ids.has(o.id))
    throw Error('Invalid object record');
  ids.add(o.id);bytes+=o.size;
  if(bytes>512*1024*1024)throw Error('Archive exceeds verification bound');
 }
 if(bytes!==m.bytes)throw Error('Manifest total mismatch');
 return ids;
}
async function digest(path,size){
 const p=spawn('rclone',['cat',path],{stdio:['ignore','pipe','ignore'],timeout:120000});
 const hash=createHash('sha256');let count=0,tooLarge=false;
 p.stdout.on('data',chunk=>{
  count+=chunk.length;if(count>size){tooLarge=true;p.kill();return}hash.update(chunk);
 });
 const success=await new Promise((resolve,reject)=>{
  p.once('error',reject);p.once('close',(code,signal)=>resolve(code===0&&!signal));
 });
 if(!success||tooLarge||count!==size)throw Error('Archive byte count mismatch');
 return hash.digest('hex');
}
async function main(){
 if(process.env.KSOL_STORAGE_VERIFY_ACK!=='VERIFY_PRODUCTION_STORAGE_ARCHIVE_ONLY')
  throw Error('Explicit acknowledgment required');
 if(!isCryptRemote(read(['config','show','ksolcrypt']),'ksolcrypt'))throw Error('Crypt remote required');
 const runs=read(['lsf',root,'--dirs-only']).split(/\r?\n/).filter(n=>runPattern.test(n)).sort();
 const latest=runs.at(-1);
 if(!latest)throw Error('No archive run found');
 const prefix=root+latest;
 // Fail closed on an incomplete newest run, rather than silently using an older backup.
 const manifest=JSON.parse(read(['cat',prefix+'manifest.json']));
 const ids=validateManifest(manifest);
 if(ids.size){
  const names=read(['lsf',prefix+'objects/','--files-only']).split(/\r?\n/).filter(Boolean);
  if(names.length!==ids.size||new Set(names).size!==ids.size||names.some(n=>!ids.has(n)))
   throw Error('Archive object inventory mismatch');
 }
 for(const obj of manifest.objects)
  if(await digest(prefix+'objects/'+obj.id,obj.size)!==obj.sha256)
   throw Error('Archive object checksum mismatch');
 console.log('PRODUCTION_STORAGE_ARCHIVE_READBACK=VERIFIED');
 console.log('STORAGE_OBJECT_COUNT='+ids.size);
 console.log('STORAGE_SERVICE_RESTORE=NOT_VERIFIED');
 console.log('FULL_SUPABASE_RESTORE=NOT_VERIFIED');
 console.log('RELEASE_GATE=NO_GO');
}
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(()=>{console.error('PRODUCTION_STORAGE_ARCHIVE_NOT_VERIFIED');process.exitCode=2});
