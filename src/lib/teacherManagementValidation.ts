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
  if(inputs.length>60)throw new Error('Too many teacher assignments.');
  const seen=new Set<string>();
  const normalized:TeacherAssignmentInput[]=[];
  for(const input of inputs){
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
  if(items.length>20)return false;
  const currentYear=new Date().getUTCFullYear();
  return items.every(item=>item.title.trim().length>=2&&item.title.trim().length<=120&&
    item.institution.trim().length>=2&&item.institution.trim().length<=160&&
    Number.isInteger(item.year)&&item.year>=1950&&item.year<=currentYear);
}

export function validateTeacherResume(file:{name:string;size:number;type:string}):boolean {
  const ext=file.name.toLowerCase().split('.').pop();
  const allowed=ext==='pdf'?['application/pdf']:ext==='docx'?
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']:[];
  return allowed.includes(file.type)&&Number.isSafeInteger(file.size)&&file.size>0&&file.size<=5*1024*1024;
}

/** Display validation only; employee IDs must be issued atomically server-side. */
export function isValidTeacherEmployeeId(value:string):boolean {
  return /^KSOL-T-[A-Z0-9]{8,16}$/.test(value);
}
