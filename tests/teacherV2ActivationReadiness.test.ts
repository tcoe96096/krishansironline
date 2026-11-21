import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync('docs/proposed-migrations/teacher_v2_activation_readiness_PREFLIGHT_READ_ONLY.sql','utf8');
const withoutComments=sql.replace(/--[^\n]*/g,'');
const withoutStrings=withoutComments.replace(/'(?:[^']|'')*'/g,"''");

test('readiness inventory is one read-only SELECT, never a mutation or release authorization',()=>{
 assert.match(sql,/READ ONLY/i);
 assert.match(withoutStrings.trim(),/^WITH catalog_gates AS\s*\(/);
 assert.equal(withoutStrings.split(';').filter(s=>s.trim()).length,1);
 assert.doesNotMatch(withoutStrings,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO)\s+(?:INTO|FROM|ON|TABLE|FUNCTION|POLICY|SCHEMA|ROLE)\b/i);
 assert.doesNotMatch(sql,/\bACTIVATION_GO\s*=\s*true\b/i);
 assert.match(sql,/Never treat a catalog PASS as deployment authorization/i);
});
test('readiness checks all required teacher registrations, identity and optional media contracts',()=>{
 const names=[
  'teacher_profiles','teacher_resume_documents','teacher_assignments','teacher_identity_verifications',
  'teacher_snapshot_rpc','teacher_registration_rpc','teacher_review_rpc',
  'identity_verification_writer_rpc','identity_verification_read_rpc',
  'resume_reserve_rpc','resume_finalize_rpc','private_photo_bucket','private_resume_bucket',
  'anon_no_user_roles_truncate','authenticated_no_user_roles_truncate'
 ];
 for(const gate of names)assert.match(sql,new RegExp("'"+gate+"'"),gate);
 assert.match(sql,/to_regclass\('public\.teacher_profiles'\)/);
 assert.match(sql,/to_regprocedure\('public\.teacher_v2_review\(uuid,integer,text,text,boolean,jsonb\)'\)/);
 assert.match(sql,/to_regprocedure\('public\.teacher_v2_resume_finalize\(uuid\)'\)/);
 assert.match(sql,/has_table_privilege\('anon',to_regclass\('public\.user_roles'\),'TRUNCATE'\)/);
 assert.match(sql,/has_table_privilege\('authenticated',to_regclass\('public\.user_roles'\),'TRUNCATE'\)/);
 assert.match(sql,/b\.public IS FALSE/);
 assert.match(sql,/file_size_limit=5242880/);
 assert.match(sql,/file_size_limit=3145728/);
});
test('backup, runtime JWT/RLS, document scan, policy composition and approval never auto-pass',()=>{
 const mandatory=[
 'target_project_verified','independently_restored_backup','authenticated_rls_matrix',
 'private_media_policy_composition','document_malware_scan','independent_owner_release_approval'
 ];
 for(const gate of mandatory)assert.match(sql,new RegExp("'"+gate+"'(?:\\s*::text\\s+AS\\s+gate)?\\s*,\\s*'UNVERIFIED'"));
 assert.match(sql,/CASE WHEN catalog_ready THEN 'CATALOG_PRESENT_NOT_RUNTIME_VERIFIED'/);
 assert.match(sql,/ELSE 'BLOCKED'/);
 assert.doesNotMatch(sql,/THEN 'GO'|AS (?:release|activation)_go/i);
});
