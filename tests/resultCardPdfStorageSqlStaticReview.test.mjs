import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(
 'docs/results/ksol-result-pdf-private-bucket-CANDIDATE-DO-NOT-APPLY.sql','utf8'
);

test('private PDF bucket is a single review-only transaction',()=>{
 assert.match(sql,/REVIEW_ONLY \/ DO NOT APPLY/);
 assert.equal((sql.match(/^BEGIN;$/gm)||[]).length,1);
 assert.equal((sql.match(/^COMMIT;$/gm)||[]).length,1);
 const tail=sql.split(/^COMMIT;$/m)[1]??'';
 assert.ok(tail.split(/\r?\n/).every(line=>line.trim()===''||line.trim().startsWith('--')));
});

test('dedicated PDF-only private bucket and 10 MB limit',()=>{
 assert.match(sql,/'result-cards-private'/);
 assert.match(sql,/\bfalse,\s*10485760,\s*ARRAY\['application\/pdf'\]/s);
 assert.doesNotMatch(sql,/\btrue,\s*10485760,/);
});

test('existing bucket requires explicit human review, not silent reuse',()=>{
 assert.match(sql,/IF EXISTS\s*\([\s\S]*storage\.buckets/);
 assert.match(sql,/id='result-cards-private' OR name='result-cards-private'/);
 assert.match(sql,/RAISE EXCEPTION 'Result card bucket already exists/);
 assert.doesNotMatch(sql,/ON CONFLICT\s*\([^)]*\)\s*DO NOTHING/i);
});

test('does not introduce direct storage policies or client file access',()=>{
 assert.doesNotMatch(sql,/^\s*CREATE POLICY\b/im);
 assert.doesNotMatch(sql,/^\s*GRANT\s+.*\bstorage\.objects\b/im);
 assert.doesNotMatch(sql,/teacher-profile-photos-private'/);
 assert.doesNotMatch(sql,/teacher-resumes-private'/);
});
