import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freezeResultCohort,readFrozenResultCohort,formatPrivateResultSummary,type PrivacyAttempt} from '../src/services/teacherResultPrivacy';
const target={id:'test-a',classLevel:'10',subject:'History',closed:true};
const auth={approved:true,assignments:[{classLevel:'10',subject:'History',workType:'result.review',active:true}]};
const attempt=(student:number,score=70,number=1):PrivacyAttempt=>({id:`attempt-${student}-${number}`,testId:'test-a',studentId:`student-${student}`,attemptNumber:number,submittedAt:`2026-11-16T10:00:0${student}Z`,status:'submitted',percentage:score});
const five=()=>Array.from({length:5},(_,i)=>attempt(i));
const sql=readFileSync('docs/proposed-migrations/teacher_management_v2_result_privacy_REVIEW_ONLY.sql','utf8');

test('zero to four distinct contributors expose the same suppression state with no score or count',()=>{
 for(let size=0;size<5;size++){
  const release=freezeResultCohort(target,Array.from({length:size},(_,i)=>attempt(i,i*23)));
  const result=readFrozenResultCohort(release,target,auth);
  assert.deepEqual(result,{test_id:'test-a',availability:'suppressed',average_band:null});
  assert.deepEqual(Object.keys(result).sort(),['availability','average_band','test_id']);
 }
});
test('repeated attempts from fewer than five students cannot satisfy the threshold',()=>{
 const many=Array.from({length:30},(_,i)=>attempt(i%4,95,i+1));
 assert.equal(freezeResultCohort(target,many).availability,'suppressed');
});
test('five distinct students permit only a coarse band, not individual scores, exact means or exact counts',()=>{
 const result=readFrozenResultCohort(freezeResultCohort(target,five()),target,auth);
 assert.deepEqual(result,{test_id:'test-a',availability:'available',average_band:'60-<80'});
 for(const key of ['student_id','studentId','score','percentage','average_percentage','submitted_count','distinct_count'])assert.equal(key in result,false);
});
test('only each student first valid submitted attempt contributes; other tests and invalid attempts do not',()=>{
 const rows=[...five(),attempt(0,100,2),{...attempt(6,0),status:'expired'}, {...attempt(7,0),testId:'other-test'}, {...attempt(8,0),percentage:null},{...attempt(9,0),submittedAt:null}];
 assert.deepEqual(freezeResultCohort(target,rows),freezeResultCohort(target,five()));
 assert.throws(()=>freezeResultCohort({...target,closed:false},five()),/closed/);
});
test('new submissions, changed grades and deletions cannot create time-difference reports',()=>{
 const frozen=freezeResultCohort(target,five());
 const original=readFrozenResultCohort(frozen,target,auth);
 for(const changed of [[...five(),attempt(6,0)],five().map(a=>({...a,percentage:100})),[],five().slice(0,1)]){
  assert.deepEqual(readFrozenResultCohort(freezeResultCohort(target,changed,frozen),target,auth),original);
 }
});
test('suppressed cohorts never transition after late submissions, so an attacker cannot probe threshold crossings',()=>{
 const frozen=freezeResultCohort(target,five().slice(0,4));
 assert.equal(freezeResultCohort(target,[...five(),attempt(6,99)],frozen).availability,'suppressed');
});
test('filters and overlapping subset attempts cannot select a different contributor set',()=>{
 const frozen=freezeResultCohort(target,five());const original=readFrozenResultCohort(frozen,target,auth);
 for(const extras of [{studentIds:['student-1']},{excludedStudent:'student-0'},{from:'2026-11-16',to:'2026-11-17'},{attemptNumber:2},{school:'A'},{limit:1,offset:1}]){
  assert.deepEqual(readFrozenResultCohort(frozen,{...target,...extras},auth),original);
 }
 for(let i=0;i<5;i++)assert.deepEqual(freezeResultCohort(target,five().filter(a=>a.studentId!==`student-${i}`),frozen),frozen);
});
test('teacher needs fresh approved class, subject and result-review assignment',()=>{
 const frozen=freezeResultCohort(target,five());
 for(const bad of [{...auth,approved:false},{...auth,assignments:[]},{approved:true,assignments:[{...auth.assignments[0],active:false}]},{approved:true,assignments:[{...auth.assignments[0],classLevel:'12'}]},{approved:true,assignments:[{...auth.assignments[0],subject:'Geography'}]},{approved:true,assignments:[{...auth.assignments[0],workType:'materials.draft'}]}])assert.throws(()=>readFrozenResultCohort(frozen,target,bad),/Scoped result review required/);
});
test('test relabeling or a release for another test cannot move a cohort into a different scope',()=>{
 const frozen=freezeResultCohort(target,five());
 const newTarget={...target,subject:'Geography'},newAuth={approved:true,assignments:[{...auth.assignments[0],subject:'Geography'}]};
 assert.deepEqual(readFrozenResultCohort(frozen,newTarget,newAuth),{test_id:'test-a',availability:'not_released',average_band:null});
 assert.equal(readFrozenResultCohort({...frozen,testId:'another-test'},target,auth).availability,'not_released');
});
test('cohort decisions are independent of input order and duplicate attempts',()=>{
 const expected=freezeResultCohort(target,five());
 for(let i=0;i<5;i++){
  const rows=[...five().slice(i),...five().slice(0,i),...five().map(a=>({...a,attemptNumber:9,percentage:0}))];
  assert.deepEqual(freezeResultCohort(target,rows),expected);
 }
});
test('UI never renders historical one-student averages, invalid bands or suppressed values',()=>{
 assert.ok(!formatPrivateResultSummary({test_id:'x',submitted_count:1,average_percentage:87}).includes('87'));
 assert.ok(!formatPrivateResultSummary({availability:'suppressed',average_band:'80-100'}).includes('80-100'));
 assert.match(formatPrivateResultSummary({availability:'available',average_band:'exact-score-87'}),/unavailable/);
 assert.match(formatPrivateResultSummary({availability:'available',average_band:'60-<80'}),/60-<80/);
});
test('SQL reader has only scope selectors, reads immutable releases and never raw attempts',()=>{
 const reader=sql.slice(sql.indexOf('CREATE FUNCTION public.teacher_v2_result_summary'));
 assert.match(reader,/teacher_v2_has_active_assignment\(p_class,p_subject,'result.review'\)/);
 assert.ok(reader.includes('LEFT JOIN private.teacher_result_summary_releases'));
 assert.ok(!reader.includes('FROM public.test_attempts'));
 assert.ok(!/RETURNS TABLE\([^)]*(submitted_count|average_percentage|student_id)/.test(reader));
 assert.match(reader,/public.teacher_v2_result_summary\(p_class text,p_subject text\)/);
});
test('SQL freezes one canonical cohort and locks repeat releases; client roles cannot mutate releases',()=>{
 for(const invariant of ['DISTINCT ON (a.student_id)','IF v_count<5','pg_advisory_xact_lock','IF FOUND THEN RETURN v_state','FROM PUBLIC,anon,authenticated,service_role','Frozen summary releases are immutable','Super Admin required'])assert.ok(sql.includes(invariant),invariant);
 assert.ok(sql.includes('test_id text PRIMARY KEY'));
 assert.ok(sql.includes("INSERT INTO private.teacher_result_summary_audit"));
 assert.ok(!/GRANT.*(INSERT|UPDATE|DELETE).*teacher_result_summary_releases/i.test(sql));
});
