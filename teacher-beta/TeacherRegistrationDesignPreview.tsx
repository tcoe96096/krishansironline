/** Visual-only preview for the approval-gated Teacher Beta portal.
 * Deliberately independent of Supabase, auth, and write handlers.
 * No data submitted, stored, or fetched; never confers a role.
 */
const exampleScopes=[
 {classLevel:'6',subject:'English',work:'Study materials'},
 {classLevel:'7',subject:'Hindi',work:'Study materials'},
 {classLevel:'8',subject:'Social Science',work:'Study materials'},
];
function DemoField({label,value}:{label:string;value:string}){
 return <div><p className="mb-1 text-xs font-semibold text-slate-600">{label}</p><div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">{value}</div></div>;
}
export function TeacherRegistrationDesignPreview(){
 return <section className="space-y-5" aria-label="Visual preview of Teacher Registration form">
  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900" role="status">
   <p className="font-bold">Design preview — sample information only</p>
   <p className="mt-1">This screen shows the proposed registration and admin review layout. Fields and buttons are inactive. No application, login or database action is possible here.</p>
  </div>
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(270px,1fr)]">
   <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Step 1 of 3</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Teacher Registration</h2><p className="mt-1 text-sm text-slate-600">Personal information and teaching qualifications</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
     <DemoField label="Full name" value="Example Teacher"/>
     <DemoField label="Email" value="example@school.test"/>
     <DemoField label="Phone" value="Not provided"/>
     <DemoField label="Experience" value="3 years (example)"/>
    </div>
    <div className="rounded-2xl border border-slate-200 p-4">
     <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-slate-900">Qualifications</h3><span className="rounded-lg bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900">Multiple entries supported</span></div>
     <div className="grid gap-3 sm:grid-cols-3"><DemoField label="Qualification" value="B.Ed (example)"/><DemoField label="Institution" value="Example College"/><DemoField label="Year" value="2022"/></div>
    </div>
    <div className="rounded-2xl border border-slate-200 p-4">
     <h3 className="font-bold text-slate-900">Requested teaching assignments</h3><p className="mt-1 text-xs text-slate-500">One teacher can request multiple classes and subjects. Assignments require Super Admin approval.</p>
     <div className="mt-3 flex flex-wrap gap-2">{exampleScopes.map(s=><span key={s.classLevel+s.subject} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900">Class {s.classLevel} · {s.subject}</span>)}</div>
    </div>
    <DemoField label="Reason for applying" value="I would like to contribute teaching materials (example)."/>
    <div className="flex flex-wrap gap-3"><span className="rounded-xl border border-sky-900 px-4 py-3 text-sm font-bold text-sky-900">Save draft · disabled</span><span className="rounded-xl bg-sky-900 px-4 py-3 text-sm font-bold text-white opacity-65">Submit for Review · disabled</span></div>
   </section>
   <div className="space-y-5">
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
     <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Step 2 of 3</p><h2 className="mt-1 text-lg font-extrabold">Application Tracking</h2>
     <div className="mt-4 space-y-3 text-sm">
      <div className="flex items-center justify-between gap-3"><span>Profile draft</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">Not saved</span></div>
      <div className="flex items-center justify-between gap-3"><span>Admin review</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">Not submitted</span></div>
      <div className="flex items-center justify-between gap-3"><span>Employee ID</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">Not issued</span></div>
     </div>
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
     <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Step 3 of 3</p><h2 className="mt-1 text-lg font-extrabold">Super Admin Verification</h2>
     <p className="mt-2 text-sm text-slate-600">An authorized Super Admin reviews the application, verifies identity and independently approves requested assignments. Employee ID is issued only after approval.</p>
     <div className="mt-4 rounded-2xl bg-sky-50 p-4"><p className="text-xs font-semibold text-sky-900">Example approval flow</p><p className="mt-2 text-sm text-slate-800">Application → Verification → Scope approval → Employee ID</p></div>
    </section>
   </div>
  </div>
 </section>;
}
