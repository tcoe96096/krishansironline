import test from 'node:test';
import assert from 'node:assert/strict';
import {teacherLoginCallback,teacherDashboardLoginCallback} from '../src/lib/teacherLoginCallback';
test('default portal redirects to its staff workspace',()=>{
 assert.equal(teacherLoginCallback('https://example.org','/teacher-beta/'),'https://example.org/teacher-beta/staff-workspace/');
});
test('nested Unified Preview redirects to nested staff workspace',()=>{
 assert.equal(teacherLoginCallback('https://tcoe96096.github.io','/krishansironline-preview-unified/teacher-beta/'),'https://tcoe96096.github.io/krishansironline-preview-unified/teacher-beta/staff-workspace/');
});
test('missing trailing slash is normalized',()=>{
 assert.equal(teacherLoginCallback('https://example.org','/teacher-beta'),'https://example.org/teacher-beta/staff-workspace/');
});

test('OAuth callback rejects external and traversal base paths',()=>{
 for(const base of ['https://evil.example/','//evil.example/','/teacher-beta/../admin/','/teacher-beta/%2e%2e/','/teacher-beta/%2Fadmin/','/teacher-beta/\\\\escape/','/teacher-beta/?redirect=evil','/teacher-beta/#fragment']) {
   assert.throws(()=>teacherLoginCallback('https://example.org',base),/./,`Unsafe base accepted: ${base}`);
 }
});
test('OAuth callback rejects malformed origins',()=>{
 for(const origin of ['https://example.org/other/','https://user:pass@example.org','javascript:alert(1)','https://example.org/?redirect=evil']) {
   assert.throws(()=>teacherLoginCallback(origin,'/teacher-beta/'),/./,`Unsafe origin accepted: ${origin}`);
 }
});
test('OAuth callback preserves a safe nested preview path',()=>{
 assert.equal(teacherLoginCallback('https://example.org','/preview/v2/teacher-beta/'),
   'https://example.org/preview/v2/teacher-beta/staff-workspace/');
});

test('OAuth callback rejects encoded and double-encoded path ambiguity',()=>{
 for(const base of ['/teacher-beta/%252e%252e/admin/','/teacher-beta/%255cadmin/','/teacher-beta/%41dmin/','/teacher-beta/%20/','/teacher-beta/%25/']) {
   assert.throws(()=>teacherLoginCallback('https://example.org',base),/Invalid teacher login base path\./,`Encoded base accepted: ${base}`);
 }
});

test('OAuth callback rejects origins normalized silently by URL parser',()=>{
 for(const origin of ['https://example.org\n','https://example.org\t','https://example.org\\evil','HTTPS://example.org','https://example.org:443','https://example.org//']) {
   assert.throws(()=>teacherLoginCallback(origin,'/teacher-beta/'),/Invalid teacher login origin\./,`Noncanonical origin accepted: ${JSON.stringify(origin)}`);
 }
});
test('OAuth callback accepts canonical origin with trailing slash',()=>{
 assert.equal(teacherLoginCallback('https://example.org/','/teacher-beta/'),'https://example.org/teacher-beta/staff-workspace/');
});

test('returning teacher Google login targets the same-origin dashboard, not the registration form',()=>{
  assert.equal(teacherDashboardLoginCallback('https://example.org','/teacher-beta/'),
    'https://example.org/teacher-beta/dashboard/');
  assert.equal(teacherDashboardLoginCallback('https://tcoe96096.github.io','/krishansironline-preview-unified/teacher-beta/'),
    'https://tcoe96096.github.io/krishansironline-preview-unified/teacher-beta/dashboard/');
});
test('dashboard callback inherits strict same-origin and traversal protections',()=>{
  for(const value of ['https://attacker.test/','//attacker.test/','/teacher-beta/../admin/','/teacher-beta/%2e%2e/'])
    assert.throws(()=>teacherDashboardLoginCallback('https://example.org',value),/Invalid teacher login base path/);
});
