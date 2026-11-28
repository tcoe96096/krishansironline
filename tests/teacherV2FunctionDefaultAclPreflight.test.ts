import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('docs/proposed-migrations/teacher_v2_function_default_acl_PREFLIGHT_READ_ONLY.sql','utf8');

test('teacher v2 function default ACL audit is SELECT-only', () => {
  const withoutComments = sql.replace(/--[^\n]*/g, '');
  const statements = withoutComments.split(';').map(s => s.trim()).filter(Boolean);
  assert.equal(statements.length, 2);
  for (const statement of statements) {
    assert.match(statement, /^SELECT\b|^WITH\b/i);
    const stripped = statement.replace(/'(?:''|[^'])*'/g, "''");
    assert.doesNotMatch(stripped, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY)\b/i);
  }
});

test('teacher v2 function audit covers PUBLIC and inherited effective EXECUTE plus future defaults', () => {
  for (const fragment of ['pg_catalog.pg_proc', 'pg_catalog.pg_default_acl',
    'has_function_privilege', "'PUBLIC'", "'anon'", "'authenticated'",
    'prosecdef', 'proacl IS NULL', 'defaclrole', 'defaclnamespace', "defaclobjtype='f'"]) {
    assert.ok(sql.includes(fragment), fragment);
  }
});
