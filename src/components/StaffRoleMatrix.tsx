import React from 'react';
import { BookOpen, ClipboardList, GraduationCap, ShieldCheck } from 'lucide-react';

const rows = [
  { feature:'My exam results', superAdmin:'Audit / review', admin:'Assigned reports', teacher:'Assigned class*', student:'Own results' },
  { feature:'Study materials', superAdmin:'All resources', admin:'Assigned scope*', teacher:'Assigned drafts*', student:'Published only' },
  { feature:'Correction request', superAdmin:'Final approval*', admin:'Review request*', teacher:'Request only*', student:'View own status*' },
  { feature:'Publish or revoke', superAdmin:'Final authority*', admin:'Propose only*', teacher:'No', student:'No' },
  { feature:'Assign roles', superAdmin:'Grant / revoke*', admin:'No', teacher:'No', student:'No' },
  { feature:'Security audit trail', superAdmin:'Full review*', admin:'Own activity*', teacher:'Own activity*', student:'No' },
] as const;

export const StaffRoleMatrix: React.FC<{ materialBackendReady: boolean; resultBackendReady: boolean }> = ({materialBackendReady,resultBackendReady}) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold text-teal-700"><ShieldCheck size={17}/> PLATFORM-WIDE ACCESS BLUEPRINT</p>
        <h3 className="mt-2 text-lg font-extrabold text-slate-900">Unified Role & Permission Matrix</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">Result, Study Material और future modules के लिए least-privilege design. * चिह्न वाली सुविधाएँ संबंधित Backend approval और security tests के बाद ही सक्षम होंगी।</p>
      </div>
      <div className="flex gap-2 text-[11px] font-bold">
        <span className={'rounded-full px-3 py-1.5 '+(resultBackendReady?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-900')}>Result grants: {resultBackendReady?'Verified':'Pending'}</span>
        <span className={'rounded-full px-3 py-1.5 '+(materialBackendReady?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-900')}>Material grants: {materialBackendReady?'Verified':'Pending'}</span>
      </div>
    </div>
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[700px] text-left text-xs">
        <thead className="bg-slate-50 text-slate-700"><tr><th className="px-3 py-3">Function</th><th className="px-3 py-3">Super Admin</th><th className="px-3 py-3">Admin</th><th className="px-3 py-3">Teacher</th><th className="px-3 py-3">Student</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((row)=><tr key={row.feature}><th scope="row" className="px-3 py-3 font-bold text-slate-800">{row.feature}</th><td className="px-3 py-3 text-sky-900">{row.superAdmin}</td><td className="px-3 py-3 text-slate-700">{row.admin}</td><td className="px-3 py-3 text-slate-700">{row.teacher}</td><td className="px-3 py-3 text-slate-700">{row.student}</td></tr>)}</tbody>
      </table>
    </div>
    <a href={import.meta.env.BASE_URL+'staff-workspace/'} className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-sky-200 px-4 py-2 text-xs font-bold text-sky-900 hover:bg-sky-50">Open Teacher / Staff Workspace</a>
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><ClipboardList size={18} className="text-sky-800"/>Test submission → automatic grading</p>
      <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><BookOpen size={18} className="text-sky-800"/>Result → related study chapters</p>
      <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><GraduationCap size={18} className="text-sky-800"/>Scoped teacher material drafts*</p>
    </div>
  </section>
);
