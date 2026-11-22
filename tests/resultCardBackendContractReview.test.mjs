import test from 'node:test';
import assert from 'node:assert/strict';

// Pure fail-closed contract model. No DB connection and no production claims.
const permit = (x) => Boolean(
  x.authenticated && x.active && x.eligible && x.owns &&
  x.released && !x.revoked && !x.withdrawn &&
  Number.isSafeInteger(x.requestedVersion) && x.requestedVersion > 0 &&
  Number.isSafeInteger(x.currentVersion) && x.currentVersion > 0 &&
  x.requestedVersion === x.currentVersion && x.objectPrivate &&
  x.sessionValid
);
const base = Object.freeze({
  authenticated:true, active:true, eligible:true, owns:true,
  released:true, revoked:false, withdrawn:false,
  requestedVersion:3, currentVersion:3, objectPrivate:true,
  sessionValid:true
});
test('only a current, owned, released, non-revoked private result is accessible', () => {
  assert.equal(permit(base), true);
});
for (const [field, value] of Object.entries({
  authenticated:false, active:false, eligible:false, owns:false,
  released:false, revoked:true, withdrawn:true,
  requestedVersion:2, objectPrivate:false, sessionValid:false
})) {
  test('fail closed when '+field+'='+value, () => {
    assert.equal(permit({...base,[field]:value}), false);
  });
}
test('untrusted client role cannot override access decision', () => {
  assert.equal(permit({...base,owns:false,clientRole:'super_admin'}), false);
});
test('teacher assignment never grants student download implicitly', () => {
  assert.equal(permit({...base,owns:false,teacherAssigned:true}), false);
});
test('revocation overrides previously valid access on every new request', () => {
  assert.equal(permit(base),true);
  assert.equal(permit({...base,revoked:true}),false);
});
const transition = ({actorAuthorized, expectedVersion, actualVersion, state, action}) => {
  if (actorAuthorized !== true ||
      !Number.isSafeInteger(expectedVersion) || expectedVersion <= 0 ||
      !Number.isSafeInteger(actualVersion) || actualVersion <= 0 ||
      expectedVersion !== actualVersion) return 'DENY';
  if (action==='release' && state==='approved') return 'released';
  if (action==='revoke' && state==='released') return 'revoked';
  return 'DENY';
};
test('release and revoke require authorized actor and matching version', () => {
  assert.equal(transition({actorAuthorized:true,expectedVersion:2,actualVersion:2,state:'approved',action:'release'}),'released');
  assert.equal(transition({actorAuthorized:true,expectedVersion:2,actualVersion:2,state:'released',action:'revoke'}),'revoked');
  assert.equal(transition({actorAuthorized:false,expectedVersion:2,actualVersion:2,state:'approved',action:'release'}),'DENY');
  assert.equal(transition({actorAuthorized:true,expectedVersion:1,actualVersion:2,state:'approved',action:'release'}),'DENY');
});
// Pure model: validate replay identity and digest BEFORE any deduplication.
// The database implementation must additionally enforce unique(actor,action,key)
// under concurrent transactions; this function cannot prove database atomicity.
const validActor = (x) => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const validDigest = (x) => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);
const validKey = (x) => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const replay = (prior, actor, action, key, digest) => {
  if (!validActor(actor) || !['release','revoke'].includes(action) ||
      !validKey(key) || !validDigest(digest)) return 'DENY_INVALID';
  if (!prior) return 'NEW';
  if (!validActor(prior.actor) || !['release','revoke'].includes(prior.action) ||
      !validKey(prior.key) || !validDigest(prior.digest)) return 'DENY_INVALID';
  if (prior.actor===actor && prior.action===action && prior.key===key)
    return prior.digest===digest ? 'SAME_OUTCOME' : 'DENY_CONFLICT';
  return 'NEW';
};
const actor='11111111-1111-4111-8111-111111111111';
const key='22222222-2222-4222-8222-222222222222';
const digestA='a'.repeat(64);
const digestB='b'.repeat(64);
test('idempotency replay is scoped to actor, action, key and digest', () => {
  const p={actor,action:'release',key,digest:digestA};
  assert.equal(replay(p,actor,'release',key,digestA),'SAME_OUTCOME');
  assert.equal(replay(p,actor,'release',key,digestB),'DENY_CONFLICT');
  assert.equal(replay(p,actor,'revoke',key,digestA),'NEW');
  assert.equal(replay(p,'33333333-3333-4333-8333-333333333333','release',key,digestA),'NEW');
});
test('idempotency rejects absent or malformed identity, action, key and digest', () => {
  assert.equal(replay(null,actor,'release',key,digestA),'NEW');
  for (const value of [undefined,null,'',{},'not-a-uuid']) {
    assert.equal(replay(null,value,'release',key,digestA),'DENY_INVALID');
    assert.equal(replay(null,actor,'release',value,digestA),'DENY_INVALID');
  }
  for (const value of [undefined,null,'',0,'xyz','a'.repeat(63)]) {
    assert.equal(replay(null,actor,'release',key,value),'DENY_INVALID');
  }
  for (const action of [undefined,null,'', 'approve', 'RELEASE']) {
    assert.equal(replay(null,actor,action,key,digestA),'DENY_INVALID');
  }
  assert.equal(replay({actor,action:'release',key,digest:undefined},actor,'release',key,digestA),'DENY_INVALID');
});
test('reject ambiguous identity/version and stale access', () => {
  for (const field of ['requestedVersion','currentVersion']) {
    assert.equal(permit({...base,[field]:undefined}),false);
    assert.equal(permit({...base,[field]:Number.MAX_SAFE_INTEGER+1}),false);
  }
  assert.equal(permit({...base,owns:false,clientStudentId:'victim'}),false);
  assert.equal(permit({...base,sessionValid:false,owns:true}),false);
});

