import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  'docs/proposed-migrations/teacher_v2_storage_policy_composition_PREFLIGHT_READ_ONLY.sql',
  'utf8',
);

test('teacher media storage policy composition inventory is read-only', () => {
  const withoutComments = sql.replace(/--[^\n]*/g, '');
  const statements = withoutComments.split(';').map(s => s.trim()).filter(Boolean);
  assert.equal(statements.length, 1);
  for (const statement of statements) {
    assert.match(statement, /^SELECT\b/i);
    const withoutStrings = statement.replace(/'(?:''|[^'])*'/g, "''");
    assert.doesNotMatch(withoutStrings,
      /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY)\b/i);
  }
});

test('teacher media inventory exposes complete policy OR/AND semantics', () => {
  for (const fragment of [
    'pg_catalog.pg_policy', 'polpermissive', 'PERMISSIVE_OR', 'RESTRICTIVE_AND',
    'polroles', 'pg_catalog.pg_get_expr', 'polqual', 'polwithcheck',
    'storage', 'objects', 'buckets', 'relrowsecurity', 'relforcerowsecurity',
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL', 'PUBLIC',
  ]) {
    assert.ok(sql.includes(fragment), `Missing required audit fragment: ${fragment}`);
  }
});
