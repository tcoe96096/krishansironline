import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {
 checkRestoreEvidence,PREVIEW_PROJECT_ID,PRODUCTION_PROJECT_ID,
 REQUIRED_CHECKS,REQUIRED_FILES
} from '../scripts/teacher-restore-evidence-check.mjs';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'ksol-teacher-recovery-test-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const files={};
 for(const kind of REQUIRED_FILES){
  const path=kind+'.test';
  const data='SYNTHETIC ONLY\n'+kind+'\nNo real data\n';
  writeFileSync(join(dir,path),data);
  files[kind]={path,bytes:Buffer.byteLength(data),sha256:createHash('sha256').update(data).digest('hex')};
 }
 const manifest={
  schema_version:1,
  evidence_only:true,
  source_matches_current_preview:true,
  source:{project_id:PREVIEW_PROJECT_ID,backup_created_at:'2026-11-21T12:00:00Z',pg_dump_version:'18.7'},
  restore:{target_environment:'disposable',target_id:'disposable-test-db-unique',
   started_at:'2026-11-21T13:00:00Z',finished_at:'2026-11-21T13:15:00Z',
   exit_code:0,run_result:'completed',pg_restore_version:'18.7'},
  files,reconciliation:Object.fromEntries(REQUIRED_CHECKS.map(k=>[k,true]))
 };
 const manifestFile=join(dir,'manifest.json');
 const save=()=>writeFileSync(manifestFile,JSON.stringify(manifest,null,2));
 save();
 return{dir,manifest,manifestFile,save};
}

test('complete SYNTHETIC evidence package is only structurally consistent, never release-authorized',async t=>{
 const x=fixture(t);
 const result=await checkRestoreEvidence(x.manifestFile);
 assert.deepEqual(result,{structurallyComplete:true,releaseGate:'NO_GO',
  status:'STRUCTURALLY_CONSISTENT_NOT_VERIFIED',errors:[]});
 const cli=spawnSync(process.execPath,['scripts/teacher-restore-evidence-check.mjs',x.manifestFile],{encoding:'utf8'});
 assert.equal(cli.status,0,cli.stderr);
 assert.match(cli.stdout,/"releaseGate": "NO_GO"/);
 assert.match(cli.stdout,/NOT_VERIFIED/);
});

test('missing evidence manifest is NO-GO with no external reads or writes',async t=>{
 const x=fixture(t);
 const result=await checkRestoreEvidence(join(x.dir,'missing.json'));
 assert.equal(result.structurallyComplete,false);
 assert.equal(result.releaseGate,'NO_GO');
 assert.equal(result.status,'INVALID_EVIDENCE');
});

test('corrupt archive bytes, forged size or digest fail validation',async t=>{
 const x=fixture(t);
 writeFileSync(join(x.dir,x.manifest.files.backup_archive.path),'different bytes');
 let result=await checkRestoreEvidence(x.manifestFile);
 assert.equal(result.structurallyComplete,false);
 assert.ok(result.errors.some(x=>x.includes('backup_archive')));
 x.manifest.files.backup_archive.bytes=0;
 x.save();
 result=await checkRestoreEvidence(x.manifestFile);
 assert.ok(result.errors.some(x=>x.includes('backup_archive')));
});

test('each required evidence item and reconciliation result is mandatory',async t=>{
 const x=fixture(t);
 delete x.manifest.files.restore_log;
 x.manifest.reconciliation.auth_dependencies=false;
 x.manifest.reconciliation.rls_policies=false;
 x.save();
 const result=await checkRestoreEvidence(x.manifestFile);
 assert.equal(result.releaseGate,'NO_GO');
 assert.ok(result.errors.some(x=>x.includes('restore_log')));
 assert.ok(result.errors.some(x=>x.includes('auth_dependencies')));
 assert.ok(result.errors.some(x=>x.includes('rls_policies')));
});

test('failed, partial or self-reported restore cannot count as verified recovery',async t=>{
 const x=fixture(t);
 x.manifest.restore.exit_code=1;
 x.manifest.restore.run_result='partial';
 x.manifest.restore.target_environment='preview';
 x.save();
 const r=await checkRestoreEvidence(x.manifestFile);
 assert.equal(r.status,'INVALID_EVIDENCE');
 assert.ok(r.errors.some(x=>x.includes('zero exit')));
 assert.ok(r.errors.some(x=>x.includes('completed')));
 assert.ok(r.errors.some(x=>x.includes('disposable')));
});

test('refuse Production, Preview or wrong source identities',async t=>{
 const x=fixture(t);
 x.manifest.source.project_id=PRODUCTION_PROJECT_ID;
 x.manifest.restore.target_id=PREVIEW_PROJECT_ID;
 x.save();
 const r=await checkRestoreEvidence(x.manifestFile);
 assert.equal(r.structurallyComplete,false);
 assert.ok(r.errors.some(x=>x.includes('exact Preview')));
 assert.ok(r.errors.some(x=>x.includes('differ')));
});

test('block source freshness guesses and release permission embedded in a file',async t=>{
 const x=fixture(t);
 x.manifest.source_matches_current_preview=false;
 x.manifest.release_authorized=true;
 x.save();
 const r=await checkRestoreEvidence(x.manifestFile);
 assert.equal(r.releaseGate,'NO_GO');
 assert.ok(r.errors.some(x=>x.includes('freshness')));
 assert.ok(r.errors.some(x=>x.includes('authorization')));
});

test('reject path traversal, duplicate and outside evidence files',async t=>{
 const x=fixture(t);
 x.manifest.files.restore_log.path='../outside.log';
 x.manifest.files.smoke_report.path=x.manifest.files.source_inventory.path;
 x.save();
 const r=await checkRestoreEvidence(x.manifestFile);
 assert.equal(r.structurallyComplete,false);
 assert.ok(r.errors.some(x=>x.includes('restore_log')));
 assert.ok(r.errors.some(x=>x.includes('Duplicate evidence artifact')));
});

test('invalid chronology and absent proof of write/rollback fail closed',async t=>{
 const x=fixture(t);
 x.manifest.restore.finished_at='2026-11-21T12:30:00Z';
 x.manifest.reconciliation.smoke_write_rollback='unknown';
 x.save();
 const r=await checkRestoreEvidence(x.manifestFile);
 assert.ok(r.errors.some(x=>x.includes('chronological')));
 assert.ok(r.errors.some(x=>x.includes('smoke_write_rollback')));
});

test('reject credential-looking manifest fields and never print their values',async t=>{
 const x=fixture(t);
 x.manifest.database_password='DO_NOT_LEAK';
 x.save();
 const cli=spawnSync(process.execPath,['scripts/teacher-restore-evidence-check.mjs',x.manifestFile],{encoding:'utf8'});
 assert.equal(cli.status,1);
 assert.match(cli.stdout,/"releaseGate": "NO_GO"/);
 assert.doesNotMatch(cli.stdout,/DO_NOT_LEAK/);
});

test('restore verifier contains no database commands, network calls or mutable operations',()=>{
 const code=readFileSync('scripts/teacher-restore-evidence-check.mjs','utf8');
 assert.doesNotMatch(code,/import\s+.*\s+from ['"](?:pg|supabase-js|@supabase|node:http|node:https)['"]/);
 assert.doesNotMatch(code,/child_process|execSync|spawnSync|pg_restore\s+--|\.query\(|fetch\(/);
 assert.match(code,/releaseGate:'NO_GO'/);
 assert.match(code,/STRUCTURALLY_CONSISTENT_NOT_VERIFIED/);
});
