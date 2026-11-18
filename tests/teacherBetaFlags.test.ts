import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveTeacherBetaFlags} from '../src/lib/teacherBetaPolicy';
test('teacher Beta and all advanced features default off',()=>{
 assert.deepEqual(deriveTeacherBetaFlags({}),{core:false,advanced:false,analytics:false,resumes:false});
 assert.deepEqual(deriveTeacherBetaFlags({VITE_TEACHER_BETA_ENABLED:'false',VITE_TEACHER_ADVANCED_ENABLED:'true',VITE_TEACHER_RESUME_ENABLED:'true'}),{core:false,advanced:false,analytics:false,resumes:false});
});
test('core Beta can opt into resumes and analytics separately without enabling advanced work permissions',()=>{
 assert.deepEqual(deriveTeacherBetaFlags({VITE_TEACHER_BETA_ENABLED:'true',VITE_TEACHER_RESUME_ENABLED:'true',VITE_TEACHER_RESULT_ANALYTICS_ENABLED:'true'}),{core:true,advanced:false,analytics:true,resumes:true});
 assert.deepEqual(deriveTeacherBetaFlags({VITE_TEACHER_BETA_ENABLED:'true',VITE_TEACHER_RESUME_ENABLED:'true'}),{core:true,advanced:false,analytics:false,resumes:true});
 assert.deepEqual(deriveTeacherBetaFlags({VITE_TEACHER_BETA_ENABLED:'true',VITE_TEACHER_RESULT_ANALYTICS_ENABLED:'true'}),{core:true,advanced:false,analytics:true,resumes:false});
});
test('advanced flag alone never unlocks private documents or analytics, and core remains master off-switch',()=>{
 assert.deepEqual(deriveTeacherBetaFlags({VITE_TEACHER_BETA_ENABLED:'true',VITE_TEACHER_ADVANCED_ENABLED:'true'}),{core:true,advanced:true,analytics:false,resumes:false});
 assert.deepEqual(deriveTeacherBetaFlags({VITE_TEACHER_BETA_ENABLED:'false',VITE_TEACHER_ADVANCED_ENABLED:'true',VITE_TEACHER_RESUME_ENABLED:'true',VITE_TEACHER_RESULT_ANALYTICS_ENABLED:'true'}),{core:false,advanced:false,analytics:false,resumes:false});
});
test('feature flags require explicit exact true; partial or truthy strings never enable them',()=>{
 const enabled=deriveTeacherBetaFlags({VITE_TEACHER_BETA_ENABLED:'true',VITE_TEACHER_ADVANCED_ENABLED:'true',VITE_TEACHER_RESUME_ENABLED:'true',VITE_TEACHER_RESULT_ANALYTICS_ENABLED:'true'});
 assert.deepEqual(enabled,{core:true,advanced:true,analytics:true,resumes:true});
 assert.equal(deriveTeacherBetaFlags({VITE_TEACHER_BETA_ENABLED:'1'}).core,false);
});
test('server-owned feature states default off and client roles have no flag mutation permission',()=>{
 const sql=readFileSync('docs/proposed-migrations/teacher_management_v2_beta_flags_REVIEW_ONLY.sql','utf8');
 assert.ok(sql.includes('enabled boolean NOT NULL DEFAULT false'));
 assert.ok(sql.includes('REVOKE ALL ON private.teacher_beta_features FROM PUBLIC,anon,authenticated,service_role'));
 assert.ok(!/GRANT\s+(INSERT|UPDATE|DELETE)/i.test(sql));
});
test('server flags gate profile writes, approval/grants and advanced material access',()=>{
 const read=(name:string)=>readFileSync(`docs/proposed-migrations/teacher_management_v2_${name}_REVIEW_ONLY.sql`,'utf8');
 assert.ok(read('lifecycle').includes("IF NOT private.teacher_v2_feature_enabled('registration')"));
 assert.ok(read('lifecycle').includes("p_decision='approve' AND NOT private.teacher_v2_feature_enabled('registration')"));
 assert.ok(read('functions').includes("p_action='grant' AND NOT private.teacher_v2_feature_enabled('registration')"));
 assert.ok(read('functions').includes("p_work_type IN ('materials.review','assessment.draft')"));
 assert.ok(read('functions').includes("NOT private.teacher_v2_feature_enabled('advanced_assignments')"));
 assert.ok(read('functions').includes("p_work_type='result.review'"));
 assert.ok(read('functions').includes("NOT private.teacher_v2_feature_enabled('result_analytics')"));
 assert.ok(read('integration').includes("IF NOT private.teacher_v2_feature_enabled('material_authoring') THEN RETURN false"));
 assert.ok(!read('integration').includes('CREATE OR REPLACE FUNCTION public.teacher_v2_result_summary'));
});
test('core enrollment requires Super Admin legacy transition without weakening the existing grant audit',()=>{
 const sql=readFileSync('docs/proposed-migrations/teacher_management_v2_lifecycle_REVIEW_ONLY.sql','utf8');
 assert.ok(sql.includes("IF to_regclass('public.result_staff_grants') IS NOT NULL THEN"));
 assert.ok(sql.includes('Super Admin must close legacy staff access before v2 enrollment'));
 assert.ok(sql.includes('Legacy grant cannot bypass a v2 profile'));
 assert.ok(!sql.includes('UPDATE public.result_staff_grants SET is_active=false WHERE user_id=v_actor'));
 assert.ok(sql.includes("p_decision='approve' AND jsonb_array_length(p_assignments)=0"));
});
