import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const spec = readFileSync('docs/reviews/teacher-v2-private-media-authenticated-acceptance-2026-11-19.md', 'utf8');

test('private teacher media has server-owned identity and non-public access boundaries', () => {
  for (const term of ['auth.uid()', 'opaque object keys', 'private', 'No public URLs', 'service-role', 'independently verified server-side role check', 'storage.objects', 'permissive OR']) {
    assert.ok(spec.includes(term), `missing media authorization boundary: ${term}`);
  }
});

test('authenticated acceptance includes cross-user, persistence, revocation and direct API negatives', () => {
  for (const term of ['Anonymous upload/read/list', 'Teacher A refreshes/re-authenticates', "Teacher B guesses A's key", "Teacher A spoofs B's user ID", 'Revoked reviewer role', 'Direct `storage.objects` API access', 'Concurrent upload / interrupted upload', 'Wrong magic', 'expired signed URL']) {
    assert.ok(spec.includes(term), `missing media acceptance scenario: ${term}`);
  }
});

test('media acceptance cannot be mistaken for deployed or approved functionality', () => {
  for (const term of ['NO-GO', 'successful disposable-target restore', 'feature flags OFF', 'explicit owner approval', 'not implemented/activated', 'actual separate authenticated identities']) {
    assert.ok(spec.includes(term), `missing release gate: ${term}`);
  }
});
