#!/usr/bin/env node
// Operator-run ONLY, on an encrypted disposable local Supabase stack.
// No Production or Preview connection, no GitHub workflow, no source writes.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isCryptRemote} from './cloud-stream-backup.mjs';
import {validateManifest} from './verify-production-storage-archive.mjs';

const BASE='http://127.0.0.1:54321/storage/v1/';
const ROOT='ksolcrypt:production-storage/';
const MAX_OBJECT=64*1024*1024;
const runPattern=/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9-]{36}\/$/;
export function objectPath(bucket,key){
 const segments=[bucket,...key.split('/')];
 if(!segments.every(x=>x&&x!=='.'&&x!=='..'&&!/[\\\x00-\x1f\x7f]/.test(x)))throw Error('Invalid object path');
 return 'object/'+segments.map(encodeURIComponent).join('/');
}
export function exactBytes(data,obj){
 return data.length===obj.size&&createHash('sha256').update(data).digest('hex')===obj.sha256;
}
function cloudRead(args,maxBuffer=16*1024*1024){
 const env={...process.env};
 delete env.KSOL_LOCAL_STORAGE_SERVICE_KEY;
 const r=spawnSync('rclone',args,{env,maxBuffer,timeout:120000,stdio:['ignore','pipe','ignore']});
 if(r.error||r.status!==0)throw Error('Archive read failed');
 return r.stdout;
}
async function run(){
 if(process.env.KSOL_LOCAL_STORAGE_RESTORE_ACK!=='RESTORE_TO_FRESH_ENCRYPTED_LOCAL_STACK_ONLY')
  throw Error('Local-only acknowledgment required');
 const key=process.env.KSOL_LOCAL_STORAGE_SERVICE_KEY;
 if(!key)throw Error('Local service key required');
 // Do not accept configurable hosts, follow redirects, or use live credentials.
 async function request(path,method='GET',body,headers={}){
  const url=new URL(path,BASE);
  if(url.origin!=='http://127.0.0.1:54321'||!url.pathname.startsWith('/storage/v1/'))
   throw Error('Nonlocal target rejected');
  const response=await fetch(url,{method,body,redirect:'error',signal:AbortSignal.timeout(120000),
   headers:{apikey:key,Authorization:'Bearer '+key,...headers}});
  if(!response.ok){await response.body?.cancel();throw Error('Local Storage operation failed')}
  return response;
 }
 if(!isCryptRemote(cloudRead(['config','show','ksolcrypt']).toString(),'ksolcrypt'))throw Error('Crypt remote required');
 const runs=cloudRead(['lsf',ROOT,'--dirs-only']).toString().split(/\r?\n/).filter(n=>runPattern.test(n)).sort();
 if(!runs.length)throw Error('No archive found');
 const selected=process.env.KSOL_LOCAL_STORAGE_ARCHIVE_RUN;
 if(typeof selected!=='string'||!runPattern.test(selected)||!runs.includes(selected))
  throw Error('Explicit verified Storage archive run required');
 const prefix=ROOT+selected;
 const manifest=JSON.parse(cloudRead(['cat',prefix+'manifest.json']).toString());
 const ids=validateManifest(manifest);
 if(manifest.objects.some(o=>o.size>MAX_OBJECT))throw Error('Local per-object memory bound exceeded');
 const names=ids.size?cloudRead(['lsf',prefix+'objects/','--files-only']).toString().split(/\r?\n/).filter(Boolean):[];
 if(names.length!==ids.size||new Set(names).size!==ids.size||names.some(n=>!ids.has(n)))throw Error('Archive inventory mismatch');
 const existing=await (await request('bucket')).json();
 if(!Array.isArray(existing)||existing.length)throw Error('Target must have no buckets');
 // Restore only byte payloads; do not invent original ACLs, owners or MIME metadata.
 for(const bucket of manifest.buckets){
  await (await request('bucket','POST',JSON.stringify({id:bucket,name:bucket,public:false}),
   {'Content-Type':'application/json'})).body?.cancel();
 }
 for(const obj of manifest.objects){
  const data=cloudRead(['cat',prefix+'objects/'+obj.id],MAX_OBJECT+1024);
  if(!exactBytes(data,obj))throw Error('Archive object failed integrity check');
  const path=objectPath(obj.bucket,obj.key);
  await (await request(path,'POST',data,{'Content-Type':'application/octet-stream','x-upsert':'false'})).body?.cancel();
  const response=await request('object/authenticated/'+path.slice('object/'.length));
  const hash=createHash('sha256');let size=0;
  for await(const chunk of response.body){
   size+=chunk.length;
   if(size>obj.size)throw Error('Restored object exceeds expected size');
   hash.update(chunk);
  }
  if(size!==obj.size||hash.digest('hex')!==obj.sha256)throw Error('Restored object checksum mismatch');
 }
 const buckets=await (await request('bucket')).json();
 if(!Array.isArray(buckets)||buckets.length!==manifest.buckets.length||
  buckets.some(b=>b.public!==false||!manifest.buckets.includes(b.id)))throw Error('Private bucket verification failed');
 console.log('LOCAL_STORAGE_PAYLOAD_RESTORE=VERIFIED');
 console.log('STORAGE_OBJECT_COUNT='+ids.size);
 console.log('ORIGINAL_STORAGE_PERMISSIONS_AND_METADATA=NOT_VERIFIED');
 console.log('AUTH_RUNTIME=NOT_VERIFIED');
 console.log('FULL_SUPABASE_RESTORE=NOT_VERIFIED');
 console.log('RELEASE_GATE=NO_GO');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 run().catch(()=>{console.error('LOCAL_STORAGE_PAYLOAD_RESTORE_NOT_VERIFIED');process.exitCode=2});
