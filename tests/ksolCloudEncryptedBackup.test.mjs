import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROJECT_REFS,validateCloudSettings,isCryptRemote,assessDownloadedToc} from '../scripts/recovery/cloud-stream-backup.mjs';

const base={KSOL_DB_HOST:'db.'+PROJECT_REFS.preview+'.supabase.co',
 KSOL_DB_PORT:'5432',KSOL_DB_USER:'postgres',KSOL_DB_NAME:'postgres',
 KSOL_DB_PASSWORD:'synthetic-test-only'};
test('only exact explicitly selected Supabase source is accepted',()=>{
 assert.equal(validateCloudSettings('preview',base).ok,true);
 assert.equal(validateCloudSettings('production',base).ok,false);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_HOST:'localhost'}).ok,false);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_PASSWORD:''}).ok,false);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_PORT:'65536'}).ok,false);
 assert.equal(validateCloudSettings('preview',base,'../../unsafe').ok,false);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_HOST:'aws-0-ap-south-1.pooler.supabase.co',
    KSOL_DB_USER:'postgres.'+PROJECT_REFS.preview}).ok,true);
 assert.equal(validateCloudSettings('preview',{...base,KSOL_DB_HOST:'aws-0-ap-south-1.pooler.supabase.co',
    KSOL_DB_USER:'postgres.'+PROJECT_REFS.production}).ok,false);
});
test('cloud storage MUST have a crypt overlay, not raw Google Drive remote',()=>{
 const config=String.raw\`[gdrive]
type = drive
token = SECRET_SHOULD_NOT_BE_LOGGED

[ksolcrypt]
type = crypt
remote = gdrive:KSOL-Private/Encrypted
password = OBSCURED
password2 = OBSCURED

[another]
type = local
\`;
 assert.equal(isCryptRemote(config,'ksolcrypt'),true);
 assert.equal(isCryptRemote(config,'gdrive'),false);
 assert.equal(isCryptRemote('[ksolcrypt]\ntype = drive\nremote = gdrive:KSOL-Private\n','ksolcrypt'),false);
 assert.equal(isCryptRemote('[ksolcrypt]\ntype = crypt\n','ksolcrypt'),false);
 assert.equal(isCryptRemote('[ksolcrypt]\ntype = crypt\nremote = E:/folder\n','ksolcrypt'),true);
});
test('decrypted downloaded TOC checks managed auth/storage and student/attempt data',()=>{
 const content=[
  '21; 0 1 TABLE DATA public student_profiles postgres',
  '22; 0 1 TABLE DATA public test_attempts postgres',
  '23; 0 1 TABLE DATA auth users postgres',
  '24; 0 1 TABLE DATA storage objects postgres'].join('\n');
 assert.equal(assessDownloadedToc(content).tocCoverage,true);
 assert.equal(assessDownloadedToc(content.replace('auth users','auth roles')).tocCoverage,false);
 assert.deepEqual(assessDownloadedToc('').missingTables,
  ['auth users','storage objects','public student_profiles','public test_attempts']);
});
test('script never writes local plaintext dump or mistakes archive success for full restore',()=>{
 const content=readFileSync('scripts/recovery/cloud-stream-backup.mjs','utf8');
 assert.match(content,/pg\.stdout\.pipe\(put\.stdin\)/);
 assert.match(content,/read\.stdout\.pipe\(toc\.stdin\)/);
 assert.match(content,/fullSupabaseRestore:'NOT_VERIFIED'/);
 assert.match(content,/releaseGate:'NO_GO'/);
 assert.doesNotMatch(content,/writeFileSync|--file|DROP DATABASE|pg_restore.*--clean/);
});
