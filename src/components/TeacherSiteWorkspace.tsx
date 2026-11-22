import React,{useState} from 'react';
import {GraduationCap,ClipboardCheck,LogIn,LayoutDashboard,LogOut,ShieldCheck} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {requireSupabase} from '../lib/supabase';
import {teacherBetaEnabled,teacherPhotoUiEnabled} from '../lib/teacherBetaFlags';
import {TeacherPrivatePhotoV2} from './TeacherPrivatePhotoV2';
import {TeacherManagementV2} from './TeacherManagementV2';
import {TeacherDashboardData} from '../../teacher-beta/TeacherDashboardData';

type TeacherArea='teacher'|'teacherRegistration'|'teacherLogin'|'teacherDashboard';
const styles={
 action:'inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-900 px-5 py-3 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50',
 secondary:'inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-sky-900 hover:bg-sky-50'
};
const teacherCallback=(target:TeacherArea)=>{
 const base=import.meta.env.BASE_URL||'/';
 if(!base.startsWith('/')||base.startsWith('//')||/[?#\\\\%\x00-\x1f\x7f]/.test(base)||base.split('/').some(s=>s==='..'||s==='.'))throw new Error('Invalid website base path.');
 const cleanBase=base.endsWith('/')?base:base+'/';
 const route=target==='teacherRegistration'?'teacher-registration/':'teacher-dashboard/';
 return new URL(cleanBase+route,window.location.origin).toString();
};

/** Teacher registration, login and dashboard within the existing main website.
 * All mutations are still denied server-side until approved Teacher v2 activation.
 * This is NOT the separate teacher-beta Vite entrypoint.
 */
export function TeacherSiteWorkspace({section,onNavigate}:{section:TeacherArea;onNavigate:(page:string)=>void}){
 const {user,loading,configured,signOut}=useAuth();
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const active=teacherBetaEnabled;
 const nav:{page:TeacherArea;label:string;icon:typeof GraduationCap}[]=[
  {page:'teacher',label:'Teacher Home',icon:GraduationCap},
  {page:'teacherRegistration',label:'Registration',icon:ClipboardCheck},
  {page:'teacherLogin',label:'Login',icon:LogIn},
  {page:'teacherDashboard',label:'Dashboard',icon:LayoutDashboard}
 ];
 const signIn=async(target:TeacherArea)=>{
  if(!active||!configured||busy)return;
  setBusy(true);setError('');
  try{
   const {error:failure}=await requireSupabase().auth.signInWithOAuth({
    provider:'google',options:{redirectTo:teacherCallback(target)}
   });
   if(failure)throw failure;
  }catch(e){setError(e instanceof Error?e.message:'Teacher Login could not start.');}
  finally{setBusy(false);}
 };
 return <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
  <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b2448] via-[#123c70] to-[#087d86] px-6 py-8 text-white shadow-lg sm:px-10" aria-label="Teacher Management portal">
   <p className="text-xs font-bold uppercase tracking-wider text-cyan-100">Krishan Sir Online Learning</p>
   <h1 className="mt-2 text-2xl font-extrabold sm:text-4xl">Teacher Management</h1>
   <p className="mt-3 max-w-2xl text-sm text-sky-100">Teacher Registration, Login और Dashboard — इसी वेबसाइट के अंदर। Admin approval के बाद ही Employee ID और Class/Subject permissions जारी होंगी।</p>
  </section>
  <nav className="mt-5 flex flex-wrap gap-2" aria-label="Teacher management navigation">
   {nav.map(({page,label,icon:Icon})=><button type="button" key={page} onClick={()=>onNavigate(page)} aria-current={section===page?'page':undefined} className={section===page?styles.action:styles.secondary}><Icon className="mr-2 h-4 w-4"/>{label}</button>)}
   {user&&active&&<button type="button" onClick={()=>void signOut().catch(()=>setError('Sign out failed.'))} className={styles.secondary}><LogOut className="mr-2 h-4 w-4"/>Sign out</button>}
  </nav>
  {!active&&<p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Teacher registration अभी सक्रिय नहीं है। Backend Database तथा सुरक्षा परीक्षण पूरे होने के बाद इसे शुरू किया जाएगा। यह पेज अभी आवेदन, Login, Employee ID या Permissions जारी नहीं करता।</p>}
  {error&&<p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</p>}
  {section==='teacher'&&<div className="mt-6 grid gap-5 lg:grid-cols-3">
   <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><ClipboardCheck className="h-8 w-8 text-teal-700"/><h2 className="mt-4 text-xl font-extrabold">Teacher Registration</h2><p className="mt-2 text-sm text-slate-600">Profile, qualification और एक से अधिक Class/Subject के लिए आवेदन।</p><button type="button" onClick={()=>onNavigate('teacherRegistration')} className={'mt-5 '+styles.action}>Registration पेज</button></article>
   <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><LogIn className="h-8 w-8 text-sky-800"/><h2 className="mt-4 text-xl font-extrabold">Teacher Login</h2><p className="mt-2 text-sm text-slate-600">सत्यापित Google Account से सुरक्षित Login। Login स्वयं Teacher Approval नहीं है।</p><button type="button" onClick={()=>onNavigate('teacherLogin')} className={'mt-5 '+styles.secondary}>Login पेज</button></article>
   <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><LayoutDashboard className="h-8 w-8 text-indigo-700"/><h2 className="mt-4 text-xl font-extrabold">Teacher Dashboard</h2><p className="mt-2 text-sm text-slate-600">Approval Status, Employee ID और स्वीकृत Class/Subject Assignments।</p><button type="button" onClick={()=>onNavigate('teacherDashboard')} className={'mt-5 '+styles.secondary}>Dashboard पेज</button></article>
  </div>}
  {section==='teacherLogin'&&<section className="mt-6 max-w-2xl rounded-2xl border bg-white p-6 shadow-sm">
   <h2 className="text-xl font-bold">Teacher Login</h2>
   {loading?<p className="mt-4 text-sm">Checking session…</p>:!active?<p className="mt-3 text-sm text-slate-600">सुरक्षित Backend चालू होने के बाद Teacher Login उपलब्ध होगा।</p>:user?<div className="mt-3"><p className="text-sm text-slate-700">Authenticated: {user.email||'Google account'}. Teacher permissions Server Approval पर निर्भर हैं।</p><button className={'mt-4 '+styles.action} onClick={()=>onNavigate('teacherDashboard')}>Open my dashboard</button></div>:<button type="button" disabled={busy||!configured} onClick={()=>void signIn('teacherDashboard')} className={'mt-4 '+styles.action}>{busy?'Connecting…':'Continue with Google'}</button>}
  </section>}
  {section==='teacherRegistration'&&<section className="mt-6 space-y-4" aria-label="Teacher registration page">
   {active&&!loading&&user?<TeacherManagementV2 key={user.id}/>:<div className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Teacher Registration</h2><p className="mt-2 text-sm text-slate-600">{!active?'Registration चालू होने पर इसी पेज में आवेदन फॉर्म खुलेगा।':'आवेदन करने के लिए Google Login आवश्यक है।'}</p>{active&&!user&&!loading&&<button type="button" disabled={busy||!configured} onClick={()=>void signIn('teacherRegistration')} className={'mt-4 '+styles.action}>Login to register</button>}</div>}
  </section>}
  {section==='teacherDashboard'&&<section className="mt-6" aria-label="Teacher dashboard page">
   {active&&!loading&&user?<div className="space-y-5"><TeacherDashboardData key={user.id} userId={user.id}/>{teacherPhotoUiEnabled&&<TeacherPrivatePhotoV2 canUpload={false}/>}</div>:<div className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Teacher Dashboard</h2><p className="mt-2 text-sm text-slate-600">{!active?'Backend Activation के बाद यहाँ Teacher Dashboard उपलब्ध होगा।':'Teacher Dashboard के लिए Login करें।'}</p>{active&&!user&&!loading&&<button type="button" disabled={busy||!configured} onClick={()=>void signIn('teacherDashboard')} className={'mt-4 '+styles.action}>Teacher Login</button>}</div>}
  </section>}
  <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"><ShieldCheck className="h-5 w-5 text-teal-700"/> शिक्षक की स्वयं चुनी गई Classes और Subjects अधिकार नहीं हैं; Admin द्वारा स्वीकृत Assignment ही मान्य है।</div>
 </div>;
}
