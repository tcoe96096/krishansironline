#!/usr/bin/env node
/**
 * OFFLINE recovery dashboard. Reads only existing local export manifests and
 * dump bytes. It never tries a remote DB, a restore, a deployment or a merge.
 * A green backup result is never permission to publish production.
 */
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createReadStream,existsSync,lstatSync,readFileSync,mkdirSync,statSync,writeFileSync,openSync,readSync,closeSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PROJECT_REFS} from './create-verified-backup.mjs';

const AGE_LIMIT_HOURS=36;
const HASH=/^[a-f0-9]{64}$/i;
export function evaluateExportReport({source,report,archiveExists,archiveBytes,actualHash,archiveVerified=false,now=Date.now()}){
 const reasons=[];
 if(!report||typeof report!=='object'||Array.isArray(report))reasons.push('No local verified export report');
 else{
   if(report.source!==source||report.projectRef!==PROJECT_REFS[source])reasons.push('Source project mismatch');
   if(report.backupStatus!=='READABLE_EXPORT_ONLY'||report.pgRestoreListPass!==true ||
      report.expectedTableData?.complete!==true)reasons.push('Archive/table-data coverage not verified');
   if(!HASH.test(String(report.sha256||''))||report.sha256!==actualHash)reasons.push('Archive digest mismatch');
   if(!Number.isSafeInteger(report.bytes)||report.bytes!==archiveBytes)reasons.push('Archive length mismatch');
   const date=Date.parse(report.createdAt);
   const age=(now-date)/3600000;
   if(!Number.isFinite(date)||!Number.isFinite(age)||age<0||age>AGE_LIMIT_HOURS)reasons.push('Backup is not recent');
 }
 if(!archiveExists)reasons.push('Archive missing or inaccessible');
 else if(!archiveVerified)reasons.push('PostgreSQL archive signature or TOC cannot be verified');
 return {
   source,projectRef:PROJECT_REFS[source],backupStatus:reasons.length?'BACKUP_NEEDS_ATTENTION':'READABLE_EXPORT_ONLY',
   restoreStatus:'NOT_VERIFIED',releaseGate:'NO_GO',reasons
 };
}
async function hashFile(path){
 const h=createHash('sha256');
 for await(const chunk of createReadStream(path))h.update(chunk);
 return h.digest('hex');
}
export async function inspectReadiness(root,source='all',now=Date.now()){
 const sources=source==='all'?['preview','production']:[source];
 if(sources.some(s=>!Object.hasOwn(PROJECT_REFS,s)))throw new Error('Source must be all, preview or production');
 const out={checkedAt:new Date(now).toISOString(),releaseGate:'NO_GO',fullSupabaseRestore:'NOT_VERIFIED',
    browserAuthExamResult:'NOT_VERIFIED',storageObjectBytes:'NOT_VERIFIED',sources:{},
    note:'This is backup-readiness evidence only, not a full isolated restore or merge authorization.'};
 for(const s of sources){
   let report=null,exists=false,size=0,hash=null,archiveVerified=false;
   try{
     const path=join(resolve(root),'07-Recovery-Reports','last-'+s+'-export.json');
     if(!lstatSync(path).isSymbolicLink())report=JSON.parse(readFileSync(path,'utf8'));
     if(report&&typeof report.archiveName==='string'&&
       basename(report.archiveName)===report.archiveName&&
       new RegExp('^ksol-'+s+'-[0-9TZ-]+-[0-9]+\\.dump$').test(report.archiveName)){
       const archive=join(resolve(root),'09-Automated-Backups',report.archiveName);
       if(existsSync(archive)&&!lstatSync(archive).isSymbolicLink()){
         size=statSync(archive).size;
         hash=await hashFile(archive);
         exists=true;
         let fd;
         try {
           fd=openSync(archive,'r');const sig=Buffer.alloc(5);
           if(readSync(fd,sig,0,5,0)===5&&sig.toString('ascii')==='PGDMP'){
             const listed=spawnSync('pg_restore',['--list',archive],{
               encoding:'utf8',timeout:120000,windowsHide:true,maxBuffer:32*1024*1024
             });
             archiveVerified=!listed.error&&listed.status===0;
           }
         }finally{if(fd!==undefined)closeSync(fd)}
       }
     }
   }catch{/* Missing or malformed manifests fail closed, never guess status. */}
   out.sources[s]=evaluateExportReport({source:s,report,archiveExists:exists,archiveBytes:size,actualHash:hash,archiveVerified,now});
 }
 out.allLocalBackupsReady=Object.values(out.sources).every(s=>s.backupStatus==='READABLE_EXPORT_ONLY');
 return out;
}
async function main(){
 try{
   const argv=process.argv.slice(2),get=(flag,fallback)=>{
     const i=argv.indexOf(flag);return i>=0?argv[i+1]:fallback;
   };
   const root=get('--root',process.platform==='win32'?'D:\\KSOL-BACKEND':null);
   const source=get('--source','all');
   if(!root||!['all','preview','production'].includes(source))throw new Error('Usage: check-readiness.mjs --root ROOT [--source preview|production|all]');
   const result=await inspectReadiness(root,source);
   const output=join(resolve(root),'07-Recovery-Reports');
   mkdirSync(output,{recursive:true,mode:0o700});
   const dest=join(output,'latest-recovery-readiness.json');
   writeFileSync(dest,JSON.stringify(result,null,2)+'\n',{encoding:'utf8',mode:0o600});
   for(const s of Object.values(result.sources)){
     console.log(s.source+': '+s.backupStatus+(s.reasons.length?' ('+s.reasons.join('; ')+')':''));
   }
   console.log('Full restore:',result.fullSupabaseRestore,'| production release:',result.releaseGate);
   console.log('Private report:',dest);
   if(!result.allLocalBackupsReady)process.exitCode=1;
 }catch(e){
   console.error('Recovery readiness report unavailable:',e instanceof Error?e.message:'Unknown error');
   process.exitCode=2;
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
