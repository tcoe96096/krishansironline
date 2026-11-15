import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, Award, BookOpen, CheckCircle2, ChevronDown,
  ClipboardCheck, Clock3, FileCheck2, FileText, Fingerprint, GraduationCap,
  KeyRound, LockKeyhole, RefreshCw, Settings2, Shield, ShieldCheck,
  Sparkles, UserCheck, UserCog, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requireSupabase } from '../lib/supabase';
import { StaffRoleMatrix } from './StaffRoleMatrix';
import { AdminTeacherEnrollmentReview } from './AdminTeacherEnrollmentReview';
import { delegationCapabilities, grantIsWithinRole, type DelegatedRole } from '../services/staffGrantPolicy';

type StaffRecord = { user_id: string; role: 'admin' | 'super_admin'; created_at: string };
type DelegatedGrant = {
  user_id: string; role: DelegatedRole; permissions: string[]; scope_class: string | null;
  scope_test_id: string | null; is_active: boolean; change_reason: string; updated_at: string;
};
type GrantAudit = { id: number; operation: string; affected_user_id: string; actor_id: string; reason: string; created_at: string };
const validUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const modules = [
  { title: 'Auto Grading', hi: 'स्वतः अंक गणना', desc: 'Test Submit पर Server RPC स्कोर दर्ज करता है।', live: true, icon: ClipboardCheck },
  { title: 'Result Cards', hi: 'स्वतः रिजल्ट कार्ड', desc: 'Submitted Attempts से डिजिटल और प्रिंट कार्ड बनते हैं।', live: true, icon: Award },
  { title: 'Learning Analytics', hi: 'प्रगति विश्लेषण', desc: 'दर्ज परिणामों से Personal एवं Admin Charts तैयार होते हैं।', live: true, icon: Activity },
  { title: 'Scheduled Release', hi: 'निर्धारित समय पर प्रकाशन', desc: 'प्रस्ताव: परीक्षा Result हेतु Secure Server-side Scheduled Release।', live: false, icon: Clock3 },
  { title: 'Audited Corrections', hi: 'जाँच के बाद परिणाम संपादन', desc: 'प्रस्ताव: कारण, पुराना/नया स्कोर और Approver के साथ Audit Trail।', live: false, icon: FileCheck2 },
  { title: 'Delegated Permissions', hi: 'विभागवार अधिकार', desc: 'प्रस्ताव: Super Admin द्वारा सीमित Staff Roles और अधिकार।', live: false, icon: KeyRound }
] as const;
const plannedRoles = [
  { role: 'Super Admin', scope: 'पूर्ण नियंत्रण और Role Approval', can: ['Results', 'Publish', 'Staff', 'Corrections'] },
  { role: 'Result Manager', scope: 'Result Review और रिपोर्ट', can: ['Results', 'Review'] },
  { role: 'Academic Admin', scope: 'Tests और शैक्षणिक डेटा', can: ['Tests', 'Analysis'] },
  { role: 'Teacher / Evaluator', scope: 'निर्धारित Test का मूल्यांकन', can: ['Assigned tests'] },
  { role: 'Viewer', scope: 'अधिकृत Read-only रिपोर्ट', can: ['View only'] }
];

