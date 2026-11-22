import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {evaluateExportReport,inspectReadiness} from '../scripts/recovery/check-readiness.mjs';
import {PROJECT_REFS} from '../scripts/recovery/create-verified-backup.mjs';

const now=Date.parse('2026-11-22T12:00:00Z');
const digest='f'.repeat(64);
const report={source:'preview',projectRef:PROJECT_REFS.preview,
  backupStatus:'READABLE_EXPORT_ONLY',pgRestoreListPass:true,
  expectedTableData:{complete:true},sha256:digest,bytes:1000,
  createdAt:'2026-11-22T11:00:00Z'};

const assess=(r=report,o={})=>evaluateExportReport({
 source:'preview',report:r,archiveExists:true,archiveBytes:1000,
 actualHash:digest,archiveVerified:true,now,...o
});
test('backup ready is never mistakenly labelled as successful full restore or release',()=>{
 const result=assess();
 assert.equal(result.backupStatus,'READABLE_EXPORT_ONLY');
 assert.equal(result.restoreStatus,'NOT_VERIFIED');
 assert.equal(result.releaseGate,'NO_GO');
});
test('mismatched project, aged export, invalid digest and unverified TOC fail closed',()=>{
 for(const value of [
  assess({...report,projectRef:PROJECT_REFS.production}),
  assess({...report,createdAt:'2026-10-01T11:00:00Z'}),
  assess({...report,bytes:900}),
  assess({...report,sha256:'bad'}),
  assess(report,{archiveVerified:false}),
  assess(report,{actualHash:'0'.repeat(64)}),
  assess(report,{archiveExists:false}),
 ]){
  assert.equal(value.backupStatus,'BACKUP_NEEDS_ATTENTION');
  assert.equal(value.releaseGate,'NO_GO');
  assert.ok(value.reasons.length>0);
 }
});
test('without owner local exports both database sources are explicitly UNKNOWN/NO_GO',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ksol-ready-'));
 try{
  const r=await inspectReadiness(dir,'all',now);
  assert.equal(r.sources.preview.backupStatus,'BACKUP_NEEDS_ATTENTION');
  assert.equal(r.sources.production.backupStatus,'BACKUP_NEEDS_ATTENTION');
  assert.equal(r.fullSupabaseRestore,'NOT_VERIFIED');
  assert.equal(r.releaseGate,'NO_GO');
  assert.equal(r.allLocalBackupsReady,false);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
