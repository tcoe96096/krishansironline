import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessBackup, inspectLocalBackup } from '../scripts/recovery/inspect-local-backups.mjs';

test('missing backup is not release-ready', async () => {
 const root=mkdtempSync(join(tmpdir(),'ksol-recovery-'));
 try{const r=await inspectLocalBackup(root);assert.equal(r.archiveStatus,'MISSING_BACKUP');assert.equal(r.releaseGate,'NO_GO');assert.equal(r.restoreStatus,'NOT_VERIFIED')}finally{rmSync(root,{recursive:true,force:true})}
});
test('valid archive listing alone NEVER constitutes full restore',()=>{
 const r=assessBackup({exists:true,customFormat:true,readable:true,bytes:5000,ageHours:1});
 assert.equal(r.archiveStatus,'READABLE_ARCHIVE_ONLY');assert.match(r.reasons.join(' '),/NOT a successful full database restore/);
});
test('corrupted, unparsed, stale and future archives stay unverified',()=>{
 const cases=[
  [{exists:true,customFormat:false,readable:true,bytes:100,ageHours:1},'INVALID_ARCHIVE'],
  [{exists:true,customFormat:true,readable:false,bytes:100,ageHours:1},'UNVERIFIED_ARCHIVE'],
  [{exists:true,customFormat:true,readable:true,bytes:100,ageHours:50},'STALE_ARCHIVE'],
  [{exists:true,customFormat:true,readable:true,bytes:100,ageHours:-1},'STALE_ARCHIVE'],
 ];
 for (const [v,status] of cases)assert.equal(assessBackup(v).archiveStatus,status);
});
test('synthetic PGDMP header does not falsely prove a restorable backup',async()=>{
 const root=mkdtempSync(join(tmpdir(),'ksol-recovery-'));
 try{
  const dir=join(root,'01-Database-Backup');mkdirSync(dir);
  writeFileSync(join(dir,'synthetic.dump'),Buffer.from('PGDMPnot-a-real-postgres-archive'));
  const r=await inspectLocalBackup(root);
  assert.equal(r.archiveStatus,'UNVERIFIED_ARCHIVE'); assert.equal(r.restoreStatus,'NOT_VERIFIED');assert.equal(r.releaseGate,'NO_GO');
 }finally{rmSync(root,{recursive:true,force:true})}
});