export const AdminStaffPermissions: React.FC<{ demoMode?: boolean }> = ({ demoMode = false }) => {
  const { isAdmin, user } = useAuth();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [delegationReady, setDelegationReady] = useState(false);
  const [materialBackendReady, setMaterialBackendReady] = useState(false);
  const [grants, setGrants] = useState<DelegatedGrant[]>([]);
  const [grantAudit, setGrantAudit] = useState<GrantAudit[]>([]);
  const [grantError, setGrantError] = useState('');
  const [grantNotice, setGrantNotice] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [grantRole, setGrantRole] = useState<DelegatedRole>('viewer');
  const [grantPermissions, setGrantPermissions] = useState<string[]>(['results.read']);
  const [grantClass, setGrantClass] = useState('');
  const [grantReason, setGrantReason] = useState('');


  useEffect(() => {
    let active = true;
    if (demoMode || !isAdmin || !user) {
      setStaff([]);
      setGrants([]);
      setGrantAudit([]);
      setDelegationReady(false);
      setMaterialBackendReady(false);
      setSuperAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setSuperAdmin(false);
    setDelegationReady(false);
    setMaterialBackendReady(false);
    setStaff([]);
    setGrants([]);
    setGrantAudit([]);
    void (async () => {
      try {
        const client = requireSupabase();
        const [superResult, rolesResult] = await Promise.all([
          client.rpc('is_super_admin'),
          client.from('user_roles').select('user_id,role,created_at').in('role', ['admin','super_admin']).order('created_at', {ascending: true})
        ]);
        if (superResult.error) throw superResult.error;
        if (rolesResult.error) throw rolesResult.error;
        if (!active) return;
        setSuperAdmin(superResult.data === true);
        setStaff((rolesResult.data ?? []) as StaffRecord[]);
        setDelegationReady(false);
        setGrants([]);
        setGrantAudit([]);
        setGrantError('');
        if (superResult.data === true) {
          const [grantsResult,auditResult] = await Promise.all([
            client.from('result_staff_grants')
              .select('user_id,role,permissions,scope_class,scope_test_id,is_active,change_reason,updated_at')
              .order('updated_at',{ascending:false}).limit(200),
            client.from('result_staff_grant_audit')
              .select('id,operation,affected_user_id,actor_id,reason,created_at')
              .order('created_at',{ascending:false}).limit(30)
          ]);
          if (!active) return;
          if (!grantsResult.error && !auditResult.error) {
            setGrants((grantsResult.data ?? []) as DelegatedGrant[]);
            setGrantAudit((auditResult.data ?? []) as GrantAudit[]);
            setDelegationReady(true);
            const materialProbe = await client.from('study_material_items').select('id').limit(0);
            if (active) setMaterialBackendReady(!materialProbe.error);
          } else {
            const failure = grantsResult.error || auditResult.error;
            if (!['42P01','PGRST205','PGRST204'].includes(failure?.code || '')) {
              setGrantError(failure?.message || 'Could not verify delegated-grant permissions.');
            }
          }
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Staff permissions are unavailable.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [demoMode,isAdmin,user?.id,reload]);

  const saveDelegation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!superAdmin || !delegationReady || !user || grantBusy) return;
    const id = targetUserId.trim().toLowerCase();
    const reason = grantReason.trim();
    if (!validUuid(id)) { setGrantError('प्राप्तकर्ता का सही Account UUID आवश्यक है।'); return; }
    if (reason.length < 12) { setGrantError('बदलाव का कारण कम से कम 12 अक्षरों में लिखें।'); return; }
    if (!grantIsWithinRole(grantRole, grantPermissions, materialBackendReady)) {
      setGrantError('इस भूमिका के लिए यह Permission अनुमत नहीं है।'); return;
    }
    setGrantBusy(true); setGrantError(''); setGrantNotice('');
    try {
      const client = requireSupabase();
      const verification = await client.rpc('is_super_admin');
      if (verification.error || verification.data !== true) throw new Error('Server denied Super Admin authority.');
      const { data: prior, error: lookupError } = await client.from('result_staff_grants')
        .select('user_id').eq('user_id',id).maybeSingle();
      if (lookupError) throw lookupError;
      const values = {
        role: grantRole,permissions:grantPermissions,scope_class:grantClass || null,
        scope_test_id:null,is_active:true,change_reason:reason
      };
      const result = prior
        ? await client.from('result_staff_grants').update(values).eq('user_id',id)
        : await client.from('result_staff_grants').insert({...values,user_id:id});
      if (result.error) throw result.error;
      setGrantNotice('Delegated Result Permissions saved with server audit.');
      setGrantReason('');
      setReload((n)=>n+1);
    } catch (cause) {
      setGrantError(cause instanceof Error ? cause.message : 'Could not save permissions.');
    } finally { setGrantBusy(false); }
  };

  const disableDelegation = async (grant: DelegatedGrant) => {
    if (!superAdmin || !delegationReady || grantBusy || !grant.is_active) return;
    if (!window.confirm('इस Result Staff Grant को बंद करें? यह बदलाव Audit में दर्ज होगा।')) return;
    setGrantBusy(true); setGrantError(''); setGrantNotice('');
    try {
      const client = requireSupabase();
      const verification = await client.rpc('is_super_admin');
      if (verification.error || verification.data !== true) throw new Error('Server denied Super Admin authority.');
      const {error:changeError} = await client.from('result_staff_grants')
        .update({is_active:false,change_reason:'Super Admin revoked delegated result access'})
        .eq('user_id',grant.user_id);
      if (changeError) throw changeError;
      setGrantNotice('Result Staff Grant deactivated and audited.');
      setReload((n)=>n+1);
    } catch (cause) {
      setGrantError(cause instanceof Error ? cause.message : 'Could not revoke access.');
    } finally { setGrantBusy(false); }
  };

  const roleCounts = useMemo(() => ({
    superAdmins: staff.filter((item) => item.role === 'super_admin').length,
    admins: staff.filter((item) => item.role === 'admin').length
  }),[staff]);

  if (demoMode) return (
    <div className="rounded-3xl border border-sky-200 bg-sky-50 p-7">
      <LockKeyhole className="text-sky-800"/><h2 className="mt-3 font-extrabold text-slate-900">Staff Control Board — Protected Demo</h2>
      <p className="mt-2 text-sm text-slate-700">Demo में वास्तविक Staff Accounts या Access Records प्रदर्शित नहीं किए जाते।</p>
    </div>
  );

  return (
    <section className="space-y-6 pb-12">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#061e42] via-[#092d63] to-[#087f8c] p-6 text-white sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold"><ShieldCheck size={16}/> ACCESS GOVERNANCE</p>
        <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">Super Admin Control Board</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-100">Result Automation, Role Visibility, Security Controls और आगामी Delegated Permissions की एकीकृत रूपरेखा।</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-white/10 px-3 py-1.5">SERVER VERIFIED ACCESS</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5">DATABASE-ENFORCED RIGHTS</span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {label:'Current Super Admin',value:loading ? '…' : roleCounts.superAdmins,icon:Shield},
          {label:'Current Admin',value:loading ? '…' : roleCounts.admins,icon:Users},
          {label:'Automated Modules',value:3,icon:Sparkles},
          {label:'Pending Backend Controls',value:materialBackendReady ? 2 : 3,icon:Settings2}
        ].map(({label,value,icon:Icon})=>(
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-900"><Icon size={20}/></span>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle size={16}/>{error}</p>}
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div><h3 className="text-lg font-extrabold text-slate-900">Automation Control Map</h3><p className="mt-1 text-xs text-slate-500">Live और प्रस्तावित Modules स्पष्ट रूप से अलग हैं।</p></div>
            <Sparkles size={21} className="text-sky-800"/>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {modules.map(({title,hi,desc,live,icon:Icon})=>(
              <article key={title} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2"><span className="rounded-lg bg-sky-50 p-2 text-sky-900"><Icon size={20}/></span>
                  <span className={'rounded-full px-2.5 py-1 text-[10px] font-bold '+(live?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-900')}>{live?'Current / Stage A':'Backend Pending'}</span></div>
                <h4 className="mt-3 text-sm font-extrabold text-slate-900">{hi}</h4>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">{desc}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-extrabold text-slate-900">Current Access</h3><Fingerprint size={22} className="text-sky-800"/></div>
            <p className="mt-2 text-xs text-slate-600">Authority is verified by the Supabase database. Buttons alone never grant privileges.</p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">Your verified role</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{loading?'Checking…':superAdmin?'Super Admin':'Admin'}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{superAdmin
                ? 'आपका Super Admin Role Database द्वारा सत्यापित है।'
                : 'केवल Super Admin भविष्य के अधिकार आवंटन तथा Role Changes की अंतिम अनुमति देगा।'}</p>
            </div>
            <button type="button" onClick={() => setReload((n)=>n+1)} disabled={loading} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15}/> Verify Permissions</button>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-amber-950"><LockKeyhole size={18}/> Server-enforced Super Admin Controls</h3>
            <p className="mt-3 text-xs leading-6 text-amber-900">Role Grant / Revoke UI केवल Super Admin और सत्यापित Backend Policies उपलब्ध होने पर खुलेगा। जब तक Preview Schema और Audit Tests मंजूर नहीं होते, Save Controls बंद रहेंगे। Existing Admin Rights, Result Corrections और Publishing पर अलग Security Gate आवश्यक है।</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="text-lg font-extrabold text-slate-900">Existing Staff Roles</h3><p className="mt-1 text-xs text-slate-500">सिस्टम से पढ़े गए वास्तविक Admin / Super Admin Records।</p></div>
          <button type="button" onClick={() => setExpanded((v)=>!v)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">{expanded?'Hide':'Show'} Staff Details<ChevronDown size={15} className={expanded?'rotate-180':''}/></button>
        </div>
        {expanded && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-slate-50"><tr><th className="px-4 py-3">Staff Reference</th><th className="px-4 py-3">Current Role</th><th className="px-4 py-3">Added On</th><th className="px-4 py-3">Scope</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {staff.length?staff.map((person)=>(
                  <tr key={person.user_id}>
                    <td className="px-4 py-3 font-mono text-slate-700">•••• {person.user_id.slice(-8)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{person.role==='super_admin'?'Super Admin':'Admin'}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(person.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-600">Current backend role</td>
                  </tr>
                )):<tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No role entries available to this session</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <section className="rounded-3xl border border-sky-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Teacher enrollment guide">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wider text-teal-800">TEACHER ENROLLMENT</p>
            <h3 className="mt-1 text-lg font-extrabold text-slate-900">How to Add a New Teacher</h3>
            <p className="mt-2 text-xs leading-5 text-slate-600">Google sign-in only identifies the Teacher account. It never grants permissions automatically.</p>
          </div>
          <a href={import.meta.env.BASE_URL+'staff-workspace/'}
            className="inline-flex min-h-10 items-center rounded-xl border border-sky-200 px-4 text-xs font-bold text-sky-900 hover:bg-sky-50">
            Open Teacher Login / Workspace
          </a>
        </div>
        <ol className="mt-4 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
          <li className="rounded-xl bg-slate-50 p-3"><strong>1. Teacher Google Sign-in:</strong> Teacher opens the workspace and signs in with their own Google account.</li>
          <li className="rounded-xl bg-slate-50 p-3"><strong>2. Verify identity:</strong> Teacher privately shares the displayed Account ID. Super Admin verifies who owns that account independently.</li>
          <li className="rounded-xl bg-slate-50 p-3"><strong>3. Apply and approve:</strong> Teacher submits an application in the workspace; Super Admin checks Pending Teacher Requests and can approve the requested class (or use the verified manual grant editor).</li>
          <li className="rounded-xl bg-slate-50 p-3"><strong>4. Teacher workspace:</strong> The Teacher can draft, edit and request review only within assigned scope. Publication remains Super Admin approved.</li>
        </ol>
        {!delegationReady && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          Role assignment is currently locked: audited delegated-grant tables and permission tests are not yet activated. No teacher is granted access by this guide.
        </p>}
      </section>
      <AdminTeacherEnrollmentReview demoMode={demoMode}/>
      <StaffRoleMatrix materialBackendReady={materialBackendReady} resultBackendReady={delegationReady}/>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-teal-800">SUPER ADMIN GOVERNANCE</p>
            <h3 className="mt-1 text-lg font-extrabold text-slate-900">Result Staff Delegation</h3>
            <p className="mt-1 text-xs text-slate-600">Scoped Result grants, plus Study Material grants only after their separate backend is verified. No website-wide Admin elevation.</p>
          </div>
          <span className={'rounded-full px-3 py-1.5 text-xs font-bold ' + (delegationReady ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900')}>
            {loading?'Checking…':delegationReady?'Backend verified':superAdmin?'Preview schema pending':'Super Admin only'}
          </span>
        </div>
        {!superAdmin ? (
          <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
            <LockKeyhole size={23} className="mb-2 text-slate-500"/>
            Permissions can only be assigned or revoked by a verified Super Admin.
          </div>
        ) : !delegationReady ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Delegated Role Editing is safely disabled. The audited grant tables are not yet available in this environment or could not be verified.
            A separate approved Preview Database Migration and permission tests are required.
          </div>
        ) : (
          <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_1.1fr]">
            <form onSubmit={(event)=>{void saveDelegation(event);}} className="space-y-4 rounded-2xl bg-slate-50 p-4 sm:p-5">
              <h4 className="font-extrabold text-slate-900">Assign / Update Scoped Role</h4>
              <label className="block text-xs font-bold text-slate-700">
                User Account UUID
                <input required value={targetUserId} onChange={(event)=>setTargetUserId(event.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000" autoComplete="off"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"/>
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Delegated Role
                <select value={grantRole} onChange={(event)=>{
                  const role=event.target.value as DelegatedRole;
                  setGrantRole(role);setGrantPermissions(role==='content_manager'?['materials.read']:['results.read']);
                }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  <option value="viewer">Viewer (Read Only)</option>
                  <option value="teacher">Teacher / Evaluator</option>
                  <option value="academic_admin">Academic Admin</option>
                  <option value="result_manager">Result Manager</option>
                  <option value="content_manager" disabled={!materialBackendReady}>Content Manager (requires Material backend)</option>
                </select>
              </label>
              <fieldset className="space-y-2">
                <legend className="text-xs font-bold text-slate-700">Allowed Capabilities</legend>
                {delegationCapabilities[grantRole].map((capability)=><label key={capability} className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" disabled={!materialBackendReady && capability.startsWith("materials.")} checked={grantPermissions.includes(capability)} onChange={(event)=>setGrantPermissions((old)=>event.target.checked?[...old,capability]:old.filter((c)=>c!==capability))}
                    className="h-4 w-4 rounded border-slate-300"/>
                  {capability}
                </label>)}
              </fieldset>
              <label className="block text-xs font-bold text-slate-700">
                Optional Class Scope
                <select value={grantClass} onChange={(event)=>setGrantClass(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                  <option value="">Platform scope (Super Admin selection)</option>
                  {['6','7','8','9','10','11','12'].map((level)=><option key={level} value={level}>Class {level}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Mandatory Reason
                <textarea required minLength={12} maxLength={1000} rows={3} value={grantReason}
                  onChange={(event)=>setGrantReason(event.target.value)} placeholder="State why this person needs this permission."
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm"/>
              </label>
              <button type="submit" disabled={grantBusy || !grantIsWithinRole(grantRole,grantPermissions,materialBackendReady) || !validUuid(targetUserId.trim()) || grantReason.trim().length < 12}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-40">
                <ShieldCheck size={18}/>{grantBusy?'Saving…':'Save Audited Role Grant'}
              </button>
            </form>
            <div className="min-w-0">
              <h4 className="font-extrabold text-slate-900">Delegated Staff <span className="text-slate-500">({grants.length})</span></h4>
              <div className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">
                {grants.length===0?<p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No delegated result roles assigned yet.</p>
                :grants.map((grant)=><div key={grant.user_id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-mono text-xs text-slate-600">ID …{grant.user_id.slice(-8)}</p>
                      <h5 className="mt-1 text-sm font-extrabold text-slate-900">{grant.role.replaceAll('_',' ')}</h5>
                      <p className="mt-1 text-[11px] text-slate-500">Scope: {grant.scope_class?'Class '+grant.scope_class:'Platform'} · {grant.permissions.join(', ')||'No capabilities'}</p>
                    </div>
                    <span className={'rounded-full px-2 py-1 text-[10px] font-bold '+(grant.is_active?'bg-emerald-50 text-emerald-800':'bg-slate-100 text-slate-600')}>{grant.is_active?'Active':'Revoked'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={()=>{setTargetUserId(grant.user_id);setGrantRole(grant.role);setGrantPermissions(grant.permissions);setGrantClass(grant.scope_class||'');}}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Edit Grant</button>
                    {grant.is_active&&<button type="button" disabled={grantBusy} onClick={()=>void disableDelegation(grant)}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40">Revoke Access</button>}
                  </div>
                </div>)}
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-extrabold text-slate-900">Latest Role Audit</h4>
                <div className="mt-3 space-y-2">
                  {grantAudit.length?grantAudit.slice(0,8).map((event)=><div key={event.id} className="border-b border-slate-100 pb-2 text-xs">
                    <span className="font-bold text-slate-900">{event.operation}</span> · user …{event.affected_user_id.slice(-8)}
                    <p className="mt-1 text-slate-600">{event.reason}</p>
                    <p className="text-[10px] text-slate-500">{new Date(event.created_at).toLocaleString('en-IN')}</p>
                  </div>):<p className="text-xs text-slate-500">No audited changes yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
        {grantError&&<p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{grantError}</p>}
        {grantNotice&&<p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{grantNotice}</p>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5"><h3 className="text-lg font-extrabold text-slate-900">Future Granular Permission Matrix</h3><p className="mt-1 text-xs text-slate-500">Target architecture — not yet active roles. वास्तविक अधिकार केवल Backend Policy से मिलेंगे।</p></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plannedRoles.map((role)=>(
            <article key={role.role} className="rounded-2xl border border-slate-200 p-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-800"><UserCog size={18}/></span>
              <h4 className="mt-3 font-extrabold text-slate-900">{role.role}</h4>
              <p className="mt-1 text-xs text-slate-600">{role.scope}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{role.can.map((label)=><span key={label} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{label}</span>)}</div>
            </article>
          ))}
        </div>
        <p className="mt-5 rounded-xl bg-sky-50 p-4 text-xs leading-5 text-sky-900">Next security gate: server-enforced grants, least privilege, explicit Super Admin approval, audit timestamps and revocation tests. No change to Production Roles has been made.</p>
      </div>
    </section>
  );
};
