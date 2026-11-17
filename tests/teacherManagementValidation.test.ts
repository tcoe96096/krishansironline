import {strict as assert} from 'node:assert';
import {normalizeTeacherAssignments,validateTeacherQualifications,validateTeacherResume,isValidTeacherEmployeeId,validateTeacherProfile,validateTeacherRequestedScopes,validateTeacherRequestedWorkTypes} from '../src/lib/teacherManagementValidation';

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

// Unicode compatibility and invisible-character filename spoofing regressions.
for(const name of ['ＣＯＮ.pdf','resume\u200B.pdf','resume\u200D.pdf','resume\u00AD.pdf','resume\uFEFF.pdf','resume\u202Epdf.docx']) {
  assert.equal(validateTeacherResume({name,size:12000,type:name.endsWith('.docx')?
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/pdf'}),false,
    `Unicode-spoofed resume filename accepted: ${JSON.stringify(name)}`);
}
assert.equal(validateTeacherResume({name:'Résumé 2026.pdf',size:12000,type:'application/pdf'}),true);

// Runtime boundary regressions: untrusted JSON and file metadata can violate TypeScript types.
assert.throws(()=>normalizeTeacherAssignments(null as any));
assert.throws(()=>normalizeTeacherAssignments([null] as any));
assert.throws(()=>normalizeTeacherAssignments([{classLevel:10,subject:'History',workType:'materials.draft'}] as any));
assert.equal(validateTeacherQualifications(null as any),false);
assert.equal(validateTeacherQualifications([null] as any),false);
assert.equal(validateTeacherQualifications([{title:12,institution:'University',year:2020}] as any),false);
assert.equal(validateTeacherResume(null as any),false);
assert.equal(validateTeacherResume({name:null,size:12000,type:'application/pdf'} as any),false);
assert.equal(validateTeacherProfile(null as any),false);
assert.equal(validateTeacherProfile({displayName:null,contactEmail:'',phone:'',experienceYears:null} as any),false);
assert.equal(validateTeacherRequestedScopes('10','History',null as any,['History']),false);
assert.equal(validateTeacherRequestedScopes('10','History',['10'],[null] as any),false);

// Sparse arrays must not bypass validation through Array.prototype.every.
assert.equal(validateTeacherQualifications(new Array(1) as any),false);
assert.equal(validateTeacherQualifications([, {title:'M.A.',institution:'University',year:2020}] as any),false);
assert.equal(validateTeacherRequestedScopes('10','History',['10',,] as any,['History']),false);
assert.equal(validateTeacherRequestedScopes('10','History',['10'],['History',,] as any),false);
// Windows alternate data streams and forbidden path characters must not pass filename checks.
for(const name of ['resume:stream.pdf','resume?.pdf','resume*.pdf','resume|draft.pdf','resume<draft>.pdf','resume"draft.pdf']) {
  assert.equal(validateTeacherResume({name,size:12000,type:'application/pdf'}),false,
    `Unsafe Windows filename accepted: ${JSON.stringify(name)}`);
}

// Untrusted JSON can supply non-string IDs; invisible name controls must be rejected.
for(const value of [null,123,{},['KSOL-T-A1B2C3D4']]) {
  assert.equal(isValidTeacherEmployeeId(value as any),false);
}
for(const displayName of ['Teacher\nAdmin','Teacher\u200BAdmin','Teacher\u202EAdmin']) {
  assert.equal(validateTeacherProfile({displayName,contactEmail:'',phone:'',experienceYears:null}),false);
}
assert.equal(validateTeacherProfile({displayName:'Dr. Teacher',contactEmail:'',phone:'',experienceYears:null}),true);

// Punctuation must not count toward the minimum phone number length.
for(const phone of ['-------','(------)','+------','12--34--','1234567890123456']) {
  assert.equal(validateTeacherProfile({displayName:'A Teacher',contactEmail:'',phone,experienceYears:null}),false,
    `Phone with invalid digit count accepted: ${JSON.stringify(phone)}`);
}
assert.equal(validateTeacherProfile({displayName:'A Teacher',contactEmail:'',phone:'+91 (987) 654-3210',experienceYears:null}),true);

assert.equal(validateTeacherRequestedWorkTypes([]),true);
assert.equal(validateTeacherRequestedWorkTypes(['materials.draft','result.review']),true);
assert.equal(validateTeacherRequestedWorkTypes(['materials.draft','materials.draft']),false);
assert.equal(validateTeacherRequestedWorkTypes(['publish.production']),false);
assert.equal(validateTeacherRequestedWorkTypes([,] as any),false);
assert.equal(validateTeacherRequestedWorkTypes(null as any),false);

// Qualifications are personal records: reject invisible controls and forged multiline labels.
for(const title of ['M.A.\nAdmin','M.A.\u200B','M.A.\u202E']) {
  assert.equal(validateTeacherQualifications([{title,institution:'University',year:2020}]),false);
}
for(const institution of ['University\nAdmin','University\u200D','University\u2066']) {
  assert.equal(validateTeacherQualifications([{title:'M.A.',institution,year:2020}]),false);
}
assert.equal(validateTeacherQualifications([{title:'M.A. History',institution:'State University',year:2020}]),true);
