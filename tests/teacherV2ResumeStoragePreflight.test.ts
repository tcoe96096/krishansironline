import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('docs/proposed-migrations/teacher_v2_resume_storage_PREFLIGHT_READ_ONLY.sql','utf8');

test('resume storage preflight contains only read-only SELECT statements', () => {
  const statements = sql.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean);
  assert.equal(statements.length, 3);
  for (const statement of statements) {
    assert.match(statement, /^SELECT\b/i);
    const withoutStrings = statement.replace(/'(?:''|[^'])*'/g, "''");
    assert.doesNotMatch(withoutStrings, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY|EXECUTE)\b/i);
  }
});

test('resume preflight examines bucket privacy, policy coverage, and object grants', () => {
  for (const fragment of ['storage.buckets', 'b.public', 'file_size_limit',
    'allowed_mime_types', 'pg_policies', 'permissive', 'with_check',
    'role_table_grants', "'authenticated'", "'anon'"]) {
    assert.ok(sql.includes(fragment), fragment);
  }
});
