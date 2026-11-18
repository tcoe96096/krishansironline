import React from 'react';
import {BookOpen, ClipboardCheck, GraduationCap, LayoutDashboard, ShieldCheck} from 'lucide-react';
import {TeacherProfilePhoto} from './TeacherProfilePhoto';

interface Props {
  preview: boolean;
  teacherName: string;
  photoUrl: string|null;
  onRegistration: () => void;
  onLogin: () => void;
}

export function TeacherDashboardOverview({preview,teacherName,photoUrl,onRegistration,onLogin}: Props) {
  return <section aria-label="Teacher dashboard overview" className="space-y-5">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-xs font-extrabold uppercase tracking-widest text-teal-700">My Workspace</p>
      <div className="mt-2 flex items-center gap-3">
        <LayoutDashboard className="h-7 w-7 text-sky-800" aria-hidden="true"/>
        <h2 className="text-2xl font-extrabold text-slate-900">My Teacher Dashboard</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {preview ? 'Sample dashboard only. No account or teacher role has been created.' :
          'Manage your registration status and review available teaching workspace features.'}
      </p>
      {preview && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Visual demo · No saved applications, employee IDs, storage uploads or backend permissions.
      </p>}
    </div>
    <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
      <TeacherProfilePhoto teacherName={teacherName} photoUrl={photoUrl}/>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          {label:'Registration',detail:preview?'Sample form only':'Review your saved application',icon:ClipboardCheck},
          {label:'Employee ID',detail:preview?'Not issued':'Shown after independent approval',icon:ShieldCheck},
          {label:'My Classes',detail:preview?'Example: Classes 6–12':'Subject and class scopes require approval',icon:GraduationCap},
          {label:'Study Materials',detail:'Tools remain disabled until authorized',icon:BookOpen},
        ].map(({label,detail,icon:Icon})=><article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <Icon className="mb-3 h-6 w-6 text-sky-800" aria-hidden="true"/>
          <h3 className="font-bold text-slate-900">{label}</h3>
          <p className="mt-1 text-sm text-slate-600">{detail}</p>
        </article>)}
      </div>
    </div>
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={onRegistration} className="rounded-xl bg-sky-900 px-5 py-3 text-sm font-bold text-white">
        {preview?'View Registration Page':'My Registration'}
      </button>
      {preview&&<button type="button" onClick={onLogin} className="rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-sky-900">Back to Login</button>}
    </div>
  </section>;
}
