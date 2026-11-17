import test from 'node:test';
import assert from 'node:assert/strict';
import {teacherLoginCallback} from '../src/lib/teacherLoginCallback';
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
