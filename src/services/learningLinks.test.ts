import assert from 'node:assert/strict';
import test from 'node:test';
import { studyFiltersFromSearch, studyMaterialUrl } from './learningLinks';

test('generates a link with only known catalogue filters', () => {
  assert.equal(studyMaterialUrl('/preview/', {class_level:'10',subject:'History'}), '/preview/study-materials/?class=10&subject=History');
  assert.equal(studyMaterialUrl('/preview', {class_level:'10',subject:'Social Science'}), '/preview/study-materials/?class=10');
  assert.equal(studyMaterialUrl('/', {class_level:'99',subject:'History'}), '/study-materials/?subject=History');
});

test('rejects unexpected URL selectors and keeps safe values', () => {
  assert.deepEqual(studyFiltersFromSearch('?class=10&subject=History'), {classLevel:'10',subject:'History'});
  assert.deepEqual(studyFiltersFromSearch('?class=999&subject=%3Cscript%3E'), {});
  assert.deepEqual(studyFiltersFromSearch('?class=11&subject=unknown'), {classLevel:'11'});
});
