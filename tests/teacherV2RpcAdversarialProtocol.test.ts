import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const protocol = readFileSync('docs/reviews/teacher-v2-rpc-adversarial-acceptance-2026-11-19.md', 'utf8');

test('authenticated teacher RPC acceptance covers identity isolation and all three RPCs', () => {
  for (const name of ['teacher_v2_save_application', 'teacher_v2_snapshot', 'teacher_v2_review']) {
    assert.ok(protocol.includes('`' + name + '`'), 'missing RPC: ' + name);
  }
  for (const caseName of [
    'anonymous', 'applicant A', 'applicant B', 'teacher A', 'teacher B',
    'authorized reviewer', 'revoked reviewer', 'forged', 'stale version',
    'direct table SELECT', 'cross-owner', 'concurrent', 'retries'
  ]) {
    assert.ok(protocol.toLowerCase().includes(caseName.toLowerCase()), 'missing adversarial scenario: ' + caseName);
  }
});

test('runtime evidence cannot be confused with static CI or mock acceptance', () => {
  for (const required of [
    'NOT TESTED', 'never PASS', 'Auth JWTs', 'database state delta',
    'Storage access checks', 'full restore', 'feature flags OFF',
    'distinct explicit owner authorization', 'NO-GO'
  ]) {
    assert.ok(protocol.includes(required), 'missing release safeguard: ' + required);
  }
  assert.match(protocol, /do not run these cases on the existing Preview/i);
  assert.match(protocol, /no Preview\/Production mutation/i);
});
