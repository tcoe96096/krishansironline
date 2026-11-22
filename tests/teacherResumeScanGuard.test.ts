import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isTeacherResumeScanSummary} from '../src/lib/teacherResumeScanSummary';

const read=(path:string)=>readFileSync(path,'utf8');

test('Untrusted resume scan RPC must return consistent nonnegative counts',()=>{
 const good={total:6,reserved:1,uploaded:5,pending_scan:2,clean:2,infected:1,error:0,verified:1};
 assert.equal(isTeacherResumeScanSummary(good),true);
 assert.equal(isTeacherResumeScanSummary({total:0,reserved:0,uploaded:0,pending_scan:0,clean:0,infected:0,error:0,verified:0}),true);
 for(const bad of [
  {...good,total:7},{...good,uploaded:4},{...good,verified:3},
  {...good,clean:-1},{...good,reserved:1.5},
  {...good,verified:'1'},{...good,pending_scan:Infinity},
  null,[],{},'error'
 ])assert.equal(isTeacherResumeScanSummary(bad),false);
});

test('Resume verification cannot be asserted without clean byte-level scan evidence',()=>{
 const sql=read('docs/proposed-migrations/teacher_v2_resume_quarantine_scan_gate_REVIEW_ONLY.sql');
 assert.match(sql,/ADD COLUMN scan_status text NOT NULL DEFAULT 'pending'/);
 assert.match(sql,/scan_status IN \('clean','infected','error'\)/);
 assert.match(sql,/ADD CONSTRAINT teacher_resume_verification_requires_clean_scan CHECK/);
 assert.match(sql,/verification_status <> 'verified'/);
 assert.match(sql,/scan_status='clean'/);
 assert.match(sql,/scan_completed_at IS NOT NULL/);
 assert.match(sql,/scan_sha256 ~ '\^\[0-9a-f\]\{64\}\$'/);
 assert.match(sql,/has_table_privilege\('authenticated','public\.teacher_resume_documents','UPDATE'\)/);
 assert.doesNotMatch(sql,/CREATE POLICY.*FOR (UPDATE|DELETE)/);
 assert.doesNotMatch(sql,/GRANT UPDATE ON (TABLE )?public\.teacher_resume_documents TO authenticated/);
});

test('Owner or Super Admin read-only scan status: no files and no anonymous access',()=>{
 const sql=read('docs/proposed-migrations/teacher_v2_resume_quarantine_scan_gate_REVIEW_ONLY.sql');
 assert.match(sql,/auth\.uid\(\)<>p_teacher_user_id AND NOT coalesce\(public\.is_super_admin\(\),false\)/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.teacher_v2_resume_scan_summary\(uuid\)/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.teacher_v2_resume_scan_summary\(uuid\)/);
 const body=sql.slice(sql.indexOf('CREATE FUNCTION public.teacher_v2_resume_scan_summary'),sql.indexOf('REVOKE ALL ON FUNCTION'));
 assert.doesNotMatch(body,/storage_path|original_filename|scan_sha256/);
 assert.match(body,/SECURITY DEFINER SET search_path=''/);
});

test('Existing Teacher and Admin views display quarantined status but never download private resume',()=>{
 const owner=read('teacher-beta/TeacherDashboardData.tsx');
 const admin=read('src/components/AdminTeacherDirectoryV2.tsx');
 const component=read('src/components/TeacherResumeScanSummary.tsx');
 assert.match(owner,/summary\.resumeRecords\.length>0&&<TeacherResumeScanSummary teacherUserId=\{userId\}\/>/);
 assert.match(admin,/p\.resumes\.length>0&&<TeacherResumeScanSummary teacherUserId=\{p\.user_id\}\/>/);
 assert.match(component,/teacher_v2_resume_scan_summary/);
 assert.match(component,/isTeacherResumeScanSummary/);
 assert.doesNotMatch(component,/\.download\(|createSignedUrl|getPublicUrl|storage\.from\(/);
 const pages=read('.github/workflows/pages.yml');
 assert.match(pages,/VITE_TEACHER_RESUME_ENABLED:\s*'false'/);
});
