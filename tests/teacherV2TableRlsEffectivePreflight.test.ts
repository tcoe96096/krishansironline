import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('docs/proposed-migrations/teacher_v2_table_rls_effective_PREFLIGHT_READ_ONLY.sql', 'utf8');
const statements = sql.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean);

test('teacher table privilege catalog preflight is strictly read-only', () => {
  assert.equal(statements.length, 1);
  assert.match(statements[0], /^SELECT\s/i);
  assert.doesNotMatch(statements[0], /\b(?:INSERT|UPDATE|DELETE|REVOKE|GRANT|ALTER|DROP|CREATE|TRUNCATE|EXECUTE|DO|CALL)\s+(?:ON|FROM|INTO|TABLE|FUNCTION|ROLE|POLICY|SCHEMA|\w+\s+SET)\b/i);
});

test('teacher table privilege preflight checks RLS, bypass and both browser roles', () => {
  for (const marker of ['relrowsecurity', 'relforcerowsecurity', 'rolbypassrls', 'relowner',
    "'anon'", "'authenticated'", "'TRUNCATE'", 'teacher_v2_%', 'user_roles']) {
    assert.ok(sql.includes(marker), 'missing catalog assertion: ' + marker);
  }
});
