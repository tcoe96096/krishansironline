#!/usr/bin/env node
// Offline-only SQL audit guard; never connects to Supabase.
// This checks the committed review script, NOT runtime authorization.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../../docs/teacher/teacher-v2-preview-catalog-readonly.sql', import.meta.url), 'utf8');
const executable = source
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map(line => line.replace(/--.*$/, '')).join('\n')
  .trim();
const statements = executable.split(';').map(x => x.trim()).filter(Boolean);

test('catalog audit is a closed, read-only transaction with SELECT-only body', () => {
  assert.match(statements[0], /^BEGIN\s+TRANSACTION\s+READ\s+ONLY$/i);
  assert.match(statements.at(-1), /^ROLLBACK$/i);
  assert.ok(statements.length >= 7, 'expected full catalog inventory');
  for (const [index, statement] of statements.slice(1, -1).entries()) {
    assert.match(statement, /^SELECT\b/i, 'non-SELECT statement at ' + (index + 2));
    assert.doesNotMatch(statement, /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|GRANT|REVOKE|MERGE|CALL|DO|COPY|EXECUTE|PERFORM|LOCK|INTO|FOR\s+UPDATE|FOR\s+SHARE|pg_sleep|dblink|lo_export|set_config)\b/i);
  }
});

test('audit identifies all required RPCs, unsafe grants, and storage privacy', () => {
  for (const name of ['teacher_v2_save_application', 'teacher_v2_review', 'teacher_v2_snapshot']) {
    assert.ok(executable.includes(name), name);
  }
  for (const name of ['has_function_privilege', 'has_table_privilege', 'relrowsecurity', 'relforcerowsecurity', 'polwithcheck', 'storage.buckets', 'allowed_mime_types', "'TRUNCATE'", "'anon'", "'authenticated'"]) {
    assert.ok(executable.includes(name), name);
  }
});

test('audit is evidence collection only, not a substitute for runtime acceptance', () => {
  assert.match(source, /READ ONLY/i);
  assert.match(source, /STOP: no authenticated positive\/negative test/i);
});
