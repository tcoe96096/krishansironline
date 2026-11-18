import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('docs/proposed-migrations/teacher_v2_photo_storage_PREFLIGHT_READ_ONLY.sql','utf8');

test('teacher photo storage inventory is SELECT-only', () => {
  const statements = sql.replace(/--[^\n]*/g,'').split(';').map(s=>s.trim()).filter(Boolean);
  assert.equal(statements.length, 4);
  for (const statement of statements) {
    assert.match(statement, /^SELECT\b/i);
    const withoutStrings = statement.replace(/'(?:''|[^'])*'/g, "''");
    assert.doesNotMatch(withoutStrings,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY|EXECUTE)\b/i);
  }
});

test('teacher photo audit checks private bucket, RLS, grants and metadata', () => {
  for (const fragment of ['storage.buckets','b.public','file_size_limit','allowed_mime_types',
    'pg_policies','permissive','with_check','role_table_grants','information_schema.columns',
    'teacher_profiles','teacher_enrollment_requests',"'anon'","'authenticated'"]) {
    assert.ok(sql.includes(fragment),fragment);
  }
});
