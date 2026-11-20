#!/usr/bin/env node
// Offline fail-closed release evidence validator. Never accesses Supabase or deploys.
// Usage: node scripts/teacher/verify-release-evidence.mjs path/to/evidence.json
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CASE_IDS = Array.from({ length: 18 }, (_, i) => 'T' + String(i + 1).padStart(2, '0'));
const SHA256 = /^[a-f0-9]{64}$/i;
const COMMIT = /^[a-f0-9]{40}$/i;
const UTC = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;

export function validateEvidence(evidence) {
  const errors = [];
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return ['Evidence must be a JSON object'];
  for (const field of ['mainCommit', 'candidateCommit']) {
    if (!COMMIT.test(evidence[field] ?? '')) errors.push(field + ': exact 40-character commit SHA required');
  }
  for (const field of ['sqlSha256', 'previewArtifactSha256', 'restoreProofSha256']) {
    if (!SHA256.test(evidence[field] ?? '')) errors.push(field + ': independently verified SHA-256 required');
  }
  if (evidence.previewProjectId !== 'zgpkmfqioqvincmgyfpi') errors.push('Wrong Preview project');
  if (evidence.featureFlagsOff !== true) errors.push('Feature flags must remain OFF');
  if (evidence.fullRestoreVerified !== true) errors.push('Full independent restore not verified');
  if (evidence.unsafeRoleGrantsRemediatedAndVerified !== true) errors.push('Unsafe user_roles grants not remediated and verified');
  if (evidence.ownerAuthorizedPreviewSql !== true) errors.push('Separate explicit Preview SQL authorization missing');
  if (evidence.jwtPositiveNegativeTestsVerified !== true) errors.push('JWT-backed positive and negative tests missing');
  if (evidence.ciPassed !== true) errors.push('Exact candidate CI not verified');
  const cases = evidence.cases;
  if (!Array.isArray(cases)) errors.push('Cases array missing');
  else {
    const seen = new Set();
    for (const c of cases) {
      if (!c || typeof c !== 'object' || !CASE_IDS.includes(c.id) || seen.has(c.id)) {
        errors.push('Unknown, duplicate or malformed case'); continue;
      }
      seen.add(c.id);
      if (c.status !== 'PASS') errors.push(c.id + ': not PASS');
      if (!UTC.test(c.timestampUtc ?? '') || !Number.isFinite(Date.parse(c.timestampUtc))) errors.push(c.id + ': UTC timestamp missing');
      for (const field of ['actorAlias', 'operation', 'expected', 'actual', 'auditEvidenceRef', 'reviewer']) {
        if (typeof c[field] !== 'string' || !c[field].trim()) errors.push(c.id + ': missing ' + field);
      }
    }
    for (const id of CASE_IDS) if (!seen.has(id)) errors.push(id + ': missing');
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw Error('Expected one local JSON evidence file');
    const errors = validateEvidence(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    if (errors.length) {
      console.error('NO-GO: ' + errors.join('; ')); process.exitCode = 1;
    } else {
      console.log('Evidence shape verified; NOT authorization to migrate, merge, deploy or activate.');
    }
  } catch (error) {
    console.error('NO-GO: ' + error.message); process.exitCode = 1;
  }
}
