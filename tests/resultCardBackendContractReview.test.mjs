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
const replay = (prior, actor, action, key, digest) => {
  if (!prior) return 'NEW';
  if (prior.actor===actor && prior.action===action && prior.key===key)
    return prior.digest===digest ? 'SAME_OUTCOME' : 'DENY_CONFLICT';
  return 'NEW';
};
test('same idempotency key and changed payload fail closed', () => {
  const p={actor:'admin1',action:'release',key:'request1',digest:'abc'};
  assert.equal(replay(p,'admin1','release','request1','abc'),'SAME_OUTCOME');
  assert.equal(replay(p,'admin1','release','request1','def'),'DENY_CONFLICT');
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
