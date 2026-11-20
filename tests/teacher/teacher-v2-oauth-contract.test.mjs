#!/usr/bin/env node
// Offline contract guard only: does not invoke OAuth or Supabase.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const contract = readFileSync(new URL('../../docs/teacher/teacher-v2-google-oauth-identity-contract-2026-11-20.md', import.meta.url), 'utf8');
const cases = [...contract.matchAll(/^\|\s*(O\d{2})\s*\|([^\n]*)/gm)];
test('Google OAuth Preview cases O01–O10 are unique and complete', () => {
  assert.deepEqual(cases.map(x => x[1]), Array.from({length:10},(_,i)=>'O'+String(i+1).padStart(2,'0')));
  for (const [,id,row] of cases) assert.ok(row.split('|').filter(Boolean).length >= 2, id+' lacks expected server result');
});
test('OAuth identity is not equivalent to teacher approval', () => {
  for (const term of ['auth.uid()', 'PKCE', 'pending', 'employee ID', 'reviewer', 'email changes', 'server-side']) {
    assert.ok(contract.toLowerCase().includes(term.toLowerCase()), 'missing boundary: '+term);
  }
});
test('private media and release gates are explicit', () => {
  for (const term of ['private bucket', 'signed URL', 'expiry', 'NO-GO', 'full restore', 'TRUNCATE', 'owner authorization', 'Feature flags']) {
    assert.ok(contract.toLowerCase().includes(term.toLowerCase()), 'missing gate: '+term);
  }
});
