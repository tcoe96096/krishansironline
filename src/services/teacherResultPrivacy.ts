/** Review-only privacy policy reference. The database must independently enforce it.
 * This model is for non-SQL tests; production clients never calculate aggregates. */
export const MIN_RESULT_STUDENTS=5;
export const RESULT_AVERAGE_BANDS=['0-<20','20-<40','40-<60','60-<80','80-100'] as const;
export type ResultAverageBand=typeof RESULT_AVERAGE_BANDS[number];
export type PrivateResultSummary={test_id:string;availability:'not_released'|'suppressed'|'available';average_band:ResultAverageBand|null};
export type PrivacyAttempt={id:string;testId:string;studentId:string;attemptNumber:number;submittedAt:string|null;status:string;percentage:number|null};
export type FrozenResultCohort={testId:string;classLevel:string;subject:string;availability:'suppressed'|'available';averageBand:ResultAverageBand|null};
export function freezeResultCohort(test:{id:string;classLevel:string;subject:string;closed:boolean},attempts:readonly PrivacyAttempt[],existing:FrozenResultCohort|null=null):FrozenResultCohort{
 if(existing){if(existing.testId!==test.id)throw new Error('Mismatched release');return {...existing};}
 if(!test.closed)throw new Error('Cohort must be closed');
 const students=new Map<string,PrivacyAttempt>();
 for(const attempt of attempts){
  if(attempt.testId!==test.id||!attempt.studentId||attempt.status!=='submitted'||!attempt.submittedAt||
    !Number.isFinite(Date.parse(attempt.submittedAt))||attempt.percentage===null||!Number.isFinite(attempt.percentage)||attempt.percentage<0||attempt.percentage>100)continue;
  const previous=students.get(attempt.studentId);
  if(!previous||attempt.attemptNumber<previous.attemptNumber||attempt.attemptNumber===previous.attemptNumber&&
    (Date.parse(attempt.submittedAt)<Date.parse(previous.submittedAt!)||attempt.submittedAt===previous.submittedAt&&attempt.id<previous.id))students.set(attempt.studentId,{...attempt});
 }
 const cohort={testId:test.id,classLevel:test.classLevel,subject:test.subject};
 if(students.size<MIN_RESULT_STUDENTS)return {...cohort,availability:'suppressed',averageBand:null};
 const totalCents=[...students.values()].reduce((sum,item)=>sum+Math.round(item.percentage!*100),0);
 return {...cohort,availability:'available',averageBand:RESULT_AVERAGE_BANDS[Math.min(4,Math.floor(totalCents/(students.size*2000)))]};
}
export function readFrozenResultCohort(release:FrozenResultCohort|null,target:{id:string;classLevel:string;subject:string},authorization:{approved:boolean;assignments:readonly {classLevel:string;subject:string;workType:string;active:boolean}[]}):PrivateResultSummary{
 if(!authorization.approved||!authorization.assignments.some(a=>a.active&&a.classLevel===target.classLevel&&a.subject===target.subject&&a.workType==='result.review'))throw new Error('Scoped result review required');
 if(!release||release.testId!==target.id||release.classLevel!==target.classLevel||release.subject!==target.subject)return {test_id:target.id,availability:'not_released',average_band:null};
 return {test_id:target.id,availability:release.availability,average_band:release.availability==='available'?release.averageBand:null};
}
/** Fail closed for historical raw-score responses or malformed server data. */
export function formatPrivateResultSummary(row:unknown):string{
 if(!row||typeof row!=='object')return 'Summary unavailable';
 const value=row as Record<string,unknown>;
 if(value.availability==='suppressed')return 'Suppressed: fewer than 5 distinct students in the fixed reporting cohort';
 if(value.availability==='available'&&RESULT_AVERAGE_BANDS.some(band=>band===value.average_band))return `Fixed-cohort average band: ${value.average_band}% (at least 5 distinct students)`;
 return 'Summary unavailable: no approved frozen cohort';
}
