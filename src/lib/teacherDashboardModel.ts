import {isTeacherSnapshot} from './teacherSnapshotValidation';

export type TeacherDashboardSummary = {
  displayName: string|null;
  status: 'not_registered'|'draft'|'pending'|'approved'|'rejected'|'suspended';
  statusLabel: string;
  employeeId: string|null;
  approvedScopes: {id:string;label:string}[];
};

/** A read-only, fail-closed projection of the signed-in teacher's server snapshot.
 * The client projection is for display only; access is still enforced by RPC/RLS.
 * Never derive authorized scopes from self-requested scope selections.
 */
export function teacherDashboardSummary(value:unknown,userId:string):TeacherDashboardSummary {
  if(!userId)throw new Error('Authenticated teacher identity required.');
  if(value===null)return {
    displayName:null,status:'not_registered',statusLabel:'No teacher registration found',
    employeeId:null,approvedScopes:[],
  };
  if(!isTeacherSnapshot(value) || value.user_id!==userId)throw new Error('Invalid teacher profile response.');
  const approved=value.status==='approved';
  const status:TeacherDashboardSummary['status']=value.status==='pending'
    ?(value.submitted_at?'pending':'draft'):value.status;
  const statusLabel={
    not_registered:'No teacher registration found',
    draft:'Registration draft · Not submitted',
    pending:'Application awaiting Super Admin review',
    approved:'Verified Teacher · Approved',
    rejected:'Application requires revision',
    suspended:'Teacher access suspended',
  }[status];
  const approvedScopes=approved?value.assignments
    .filter(scope=>scope.status==='active')
    .map(scope=>({id:scope.id,label:'Class '+scope.class_level+' · '+scope.subject}))
    :[];
  return {
    displayName:value.display_name,
    status,statusLabel,
    employeeId:approved?value.employee_id:null,
    approvedScopes,
  };
}
