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
