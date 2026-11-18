import {TeacherPhotoPicker} from './TeacherProfilePhoto';
/** A separate, visual-only teacher registration page.
 * No auth, persistence, or privileged operations run in this demo.
 * The actual application form is displayed only to signed-in teachers once
 * registration has been independently activated.
 */
const exampleScopes=[
  {classLevel:'6',subject:'English'},
  {classLevel:'7',subject:'Hindi'},
  {classLevel:'8',subject:'Social Science'},
];
function DemoField({label,value}:{label:string;value:string}){
  return <div><p className="mb-1 text-xs font-semibold text-slate-600">{label}</p>
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">{value}</div>
  </div>;
}
export function TeacherRegistrationDesignPreview({photoUrl,onPhotoSelected,onRemovePhoto}:{photoUrl:string|null;onPhotoSelected:(file:File)=>void;onRemovePhoto:()=>void}){
  return <section className="mx-auto max-w-4xl space-y-5" aria-label="Visual preview of Teacher Registration form">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-lg font-bold text-white">1</span>
        <div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">New Teacher · Registration</p>
          <h2 className="text-xl font-extrabold text-slate-900">Teacher Registration Form</h2></div>
      </div>
      <p className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">
        Form layout preview only. Information shown below is illustrative and cannot be submitted or saved.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <DemoField label="Full name" value="Example Teacher"/>
        <DemoField label="Email" value="example@school.test"/>
        <DemoField label="Phone" value="Not provided"/>
        <DemoField label="Experience" value="3 years (example)"/>
      </div>
      <div className="mt-5"><TeacherPhotoPicker teacherName="Example Teacher" photoUrl={photoUrl} onPhotoSelected={onPhotoSelected} onRemove={onRemovePhoto}/></div>
      <section className="mt-5 rounded-2xl border border-slate-200 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900">Qualifications</h3>
          <span className="rounded-lg bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900">Multiple entries</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <DemoField label="Qualification" value="B.Ed (example)"/>
          <DemoField label="Institution" value="Example College"/>
          <DemoField label="Year" value="2022"/>
        </div>
      </section>
      <section className="mt-5 rounded-2xl border border-slate-200 p-4">
        <h3 className="font-bold text-slate-900">Requested Classes and Subjects</h3>
        <p className="mt-1 text-xs text-slate-500">One teacher may request multiple assignments. Super Admin approval is required.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {exampleScopes.map(s=><span key={s.classLevel+s.subject} className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900">Class {s.classLevel} · {s.subject}</span>)}
        </div>
      </section>
      <div className="mt-5"><DemoField label="Resume / बायोडाटा" value="Private PDF/DOCX upload · disabled until independent approval"/></div>
      <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
        <span className="rounded-xl border border-sky-900 px-4 py-3 text-sm font-bold text-sky-900 opacity-60">Save Draft · disabled</span>
        <span className="rounded-xl bg-sky-900 px-4 py-3 text-sm font-bold text-white opacity-60">Submit for Review · disabled</span>
      </div>
    </div>
  </section>;
}
