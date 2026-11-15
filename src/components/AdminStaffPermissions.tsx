import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, Award, BookOpen, CheckCircle2, ChevronDown,
  ClipboardCheck, Clock3, FileCheck2, FileText, Fingerprint, GraduationCap,
  KeyRound, LockKeyhole, RefreshCw, Settings2, Shield, ShieldCheck,
  Sparkles, UserCheck, UserCog, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requireSupabase } from '../lib/supabase';

type StaffRecord = { user_id: string; role: 'admin' | 'super_admin'; created_at: string };
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

  useEffect(() => {
    let active = true;
    if (demoMode || !isAdmin || !user) {
      setStaff([]);
      setSuperAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
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
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Staff permissions are unavailable.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [demoMode,isAdmin,user?.id,reload]);

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
          <span className="rounded-full bg-white/10 px-3 py-1.5">READ ONLY • STAGE A</span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {label:'Current Super Admin',value:loading ? '…' : roleCounts.superAdmins,icon:Shield},
          {label:'Current Admin',value:loading ? '…' : roleCounts.admins,icon:Users},
          {label:'Automated Modules',value:3,icon:Sparkles},
          {label:'Pending Backend Controls',value:3,icon:Settings2}
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
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-amber-950"><LockKeyhole size={18}/> Super Admin-only editing</h3>
            <p className="mt-3 text-xs leading-6 text-amber-900">Role Assign / Revoke, Staff Invite, Exam Result Correction, Auto-Publish और Approval Rules का असली Save/Update अगले सुरक्षित Backend Migration तथा Audit Review के बाद सक्षम होगा। अभी कोई असुरक्षित Client-side Role Editing विकल्प नहीं दिया गया है।</p>
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
