import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Production GitHub Pages activates only core Teacher Registration, never advanced tools',()=>{
 const workflow=readFileSync('.github/workflows/pages.yml','utf8');
 assert.match(workflow,/VITE_SUPABASE_URL:.*vars\.VITE_SUPABASE_URL/);
 assert.match(workflow,/VITE_SUPABASE_PUBLISHABLE_KEY:.*vars\.VITE_SUPABASE_PUBLISHABLE_KEY/);
 assert.match(workflow,/VITE_TEACHER_BETA_ENABLED:\s*'true'/);
 for(const key of ['ADVANCED','RESULT_ANALYTICS','RESUME','PHOTO']){
  assert.ok(workflow.includes('VITE_TEACHER_'+key+'_ENABLED: \'false\''),'Unsafe feature toggle '+key);
 }
 assert.match(workflow,/branches: \["main"\]/);
});
test('Production SQL migration supports databases with no legacy result_staff_grants table',()=>{
 const sql=readFileSync('docs/proposed-migrations/teacher_management_v2_lifecycle_REVIEW_ONLY.sql','utf8');
 assert.match(sql,/to_regclass\('public\.result_staff_grants'\)/);
 assert.doesNotMatch(sql,/'public\.result_staff_grants'::(?:pg_catalog\.)?regclass/);
});
test('Super Admin can access staff portal while teacher authorization stays server-side',()=>{
 const context=readFileSync('src/context/AuthContext.tsx','utf8');
 assert.match(context,/\.in\('role', \['admin', 'super_admin'\]\)/);
 assert.match(context,/\.limit\(1\)/);
 const admin=readFileSync('src/components/AdminTeacherDirectoryV2.tsx','utf8');
 assert.match(admin,/teacherCall<boolean>\('is_super_admin'\)/);
});
