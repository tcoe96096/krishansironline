import {strict as assert} from 'node:assert';
import {normalizeTeacherAssignments,validateTeacherQualifications,validateTeacherResume,isValidTeacherEmployeeId,validateTeacherProfile,validateTeacherRequestedScopes} from '../src/lib/teacherManagementValidation';

const a=normalizeTeacherAssignments([
  {classLevel:'10',subject:'History',workType:'materials.draft'},
  {classLevel:'11',subject:'Political Science',workType:'materials.review'},
  {classLevel:'10',subject:'History',workType:'materials.draft'}
]);
assert.equal(a.length,2,'Multi-class/subject assignments deduplicate safely');
assert.throws(()=>normalizeTeacherAssignments([{classLevel:'admin',subject:'History',workType:'materials.draft'}]));
assert.throws(()=>normalizeTeacherAssignments([{classLevel:'10',subject:'History',workType:'publish.production'}]));
assert.equal(validateTeacherQualifications([{title:'M.A.',institution:'University',year:2020}]),true);
assert.equal(validateTeacherQualifications([{title:'',institution:'University',year:2020}]),false);
assert.equal(validateTeacherResume({name:'resume.pdf',size:12000,type:'application/pdf'}),true);
assert.equal(validateTeacherResume({name:'resume.exe',size:12000,type:'application/pdf'}),false);
assert.equal(validateTeacherResume({name:'resume.pdf',size:6*1024*1024,type:'application/pdf'}),false);
assert.equal(isValidTeacherEmployeeId('KSOL-T-A1B2C3D4'),true);
assert.equal(isValidTeacherEmployeeId('KSOL-T-123'),false);
console.log('Teacher Management v2 input validation: PASS (draft-only)');

assert.equal(validateTeacherProfile({displayName:'A Teacher',contactEmail:'teacher@example.org',phone:'+91 9876543210',experienceYears:5}),true);
assert.equal(validateTeacherProfile({displayName:' ',contactEmail:'teacher@example.org',phone:'',experienceYears:null}),false);
assert.equal(validateTeacherProfile({displayName:'A Teacher',contactEmail:'invalid',phone:'',experienceYears:null}),false);
assert.equal(validateTeacherProfile({displayName:'A Teacher',contactEmail:'',phone:'',experienceYears:-1}),false);
assert.equal(validateTeacherRequestedScopes('10','History',['10','11'],['History','Political Science']),true);
assert.equal(validateTeacherRequestedScopes('10','History',['11'],['History']),false);
assert.equal(validateTeacherRequestedScopes('10','History',['10','10'],['History']),false);
assert.equal(validateTeacherRequestedScopes('10','History',['10'],['History','invalid']),false);

// Regression: a literal backslash or whitespace must not be accepted as an email character.
for(const contactEmail of ['teacher name@example.org','teacher\\name@example.org','teacher@example org','teacher@example\\org','teacher@exampleorg']){
  assert.equal(validateTeacherProfile({displayName:'A Teacher',contactEmail,phone:'',experienceYears:null}),false,
    `Invalid email was accepted: ${contactEmail}`);
}
assert.equal(validateTeacherProfile({displayName:'A Teacher',contactEmail:'teacher+tag@example.co.in',phone:'',experienceYears:0}),true);

for(const phone of ['+91 9876543210','9876543210','(012) 345-6789']){
  assert.equal(validateTeacherProfile({displayName:'A Teacher',contactEmail:'',phone,experienceYears:null}),true,
    `Valid phone rejected: ${phone}`);
}
for(const phone of ['abc1234567','+','123','+91\\\\1234567890']){
  assert.equal(validateTeacherProfile({displayName:'A Teacher',contactEmail:'',phone,experienceYears:null}),false,
    `Invalid phone accepted: ${phone}`);
}


for(const name of ['../resume.pdf','folder\\\\resume.pdf','.hidden.pdf',' resume.pdf','resume.pdf ','resume\n.pdf','a'.repeat(181)+'.pdf']){
  assert.equal(validateTeacherResume({name,size:12000,type:'application/pdf'}),false,
    `Unsafe resume filename accepted: ${JSON.stringify(name)}`);
}
assert.equal(validateTeacherResume({name:'My CV 2026.PDF',size:12000,type:'application/pdf'}),true);
assert.equal(validateTeacherResume({name:'Resume.docx',size:12000,type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),true);
assert.equal(validateTeacherResume({name:'Resume.docx',size:12000,type:'application/pdf'}),false);

// Cross-platform filename and Unicode direction-spoofing regressions.
for(const name of ['CON.pdf','nul.docx','COM1.pdf','LPT9.docx','resume .pdf','resume..pdf','resume. .pdf','resume\u202Efdp.exe.pdf','resume\u2066.pdf','resume\u0085.pdf']) {
  assert.equal(validateTeacherResume({name,size:12000,type:name.toLowerCase().endsWith('.docx')?
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/pdf'}),false,
    `Unsafe or spoofed resume filename accepted: ${JSON.stringify(name)}`);
}
assert.equal(validateTeacherResume({name:'Teaching CV (final).pdf',size:12000,type:'application/pdf'}),true);
