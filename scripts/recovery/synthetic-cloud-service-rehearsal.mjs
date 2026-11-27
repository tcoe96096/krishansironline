#!/usr/bin/env node
// Synthetic-only service rehearsal. Never read Production archives or secrets.
import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {PROJECT_REFS} from './cloud-stream-backup.mjs';
const fixture='ksol-synthetic-recovery';
const bytes=Buffer.from('KSOL synthetic recovery fixture\n');
const sha256=createHash('sha256').update(bytes).digest('hex');
const record={bucket:fixture,key:'folder/sample.txt',size:bytes.length,sha256};
record.id=createHash('sha256').update(JSON.stringify([record.bucket,record.key])).digest('hex');
const prefix='ksolcrypt:production-storage/2026-11-27T00-00-00-000Z-00000000-0000-4000-8000-000000000000/';
const env={PATH:process.env.PATH,HOME:process.env.HOME,RCLONE_CONFIG:process.env.RCLONE_CONFIG};
function command(program,args,input,extra={}){
 const r=spawnSync(program,args,{input,env:{...env,...extra},timeout:120000,stdio:['pipe','pipe','ignore']});
 if(r.error||r.status!==0)throw Error('Synthetic command failed');
 return r.stdout;
}
async function main(){
 if(process.env.KSOL_SYNTHETIC_REHEARSAL!=='true'||!env.RCLONE_CONFIG||
    !process.env.KSOL_LOCAL_STORAGE_SERVICE_KEY||!process.env.KSOL_LOCAL_ANON_KEY)throw Error('Synthetic configuration missing');
 const service=process.env.KSOL_LOCAL_STORAGE_SERVICE_KEY,anon=process.env.KSOL_LOCAL_ANON_KEY;
 const base='http://127.0.0.1:54321';
 const manifest={version:1,project:PROJECT_REFS.production,scope:'STORAGE_OBJECT_BYTES_ONLY',buckets:[fixture],objects:[record],bytes:record.size};
 command('rclone',['rcat',prefix+'objects/'+record.id],bytes);
 command('rclone',['rcat',prefix+'manifest.json'],Buffer.from(JSON.stringify(manifest)));
 const restore=command(process.execPath,['scripts/recovery/restore-storage-to-local-supabase.mjs'],undefined,{
  KSOL_LOCAL_STORAGE_RESTORE_ACK:'RESTORE_TO_FRESH_ENCRYPTED_LOCAL_STACK_ONLY',KSOL_LOCAL_STORAGE_SERVICE_KEY:service});
 if(!restore.toString().includes('LOCAL_STORAGE_PAYLOAD_RESTORE=VERIFIED'))throw Error('Synthetic restore marker missing');
 async function request(path,key,token=key,method='GET',body){
  return fetch(base+path,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{
    apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 }
 const email='recovery-'+randomBytes(8).toString('hex')+'@example.invalid';
 const password=randomBytes(24).toString('hex');
 const created=await request('/auth/v1/admin/users',service,service,'POST',{email,password,email_confirm:true});
 if(!created.ok)throw Error('Synthetic Auth user creation failed');
 const account=await created.json();
 const login=await request('/auth/v1/token?grant_type=password',anon,anon,'POST',{email,password});
 if(!login.ok)throw Error('Synthetic Auth login failed');
 const session=await login.json();
 if(!session.access_token||!session.refresh_token||session.user?.id!==account.id)throw Error('Synthetic Auth session invalid');
 const refreshed=await request('/auth/v1/token?grant_type=refresh_token',anon,anon,'POST',{refresh_token:session.refresh_token});
 if(!refreshed.ok)throw Error('Synthetic Auth refresh failed');
 const next=await refreshed.json();
 if(!next.access_token||next.user?.id!==account.id)throw Error('Synthetic Auth refresh invalid');
 const bad=await request('/auth/v1/token?grant_type=password',anon,anon,'POST',{email,password:password+'bad'});
 if(bad.ok)throw Error('Invalid credentials accepted');
 const path='/storage/v1/object/authenticated/'+fixture+'/folder/sample.txt';
 for(const token of [anon,next.access_token]){
  const denied=await request(path,anon,token);
  if(denied.ok||![400,401,403,404].includes(denied.status))throw Error('Unexpected private object access result');
  await denied.body?.cancel();
 }
 const logout=await request('/auth/v1/logout',anon,next.access_token,'POST');
 if(!logout.ok)throw Error('Synthetic Auth logout failed');
 console.log('SYNTHETIC_CLOUD_STORAGE_SERVICE_RESTORE=VERIFIED');
 console.log('SYNTHETIC_CLOUD_AUTH_LOGIN_REFRESH_LOGOUT=VERIFIED');
 console.log('SYNTHETIC_PRIVATE_STORAGE_DENIAL=VERIFIED');
 console.log('PRODUCTION_FULL_RESTORE=NOT_VERIFIED');
}
main().catch(()=>{console.error('SYNTHETIC_CLOUD_SERVICE_REHEARSAL_FAILED');process.exitCode=2});
