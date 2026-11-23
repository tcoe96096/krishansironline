import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('docs/proposed-migrations/teacher_v2_storage_policy_composition_AUDIT_READ_ONLY.sql', 'utf8');

test('private teacher media audit inventories all storage object policies, not only teacher-named ones', () => {
  assert.match(sql, /FROM pg_catalog\.pg_policies AS p/i);
  assert.match(sql, /p\.schemaname\s*=\s*'storage'\s+AND p\.tablename\s*=\s*'objects'/i);
  assert.doesNotMatch(sql, /p\.policyname\s+(?:LIKE|ILIKE|=)/i);
  assert.match(sql, /p\.permissive\s*=\s*'PERMISSIVE'/i);
  assert.match(sql, /p\.roles\s*&&\s*ARRAY\['public','anon','authenticated'\]/i);
  assert.match(sql, /requires_manual_overlap_review/i);
});

test('private media audit inspects both buckets and remains read only', () => {
  assert.match(sql, /teacher-profile-photos-private/);
  assert.match(sql, /teacher-resumes-private/);
  assert.match(sql, /b\.public/);
  assert.match(sql, /b\.allowed_mime_types/);
  // SQL command names inside quoted pg_policies.cmd values are data, not executable DML.
  const executable = sql.replace(/--[^\n]*/g, '').replace(/'(?:''|[^'])*'/g, "''");
  assert.doesNotMatch(executable, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|CREATE|DROP|GRANT|REVOKE|CALL|DO)\b/i);
  assert.match(sql, /Empty inventory is NOT a PASS/i);
  assert.match(sql, /real anon, owner, other teacher, admin and reviewer/i);
});
