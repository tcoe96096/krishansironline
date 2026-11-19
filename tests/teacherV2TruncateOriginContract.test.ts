import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const base='docs/proposed-migrations/';
const origin=readFileSync(base+'teacher_v2_user_roles_truncate_origin_PREFLIGHT_READ_ONLY.sql','utf8');
const remediation=readFileSync(base+'teacher_v2_user_roles_truncate_remediation_REVIEW_ONLY.sql','utf8');

test('TRUNCATE origin inspection remains read-only and distinguishes effective from direct/PUBLIC grants',()=>{
 const clean=origin.replace(/--[^\n]*/g,'').replace(/'(?:''|[^'])*'/g,"''").trim();
 assert.match(clean,/^WITH\s+principals\s+AS\s*\(/i);
 assert.match(clean,/\bSELECT\b/i);
 assert.doesNotMatch(clean,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE\s+TABLE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY|EXECUTE|PERFORM)\b/i);
 assert.match(origin,/has_table_privilege\(p\.rolname,'public\.user_roles','TRUNCATE'\)/);
 assert.match(origin,/aclexplode/);
 assert.match(origin,/g\.grantee=p\.oid/);
 assert.match(origin,/g\.grantee=0/);
 assert.match(origin,/pg_auth_members/);
 assert.match(origin,/inherited roles or/);
});

test('TRUNCATE remediation remains review-only and requires effective privilege recheck',()=>{
 assert.match(remediation,/REVIEW ONLY/i);
 assert.match(remediation,/TRUNCATE/i);
 assert.match(remediation,/anon/);
 assert.match(remediation,/authenticated/);
 assert.doesNotMatch(remediation,/GRANT\s+(?:ALL|TRUNCATE)\s+ON\s+(?:TABLE\s+)?public\.user_roles/i);
});