test('fail closed on absent, invalid or ambiguous version identifiers', () => {
  const invalid = [undefined, null, NaN, Infinity, -1, 0, '3', 3.5, {}, []];
  for (const value of invalid) {
    assert.equal(permit({...base,requestedVersion:value,currentVersion:value}), false, String(value));
    assert.equal(transition({actorAuthorized:true,expectedVersion:value,actualVersion:value,state:'approved',action:'release'}),'DENY',String(value));
  }
  assert.equal(permit({...base,requestedVersion:undefined,currentVersion:undefined}), false);
});
test('fail closed on missing or untrusted publisher authorization', () => {
  for (const actorAuthorized of [undefined,null,0,1,'true',false]) {
    assert.equal(transition({actorAuthorized,expectedVersion:3,actualVersion:3,state:'approved',action:'release'}),'DENY');
  }
});

/**
 * Canonical ledger replay must bind target and version as well as the digest.
 * This remains a pure model; it cannot prove database locks or isolation.
 */
const strictReplay = (prior, request) => {
  if (!request || !validActor(request.actor) ||
      !['release','revoke'].includes(request.action) ||
      !validKey(request.key) || !validKey(request.attemptId) ||
      !Number.isSafeInteger(request.expectedVersion) ||
      request.expectedVersion <= 0 || !validDigest(request.digest)) {
    return 'DENY_INVALID';
  }
  if (!prior) return 'NEW';
  if (!validActor(prior.actor) || !['release','revoke'].includes(prior.action) ||
      !validKey(prior.key) || !validKey(prior.attemptId) ||
      !Number.isSafeInteger(prior.expectedVersion) ||
      prior.expectedVersion <= 0 || !validDigest(prior.digest)) {
    return 'DENY_INVALID';
  }
  if (prior.actor !== request.actor || prior.action !== request.action ||
      prior.key !== request.key) return 'NEW';
  return prior.digest === request.digest &&
    prior.attemptId === request.attemptId &&
    prior.expectedVersion === request.expectedVersion
    ? 'SAME_OUTCOME' : 'DENY_CONFLICT';
};
test('replay never accepts same digest with changed attempt or version', () => {
  const p = {
    actor, action:'release', key,
    attemptId:'44444444-4444-4444-8444-444444444444',
    expectedVersion:3, digest:digestA
  };
  assert.equal(strictReplay(p,{...p}), 'SAME_OUTCOME');
  assert.equal(strictReplay(p,{...p,attemptId:'55555555-5555-4555-8555-555555555555'}), 'DENY_CONFLICT');
  assert.equal(strictReplay(p,{...p,expectedVersion:4}), 'DENY_CONFLICT');
  assert.equal(strictReplay(p,{...p,digest:digestB}), 'DENY_CONFLICT');
  assert.equal(strictReplay(p,{...p,attemptId:undefined}), 'DENY_INVALID');
  assert.equal(strictReplay(p,{...p,expectedVersion:undefined}), 'DENY_INVALID');
  assert.equal(strictReplay(p,{...p,expectedVersion:0}), 'DENY_INVALID');
  assert.equal(strictReplay({...p,expectedVersion:undefined},p), 'DENY_INVALID');
});

// A SHA-256 digest in this contract is canonical lowercase hex, not a
// case-insensitive string. Mixed-case digests cannot bypass ledger matching.
test('canonical SHA-256 rejects uppercase, mixed-case and whitespace', () => {
  for (const invalid of ['A'.repeat(64), 'a'.repeat(63)+'B',
    ' '+digestA, digestA+' ', '0x'+digestA]) {
    assert.equal(replay(null,actor,'release',key,invalid),'DENY_INVALID');
    assert.equal(strictReplay(null,{
      actor,action:'release',key,
      attemptId:'44444444-4444-4444-8444-444444444444',
      expectedVersion:3,digest:invalid
    }),'DENY_INVALID');
  }
});
