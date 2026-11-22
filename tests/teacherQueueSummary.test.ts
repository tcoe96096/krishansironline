import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isTeacherQueueSummary} from '../src/lib/teacherQueueSummary';

test('Teacher queue summary validates authoritative totals, not page counts',()=>{
 const valid={total:8,pending:2,drafts:1,approved:3,rejected:1,suspended:1};
 assert.equal(isTeacherQueueSummary(valid),true);
 assert.equal(isTeacherQueueSummary({total:0,pending:0,drafts:0,approved:0,rejected:0,suspended:0}),true);
 for(const corrupt of [
   {...valid,total:7},{...valid,pending:-1},{...valid,drafts:1.5},
   {...valid,total:Number.NaN},{...valid,approved:'3'},null,[],{},
   {total:1,pending:1,drafts:0,approved:0,rejected:0}
 ])assert.equal(isTeacherQueueSummary(corrupt),false);
});

test('Only Super Admin may get queue counters, with no applicant PII',()=>{
 const sql=readFileSync('docs/proposed-migrations/teacher_v2_admin_queue_summary_REVIEW_ONLY.sql','utf8');
 assert.match(sql,/CREATE FUNCTION public\.teacher_v2_queue_summary\(\)/);
 assert.match(sql,/auth\.uid\(\) IS NULL OR NOT coalesce\(public\.is_super_admin\(\),false\)/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.teacher_v2_queue_summary\(\) FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.teacher_v2_queue_summary\(\) TO authenticated/);
 assert.match(sql,/SECURITY DEFINER/);
 assert.match(sql,/submitted_at IS NOT NULL/);
 assert.match(sql,/submitted_at IS NULL/);
 assert.doesNotMatch(sql,/contact_email|storage_path|phone|raw_user_meta_data/);
});

test('Admin keeps directory available if optional queue counters are unavailable',()=>{
 const ui=readFileSync('src/components/AdminTeacherDirectoryV2.tsx','utf8');
 assert.match(ui,/teacherCall<boolean>\('is_super_admin'\)/);
 assert.match(ui,/teacherCall<unknown>\('teacher_v2_queue_summary'\)\.catch\(\(\)=>null\)/);
 assert.match(ui,/setQueueError\(!isTeacherQueueSummary\(summary\)\)/);
 assert.match(ui,/aria-label="Teacher application queue summary"/);
 assert.match(ui,/Submitted · Awaiting Review/);
 assert.match(ui,/Drafts are not submitted applications/);
});
