/** Teacher Management v2 draft-only input validation.
 * These helpers do not create grants, employee IDs, or database records.
 * Authorization and uniqueness must be enforced by the reviewed server migration.
 */
export const TEACHER_CLASSES = ['6','7','8','9','10','11','12'] as const;
export const TEACHER_SUBJECTS = ['Political Science','History','Geography','Economics','Other'] as const;
export const TEACHER_WORK_TYPES = ['materials.draft','materials.review','assessment.draft','result.review'] as const;
export type TeacherClass = typeof TEACHER_CLASSES[number];
export type TeacherSubject = typeof TEACHER_SUBJECTS[number];
export type TeacherWorkType = typeof TEACHER_WORK_TYPES[number];
export type TeacherAssignmentInput = {classLevel:string;subject:string;workType:string};
export type TeacherQualificationInput = {title:string;institution:string;year:number};

export function normalizeTeacherAssignments(inputs:readonly TeacherAssignmentInput[]):TeacherAssignmentInput[] {
  if(!Array.isArray(inputs)||inputs.length>60)throw new Error('Invalid teacher assignments.');
  const seen=new Set<string>();
  const normalized:TeacherAssignmentInput[]=[];
  for(const input of inputs){
    if(!input||typeof input.classLevel!=='string'||typeof input.subject!=='string'||typeof input.workType!=='string')throw new Error('Invalid teacher assignment.');
    const classLevel=input.classLevel.trim();
    const subject=input.subject.trim();
    const workType=input.workType.trim();
    if(!TEACHER_CLASSES.some(value=>value===classLevel)||
       !TEACHER_SUBJECTS.some(value=>value===subject)||
       !TEACHER_WORK_TYPES.some(value=>value===workType))throw new Error('Invalid teacher assignment.');
    const key=JSON.stringify([classLevel,subject,workType]);
    if(!seen.has(key)){seen.add(key);normalized.push({classLevel,subject,workType});}
  }
  return normalized;
}

export function validateTeacherQualifications(items:readonly TeacherQualificationInput[]):boolean {
  if(!Array.isArray(items)||items.length>20)return false;
  const currentYear=new Date().getUTCFullYear();
  return Array.from(items).every(item=>item!==null&&typeof item==='object'&&typeof item.title==='string'&&typeof item.institution==='string'&&
    item.title.trim().length>=2&&item.title.trim().length<=120&&
    item.institution.trim().length>=2&&item.institution.trim().length<=160&&
    !/[\x00-\x1f\x7f-\x9f\p{Cf}]/u.test(item.title)&&
    !/[\x00-\x1f\x7f-\x9f\p{Cf}]/u.test(item.institution)&&
    Number.isInteger(item.year)&&item.year>=1950&&item.year<=currentYear);
}

export function validateTeacherResume(file:{name:string;size:number;type:string}):boolean {
  // Display-side checks only. Private server upload must still inspect actual bytes,
  // allocate its own object key, scan content, and enforce authorization.
  if(!file||typeof file.name!=='string'||typeof file.size!=='number'||typeof file.type!=='string')return false;
  const name=file.name;
  // Reject compatibility-spoofed filenames and invisible format characters before upload.
  // This is defense-in-depth only; the server must generate the actual storage key.
  if(name!==name.normalize('NFKC')||/\p{Cf}/u.test(name))return false;
  if(name.length<5||name.length>180||name!==name.trim()||
     /[\\/:*?"<>|\x00-\x1f\x7f\u0080-\u009f\u202a-\u202e\u2066-\u2069]/u.test(name)||
     name.startsWith('.')||/[. ]$/.test(name)||/[. ]\./.test(name)||
     /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))return false;
  const ext=name.toLowerCase().split('.').pop();
  const allowed=ext==='pdf'?['application/pdf']:ext==='docx'?
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']:[];
  return allowed.includes(file.type)&&Number.isSafeInteger(file.size)&&file.size>0&&file.size<=5*1024*1024;
}

/** Display validation only; employee IDs must be issued atomically server-side. */
export function isValidTeacherEmployeeId(value:string):boolean {
  return typeof value==='string'&&/^KSOL-T-[A-Z0-9]{8,16}$/.test(value);
}

/** Draft-only profile validation. The server must independently revalidate all fields. */
export type TeacherProfileInput = {displayName:string;contactEmail:string;phone:string;experienceYears:number|null};
export function validateTeacherProfile(input:TeacherProfileInput):boolean {
  if(!input||typeof input.displayName!=='string'||typeof input.contactEmail!=='string'||typeof input.phone!=='string')return false;
  const name=input.displayName.trim();
  const email=input.contactEmail.trim();
  const phone=input.phone.trim();
  return name.length>=2&&name.length<=160&&!/[\x00-\x1f\x7f-\x9f\p{Cf}]/u.test(name)&&
    (email===''||(email.length<=254&&/^[^\s@\\]+@[^\s@\\]+\.[^\s@\\]+$/.test(email)))&&
    (phone===''||(phone.length<=20&&/^\+?[0-9 ()-]+$/.test(phone)&&
      (phone.match(/[0-9]/g)||[]).length>=7&&(phone.match(/[0-9]/g)||[]).length<=15))&&
    (input.experienceYears===null||(Number.isInteger(input.experienceYears)&&input.experienceYears>=0&&input.experienceYears<=70));
}

/** Keep the primary request inside the requested scopes; no privileges are assigned here. */
export function validateTeacherRequestedScopes(primaryClass:string,primarySubject:string,
  requestedClasses:readonly string[],requestedSubjects:readonly string[]):boolean {
  if(!Array.isArray(requestedClasses)||!Array.isArray(requestedSubjects)||typeof primaryClass!=='string'||typeof primarySubject!=='string')return false;
  return requestedClasses.length>=1&&requestedClasses.length<=TEACHER_CLASSES.length&&
    requestedSubjects.length>=1&&requestedSubjects.length<=TEACHER_SUBJECTS.length&&
    new Set(requestedClasses).size===requestedClasses.length&&
    new Set(requestedSubjects).size===requestedSubjects.length&&
    Array.from(requestedClasses).every(value=>TEACHER_CLASSES.some(item=>item===value))&&
    Array.from(requestedSubjects).every(value=>TEACHER_SUBJECTS.some(item=>item===value))&&
    requestedClasses.includes(primaryClass)&&requestedSubjects.includes(primarySubject);
}

/** Validate requested work preferences only; this never grants any permission. */
export function validateTeacherRequestedWorkTypes(workTypes:readonly string[]):boolean {
  return Array.isArray(workTypes)&&workTypes.length<=TEACHER_WORK_TYPES.length&&
    new Set(workTypes).size===workTypes.length&&
    Array.from(workTypes).every(value=>typeof value==='string'&&TEACHER_WORK_TYPES.some(item=>item===value));
}
