#!/usr/bin/env node
/** KSOL local recovery inventory: offline, read-only to backup bytes and NEVER a restore. */
import { createHash } from 'node:crypto';
import { createReadStream, mkdirSync, openSync, readSync, closeSync, readdirSync, lstatSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SUPPORTED = /\.(dump|backup|pgdump)$/i;
const MAX_AGE_HOURS = 36;
export function assessBackup({exists, customFormat, readable, bytes, ageHours}) {
  if (!exists) return {archiveStatus:'MISSING_BACKUP', fresh:false, reasons:['No archive found']};
  if (!Number.isSafeInteger(bytes) || bytes <= 5 || !customFormat) return {archiveStatus:'INVALID_ARCHIVE', fresh:false, reasons:['Not a valid PostgreSQL custom-format archive header']};
  if (readable !== true) return {archiveStatus:'UNVERIFIED_ARCHIVE', fresh:false, reasons:['pg_restore --list did not succeed']};
  if (!Number.isFinite(ageHours) || ageHours < 0 || ageHours > MAX_AGE_HOURS) return {archiveStatus:'STALE_ARCHIVE', fresh:false, reasons:['Backup is older than 36 hours or has invalid timestamp']};
  return {archiveStatus:'READABLE_ARCHIVE_ONLY', fresh:true, reasons:['A readable archive is NOT a successful full database restore']};
}
function parseArgs(argv){
 const args={root:process.platform==='win32'?'D:\\KSOL-BACKEND':process.cwd(), reportDir:null};
 for(let i=0;i<argv.length;i++){
   if(argv[i]==='--root' && argv[i+1])args.root=argv[++i];
   else if(argv[i]==='--report-dir' && argv[i+1])args.reportDir=argv[++i];
   else throw new Error('Usage: node inspect-local-backups.mjs [--root ROOT] [--report-dir DIR]');
 }
 return args;
}
function readHeader(path){let fd;try{fd=openSync(path,'r');const b=Buffer.alloc(5);return readSync(fd,b,0,5,0)===5 && b.toString('ascii')==='PGDMP';}finally{if(fd!==undefined)closeSync(fd)}}
async function digest(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex')}
export async function inspectLocalBackup(root, now=Date.now()) {
 const folders=[join(resolve(root),'09-Automated-Backups'),join(resolve(root),'01-Database-Backup')];
 let entries=[];
 for(const folder of folders){
   try{
     entries.push(...readdirSync(folder,{withFileTypes:true}).filter(x=>x.isFile()&&SUPPORTED.test(x.name)).map(x=>{
       const full=join(folder,x.name); const l=lstatSync(full);
       return {full,name:x.name,mtime:l.mtimeMs,bytes:l.size,isLink:l.isSymbolicLink()};
     }).filter(x=>!x.isLink));
   }catch(error){if(error.code!=='ENOENT')throw error}
 }
 entries.sort((a,b)=>b.mtime-a.mtime);
 const latest=entries[0];
 const folder=latest?dirname(latest.full):folders[1];
 const result={timestamp:new Date(now).toISOString(),backupDirectory:folder,archiveCount:entries.length,
    archiveStatus:'MISSING_BACKUP',fresh:false,restoreStatus:'NOT_VERIFIED',releaseGate:'NO_GO',
    note:'This local inspection cannot certify Supabase auth/storage, RLS, complete restore or production release.',reasons:[]};
 if(!latest){Object.assign(result,assessBackup({exists:false}));return result}
 const customFormat=readHeader(latest.full);
 const pg=customFormat?spawnSync('pg_restore',['--list',latest.full],{encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024,windowsHide:true}):null;
 const readable=!!pg&&!pg.error&&pg.status===0;
 // Filesystem modification time is an operational freshness hint, not verified backup creation time.
 const ageHours=(now-latest.mtime)/3600000;
 Object.assign(result,{latestBackup:basename(latest.name),archiveSource:/^ksol-(preview|production)-/.exec(latest.name)?.[1]||'legacy-unlabeled',latestBytes:latest.bytes,ageHours:Math.round(ageHours*100)/100,
  sha256:await digest(latest.full),pgRestoreAvailable:pg?pg.error?.code!=='ENOENT':null},
  assessBackup({exists:true,customFormat,readable,bytes:latest.bytes,ageHours}));
 return result;
}
async function main(){
 try{
 const args=parseArgs(process.argv.slice(2)); const report=await inspectLocalBackup(args.root);
 const output=resolve(args.reportDir||join(args.root,'07-Recovery-Reports'));
 mkdirSync(output,{recursive:true});
 // Only local disk. Never put dump, credentials, inventories, or restore logs in GitHub artifacts.
 const dest=join(output,'latest-recovery-inventory.json');
 writeFileSync(dest,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',mode:0o600});
 console.log('KSOL archive:',report.archiveStatus,'| full restore:',report.restoreStatus,'| release:',report.releaseGate);
 console.log('Report stored ONLY on this PC:',dest);
 process.exitCode=report.archiveStatus==='READABLE_ARCHIVE_ONLY'?0:1;
 }catch(e){console.error('KSOL recovery inventory failed:',e instanceof Error?e.message:String(e));process.exitCode=2}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
