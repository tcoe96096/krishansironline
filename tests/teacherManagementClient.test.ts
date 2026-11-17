import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTeacherClient} from '../src/services/teacherManagementClient';
const profile={displayName:'Test Teacher',contactEmail:'teacher@example.test',phone:'',experienceYears:3};
const qualifications=[{title:'MA History',institution:'Test University',year:2020},{title:'BEd',institution:'Test College',year:2022}];
const scopes=[{classLevel:'10',subject:'History',workType:'materials.draft'},{classLevel:'12',subject:'Political Science',workType:'result.review'}];
test('atomic application payload preserves all qualifications and scoped work without identity or privileged fields',async()=>{
 const calls:{name:string;args:Record<string,unknown>}[]=[];
 const client=createTeacherClient(async(name,args)=>{calls.push({name,args});return {data:4,error:null};});
 assert.equal(await client.save(profile,qualifications,scopes,' Please approve this teacher ',true),4);
 assert.deepEqual(calls,[{name:'teacher_v2_save_application',args:{p_profile:profile,p_qualifications:qualifications,p_scopes:scopes,p_reason:'Please approve this teacher',p_submit:true,p_expected_revision:null}}]);
});
test('invalid data, publication escalation and empty submissions never call the backend',async()=>{
 let calls=0;const client=createTeacherClient(async()=>{calls++;return {data:null,error:null};});
 await assert.rejects(client.save({...profile,experienceYears:-1},qualifications,scopes,'Valid application reason',true));
 await assert.rejects(client.save(profile,qualifications,[{...scopes[0],workType:'results.publish'}],'Valid application reason',true));
 await assert.rejects(client.save(profile,qualifications,[],'Valid application reason',true));
 await assert.rejects(client.save(profile,[{...qualifications[0],year:2200}],scopes,'Valid application reason',true));
 assert.equal(calls,0);
});
test('draft saves accept empty preferences and backend failures never claim success',async()=>{
 const client=createTeacherClient(async()=>({data:1,error:null}));
 assert.equal(await client.save(profile,[],[],'',false),1);
 const denied=createTeacherClient(async()=>({data:99,error:{code:'42501',message:'secret SQL token'}}));
 await assert.rejects(denied.save(profile,[],[],'',false),/denied or unavailable/);
 const missing=createTeacherClient(async()=>({data:null,error:{code:'PGRST202'}}));
 await assert.rejects(missing.call('teacher_v2_snapshot'),/owner-approved activation/);
});
test('empty success response cannot claim a persisted profile',async()=>{
 const client=createTeacherClient(async()=>({data:null,error:null}));
 await assert.rejects(client.save(profile,[],[],'',false),/not confirmed/);
});
test('saved profile revision accompanies updates and a conflict requests reload',async()=>{
 let payload:Record<string,unknown>|undefined;
 const client=createTeacherClient(async(_name,args)=>{payload=args;return {data:5,error:null};});
 await client.save(profile,[],[],'',false,4);assert.equal(payload?.p_expected_revision,4);
 const conflict=createTeacherClient(async()=>({data:null,error:{code:'40001'}}));
 await assert.rejects(conflict.save(profile,[],[],'',false,4),/Refresh before saving/);
 await assert.rejects(client.save(profile,[],[],'',false,-1),/Invalid profile revision/);
});
