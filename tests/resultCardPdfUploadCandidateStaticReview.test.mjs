import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('docs/results/ksol-result-private-pdf-upload-CANDIDATE-DO-NOT-DEPLOY.mjs','utf8');

test('upload server is review-only, authenticated and super-admin gated',()=>{
 assert.match(source,/REVIEW_ONLY \/ DO NOT DEPLOY/);
 assert.match(source,/\/auth\/v1\/user/);
 assert.match(source,/\/rest\/v1\/rpc\/is_super_admin/);
 assert.match(source,/admin\.data !== true/);
 assert.match(source,/Authorization: authorization/);
});

test('PDF digest comes from exact server-read bytes, not the request',()=>{
 assert.match(source,/pdf\.type !== "application\/pdf"/);
 assert.match(source,/pdf\.size > LIMIT_BYTES/);
 assert.match(source,/String\.fromCharCode/);
 assert.match(source,/crypto\.subtle\.digest\("SHA-256", bytes\)/);
 assert.match(source,/const key =/);
 assert.match(source,/sha256/);
 assert.doesNotMatch(source,/form\.get\("sha256"\)/);
});

test('private storage upload uses server secret and does not overwrite',()=>{
 assert.match(source,/const BUCKET = "result-cards-private"/);
 assert.match(source,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(source,/\/storage\/v1\/object\//);
 assert.match(source,/"x-upsert": "false"/);
 assert.doesNotMatch(source,/getPublicUrl\s*\(/);
 assert.doesNotMatch(source,/console\.(log|debug|info)\s*\(/);
});

test('approval RPC follows upload and does not auto-publish',()=>{
 assert.match(source,/\/rest\/v1\/rpc\/ksol_result_approve_pdf/);
 assert.match(source,/p_artifact_sha256: sha256/);
 assert.match(source,/p_request_key: requestKey/);
 assert.match(source,/approval\.data !== "approved"/);
 assert.doesNotMatch(source,/\/rpc\/ksol_result_transition/);
 assert.doesNotMatch(source,/send_result_to_student\s*\(/);
});
