import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessSource,checkArchiveListing,PROJECT_REFS} from '../scripts/recovery/create-verified-backup.mjs';

const preview={
 source:'preview',host:'db.'+PROJECT_REFS.preview+'.supabase.co',
 username:'postgres',database:'postgres',port:'5432'
};
test('explicit remote project identity is mandatory',()=>{
 assert.equal(assessSource(preview).ok,true);
 assert.equal(assessSource({...preview,source:'production'}).ok,false);
 assert.equal(assessSource({...preview,host:'localhost'}).ok,false);
 assert.equal(assessSource({...preview,host:'attacker.example.com'}).ok,false);
 assert.equal(assessSource({...preview,source:''}).ok,false);
 assert.equal(assessSource({...preview,port:0}).ok,false);
 assert.equal(assessSource({...preview,username:''}).ok,false);
});
test('pooler connections must carry their exact Supabase project ref in username',()=>{
 assert.equal(assessSource({...preview,host:'aws-0-ap-south-1.pooler.supabase.co',
   username:'postgres.'+PROJECT_REFS.preview}).ok,true);
 assert.equal(assessSource({...preview,host:'aws-0-ap-south-1.pooler.supabase.co',
   username:'postgres.'+PROJECT_REFS.production}).ok,false);
});
test('auth, storage and student tables must be represented in TOC before export is considered complete',()=>{
 const listing=[
  '12; 0 900 TABLE DATA auth users postgres',
  '13; 0 901 TABLE DATA storage objects postgres',
  '14; 0 902 TABLE DATA public student_profiles postgres',
  '15; 0 903 TABLE DATA public test_attempts postgres'
 ].join('\n');
 const all=checkArchiveListing(listing);
 assert.equal(all.complete,true);
 assert.equal(all.missing.length,0);
 const partial=checkArchiveListing(listing.replace('TABLE DATA auth users','TABLE DATA auth bogus'));
 assert.equal(partial.complete,false);
 assert.deepEqual(partial.missing,['auth users']);
});
test('restore remains explicitly unverified by this read-only export module',async()=>{
 const {readFileSync}=await import('node:fs');
 const text=readFileSync('scripts/recovery/create-verified-backup.mjs','utf8');
 assert.match(text,/restoreStatus:'NOT_VERIFIED'/);
 assert.match(text,/releaseGate:'NO_GO'/);
 assert.doesNotMatch(text,/DROP\s+DATABASE|pg_restore['"],\s*\['--clean'/);
});
test('Windows scheduled backup requires same-user DPAPI and encrypted local drive',async()=>{
 const {readFileSync}=await import('node:fs');
 const script=readFileSync('scripts/recovery/windows/Invoke-KSOL-DailyBackup.ps1','utf8');
 const init=readFileSync('scripts/recovery/windows/Initialize-KSOL-Backup.ps1','utf8');
 const schedule=readFileSync('scripts/recovery/windows/Install-KSOL-DailyBackup.ps1','utf8');
 assert.match(script,/Get-BitLockerVolume/);
 assert.match(init,/ConvertFrom-SecureString/);
 assert.match(script,/ConvertTo-SecureString/);
 assert.match(schedule,/New-ScheduledTaskTrigger -Daily/);
 assert.doesNotMatch(init,/Write-Host\s+\$password/);
 assert.doesNotMatch(schedule,/service_role|SUPABASE_SERVICE_ROLE_KEY/);
});
