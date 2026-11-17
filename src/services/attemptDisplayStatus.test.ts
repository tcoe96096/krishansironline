import assert from 'node:assert/strict';
import { test } from 'node:test';
import { displayAttemptStatus } from './attemptDisplayStatus';

const now = Date.parse('2026-11-15T06:00:00.000Z');

test('an unfinished attempt past expires_at displays as overdue without changing stored status', () => {
  const saved = {status:'in_progress' as const, expires_at:'2026-11-12T07:00:00.000Z'};
  assert.equal(displayAttemptStatus(saved,now),'overdue');
  assert.equal(saved.status,'in_progress');
});

test('future timed attempts remain in progress', () => {
  assert.equal(displayAttemptStatus({status:'in_progress',expires_at:'2026-11-16T07:00:00.000Z'},now),'in_progress');
});

test('already-submitted or server-expired attempts retain their authoritative status', () => {
  assert.equal(displayAttemptStatus({status:'submitted',expires_at:'2026-11-10T07:00:00.000Z'},now),'submitted');
  assert.equal(displayAttemptStatus({status:'expired',expires_at:'2026-11-10T07:00:00.000Z'},now),'expired');
});

test('unknown, malformed and missing expiry never infer overdue', () => {
  assert.equal(displayAttemptStatus({status:'in_progress',expires_at:null},now),'in_progress');
  assert.equal(displayAttemptStatus({status:'in_progress',expires_at:'not-a-date'},now),'in_progress');
  assert.equal(displayAttemptStatus({status:'in_progress'},now),'in_progress');
});

test('attempt exactly at expiry is overdue', () => {
  assert.equal(displayAttemptStatus({status:'in_progress',expires_at:'2026-11-15T06:00:00.000Z'},now),'overdue');
});
