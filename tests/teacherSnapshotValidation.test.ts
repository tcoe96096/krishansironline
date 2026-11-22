import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isTeacherSnapshot} from '../src/lib/teacherSnapshotValidation';

const valid={
  user_id:'teacher-id',employee_id:null,display_name:'Teacher One',contact_email:null,
  phone:null,experience_years:4,status:'pending',revision:1,submitted_at:null,
  application_reason:null,decision_reason:null,reviewed_at:null,
  requested_scopes:[{classLevel:'10',subject:'History',workType:'materials.draft'}],
  qualifications:[{title:'B.Ed.',institution:'University',year:2024}],
  assignments:[{id:'assignment-id',class_level:'10',subject:'History',work_type:'materials.draft',status:'active'}],
  resumes:[]
};
test('teacher snapshot validates nested server response shapes',()=>{
  assert.equal(isTeacherSnapshot(valid),true);
  const malformed=[
    null,{},[],{...valid,status:'unknown'}, {...valid,revision:'2'},
    {...valid,requested_scopes:[null]}, {...valid,requested_scopes:[{classLevel:'10'}]},
    {...valid,qualifications:[null]}, {...valid,qualifications:[{title:'Degree',institution:'University'}]},
    {...valid,assignments:[null]}, {...valid,assignments:[{id:'id'}]},
    {...valid,resumes:[null]}, {...valid,display_name:null},
    {...valid,reviewed_at:42}, {...valid,reviewed_at:undefined},
    {...valid,resumes:undefined}, {...valid,resumes:null}
  ];
  for(const item of malformed)assert.equal(isTeacherSnapshot(item),false,'Malformed RPC JSON passed validation: '+JSON.stringify(item));
});
test('empty nested collections are accepted, sparse arrays and incorrect revisions are rejected',()=>{
  const empty={...valid,requested_scopes:[],qualifications:[],assignments:[],resumes:[]};
  assert.equal(isTeacherSnapshot(empty),true);
  assert.equal(isTeacherSnapshot({...empty,requested_scopes:new Array(1)}),false);
  assert.equal(isTeacherSnapshot({...empty,qualifications:new Array(1)}),false);
  assert.equal(isTeacherSnapshot({...empty,assignments:new Array(1)}),false);
  assert.equal(isTeacherSnapshot({...empty,resumes:new Array(1)}),false);
  assert.equal(isTeacherSnapshot({...empty,revision:0}),false);
  assert.equal(isTeacherSnapshot({...empty,experience_years:'5'}),false);
});
