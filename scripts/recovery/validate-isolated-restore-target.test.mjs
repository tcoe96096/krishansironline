import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRestoreTarget} from './validate-isolated-restore-target.mjs';

const isolated = 'abcdefghijklmnopqrst';
const good = {
  projectRef: isolated,
  confirmProjectRef: isolated,
  host: `db.${isolated}.supabase.co`,
  user: 'postgres',
  database: 'postgres',
  port: '5432'
};
test('allows explicit isolated destination identity without connecting', () => {
  assert.deepEqual(validateRestoreTarget(good), {ok:true, errors:[]});
});
test('rejects production and preview project references', () => {
  for (const ref of ['vsqwlkqqsxcehvdsdbna','zgpkmfqioqvincmgyfpi']) {
    const result = validateRestoreTarget({...good,projectRef:ref,confirmProjectRef:ref,host:`db.${ref}.supabase.co`});
    assert.equal(result.ok,false);
    assert.ok(result.errors.includes('PROTECTED_PROJECT_REF'));
  }
});
test('rejects missing and mismatched confirmation', () => {
  for (const confirmation of ['', 'different']) {
    assert.equal(validateRestoreTarget({...good,confirmProjectRef:confirmation}).ok,false);
  }
});
test('rejects untrusted host, user, database and port', () => {
  for (const changed of [{host:'localhost'},{host:'db.vsqwlkqqsxcehvdsdbna.supabase.co'},{user:'postgres.vsqwlkqqsxcehvdsdbna'},{database:'postgres;DROP'},{port:6543}]) {
    assert.equal(validateRestoreTarget({...good,...changed}).ok,false);
  }
});
test('rejects missing destination identity', () => {
  assert.equal(validateRestoreTarget({}).ok,false);
});
