import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const reviewPath = 'docs/reviews/teacher-v2-backend-merge-readiness-2026-11-18.md';
const proposed = 'docs/proposed-migrations/';
const sequence = [
 'teacher_management_v2_schema_REVIEW_ONLY.sql',
 'teacher_management_v2_beta_flags_REVIEW_ONLY.sql',
 'teacher_management_v2_profile_rpc_REVIEW_ONLY.sql',
 'teacher_management_v2_functions_REVIEW_ONLY.sql',
 'teacher_management_v2_lifecycle_REVIEW_ONLY.sql',
 'teacher_v2_independent_verification_REVIEW_ONLY.sql',
 'teacher_v2_verification_writer_REVIEW_ONLY.sql',
 'teacher_v2_review_independent_evidence_OVERRIDE_REVIEW_ONLY.sql',
 'teacher_v2_final_rpc_grants_REVIEW_ONLY.sql',
];

test('candidate teacher-only backend order is explicit and every proposed file exists', () => {
 const document = readFileSync(reviewPath, 'utf8');
 const section = document.split('5. **Review-only SQL installation order:**')[1]?.split('\n6.')[0];
 assert.ok(section, 'review-only ordering section must remain present');
 let lastIndex = -1;
 for (const filename of sequence) {
  assert.ok(existsSync(proposed + filename), 'missing reviewed candidate: ' + filename);
  const index = section.indexOf(filename);
  assert.ok(index > lastIndex, 'missing or out-of-order candidate: ' + filename);
  lastIndex = index;
 }
 assert.ok(!section.includes('teacher_management_v2_integration_REVIEW_ONLY.sql'),
  'Core Beta must not install study-material integration SQL');
 assert.match(document, /NO-GO for backend activation/i);
 assert.match(document, /separate.*owner.*decision/i);
});

test('review and verification overrides must precede final RPC grants', () => {
 const last = sequence.at(-1);
 assert.equal(last, 'teacher_v2_final_rpc_grants_REVIEW_ONLY.sql');
 assert.ok(sequence.indexOf('teacher_v2_review_independent_evidence_OVERRIDE_REVIEW_ONLY.sql')
  < sequence.indexOf(last!));
 assert.ok(sequence.indexOf('teacher_v2_verification_writer_REVIEW_ONLY.sql')
  < sequence.indexOf(last!));
});
