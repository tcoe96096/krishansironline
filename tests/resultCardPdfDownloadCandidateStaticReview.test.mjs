import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const manifest=readFileSync('docs/results/ksol-result-pdf-manifest-CANDIDATE-DO-NOT-APPLY.sql','utf8');
const edge=readFileSync('docs/results/ksol-result-private-pdf-download-CANDIDATE-DO-NOT-DEPLOY.mjs','utf8');

test('manifest is a single review-only gated transaction',()=>{
 assert.match(manifest,/REVIEW_ONLY \/ DO NOT APPLY/);
 assert.equal((manifest.match(/^BEGIN;$/gm)||[]).length,1);
 assert.equal((manifest.match(/^COMMIT;$/gm)||[]).length,1);
 const trailing=manifest.split(/^COMMIT;$/m)[1]??'';
 assert.ok(trailing.split(/\r?\n/).every(line=>line.trim()===''||line.trim().startsWith('--')));
 assert.match(manifest,/SECURITY DEFINER SET search_path=''/);
 assert.match(manifest,/auth\.uid\(\) IS NOT NULL/);
 assert.match(manifest,/public\.ksol_can_view_released_result\(p_attempt_id,p_expected_version\) IS TRUE/);
 assert.match(manifest,/r\.state = 'released'/);
 assert.match(manifest,/r\.result_version = p_expected_version/);
 assert.match(manifest,/REVOKE ALL ON FUNCTION public\.ksol_result_pdf_manifest\(uuid,integer\)/);
 assert.match(manifest,/FROM PUBLIC,anon/);
});

test('server source requires verified user and owner-gated manifest',()=>{
 assert.match(edge,/REVIEW_ONLY \/ DO NOT DEPLOY/);
 assert.match(edge,/\/auth\/v1\/user/);
 assert.match(edge,/\/rest\/v1\/rpc\/ksol_result_pdf_manifest/);
 assert.match(edge,/Authorization: authorization/);
 assert.match(edge,/parts\[0\] !== attemptId/);
 assert.match(edge,/DIGEST_PDF_RE\.test\(parts\[2\]\)/);
 assert.doesNotMatch(edge,/getPublicUrl\s*\(/);
});

test('server-only signing has short lived private link and no logging',()=>{
 assert.match(edge,/const TTL_SECONDS = 30/);
 assert.match(edge,/const BUCKET = "result-cards-private"/);
 assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(edge,/\/storage\/v1\/object\/sign\//);
 assert.match(edge,/expiresIn: TTL_SECONDS/);
 assert.match(edge,/Cache-Control": "private, no-store/);
 assert.match(edge,/serviceKey/);
 assert.doesNotMatch(edge,/console\.(log|info|debug)\s*\(/);
 assert.doesNotMatch(edge,/getPublicUrl\s*\(/);
 assert.doesNotMatch(edge,/Deno\.env\.set\s*\(/);
});

test('only approved website origins can access browser-facing endpoint',()=>{
 assert.match(edge,/https:\/\/krishansir\.online/);
 assert.match(edge,/ALLOWED_ORIGINS\.has\(origin\)/);
 assert.match(edge,/Request too large/);
 assert.match(edge,/Sign in required/);
});

const browserAdapter = readFileSync('src/services/resultCardBackend.ts','utf8');
test('website result adapter remains disabled until an explicit release flag',()=>{
 assert.match(browserAdapter,/VITE_RESULT_CARD_BACKEND_ENABLED === 'true'/);
 assert.match(browserAdapter,/requireResultFeature\(\)/);
 assert.match(browserAdapter,/requireSupabase\(\)\.rpc\('ksol_result_transition'/);
 assert.match(browserAdapter,/requireSupabase\(\)\.rpc\('ksol_result_approve_pdf'/);
 assert.match(browserAdapter,/functions\.invoke\(\s*'ksol-result-pdf-download'/);
 assert.match(browserAdapter,/signedUrl\.origin !== new URL\(projectUrl\)\.origin/);
 assert.match(browserAdapter,/RESULT_BUCKET_PATH/);
 assert.doesNotMatch(browserAdapter,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(browserAdapter,/\.storage\.from\(/);
});
