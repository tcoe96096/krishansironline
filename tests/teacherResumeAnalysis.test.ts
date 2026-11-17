import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeVerifiedResumeText} from '../src/lib/teacherResumeAnalysis';

test('extracts bounded suggestions but never invents institution or award year',()=>{
 const result=analyzeVerifiedResumeText('M.A. History, B.Ed., 8 years teaching experience. Lesson Planning, Classroom Management and Research.');
 assert.equal(result.requiresReview,true);
 assert.equal(result.experienceYears,8);
 assert.deepEqual(result.qualifications.map(q=>q.title),['MA','BED']);
 assert.ok(result.qualifications.every(q=>q.institution===''&&q.year===0));
 assert.ok(result.skills.includes('Lesson Planning'));
 assert.ok(result.skills.includes('Research'));
});
test('unknown or excessive scanner output fails closed without extraction',()=>{
 for(const input of [null,{},'x'.repeat(32769)])assert.deepEqual(analyzeVerifiedResumeText(input),{qualifications:[],experienceYears:null,skills:[],requiresReview:true});
});
test('implausible experience is not accepted as verified',()=>{
 const result=analyzeVerifiedResumeText('99 years experience, B.Sc. in Geography');
 assert.equal(result.experienceYears,null);
 assert.equal(result.requiresReview,true);
});
