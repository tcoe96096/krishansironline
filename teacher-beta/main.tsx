import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider,useAuth} from '../src/context/AuthContext';
import {TeacherManagementV2} from '../src/components/TeacherManagementV2';
import {AdminTeacherDirectoryV2} from '../src/components/AdminTeacherDirectoryV2';
import {teacherBetaEnabled} from '../src/lib/teacherBetaFlags';
import {requireSupabase} from '../src/lib/supabase';
import {teacherCall} from '../src/services/teacherManagement';
import {teacherLoginCallback} from '../src/lib/teacherLoginCallback';
import {TeacherRegistrationDesignPreview} from './TeacherRegistrationDesignPreview';
import {ClipboardCheck,GraduationCap,LayoutDashboard,LogOut,ShieldCheck,UserRound} from 'lucide-react';
import '../src/index.css';
function TeacherBetaPortal(){
 const {user,loading,configured,signOut}=useAuth();
 const [directory,setDirectory]=useState(false),[error,setError]=useState('');
 const [superAdminAccount,setSuperAdminAccount]=useState<string|null>(null);
 const canReview=!!user&&superAdminAccount===user.id;
 useEffect(()=>{let active=true;setSuperAdminAccount(null);setDirectory(false);if(user&&teacherBetaEnabled)void teacherCall<boolean>('is_super_admin').then(ok=>{if(active&&ok===true)setSuperAdminAccount(user.id);}).catch(()=>{});return()=>{active=false;};},[user?.id]);
 const signInTeacher=async()=>{const redirectTo=teacherLoginCallback(window.location.origin,import.meta.env.BASE_URL||'/');const {error}=await requireSupabase().auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(error)throw error;};

 const menu=[{label:'My Registration',icon:ClipboardCheck,active:!directory,onClick:()=>setDirectory(false)},...(canReview?[{label:'Review Teachers',icon:ShieldCheck,active:directory,onClick:()=>setDirectory(true)}]:[])];
 if(loading)return <main className="min-h-screen bg-slate-50 p-8 text-slate-700">Checking your teacher account…</main>;
 return <main className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 text-slate-900">
  <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
   <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b2448] via-[#123c70] to-[#087d86] px-6 py-7 text-white shadow-xl sm:px-9">
    <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[36px] border-white/10" aria-hidden="true"/>
    <div className="relative flex flex-wrap items-center justify-between gap-4">
     <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-cyan-200"><GraduationCap className="h-5 w-5"/> Krishan Sir Online Learning</p><h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl">Teacher Workspace</h1><p className="mt-2 max-w-xl text-sm text-sky-100">Your teaching profile, qualifications and application progress in one place.</p></div>
     <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur"><p className="text-xs font-semibold text-cyan-100">Teacher Core Beta</p><p className="mt-1 text-sm font-bold">{teacherBetaEnabled?'Registration workspace':'Preview · Activation pending'}</p></div>
    </div>
   </header>
   <div className="mt-6 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
    <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Teacher workspace sidebar">
     <div className="mb-4 flex items-center gap-3 rounded-2xl bg-sky-50 p-3"><div className="rounded-xl bg-sky-900 p-2 text-white"><UserRound className="h-5 w-5"/></div><div className="min-w-0"><p className="text-xs font-semibold text-slate-500">Teacher account</p><p className="truncate text-sm font-bold">{user?.email||'Guest preview'}</p></div></div>
     <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Workspace</p>
     {user&&teacherBetaEnabled?menu.map(({label,icon:Icon,active,onClick})=><button key={label} type="button" aria-current={active?'page':undefined} onClick={onClick} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active?'bg-sky-900 text-white shadow-sm':'text-slate-700 hover:bg-sky-50'}`}><Icon className="h-4 w-4"/>{label}</button>):<div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Registration and role-based navigation will open after approved backend activation.</div>}
     {user&&teacherBetaEnabled&&<button type="button" onClick={()=>void signOut().catch(()=>setError('Sign out failed. Please try again.'))} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4"/>Sign out</button>}
    </aside>
    <div className="min-w-0 space-y-5">
     <section className="grid gap-3 sm:grid-cols-3" aria-label="Teacher workspace overview">
      {[{title:'Registration',value:teacherBetaEnabled?(user?'Profile workspace':'Sign-in required'):'Awaiting activation',icon:ClipboardCheck},{title:'Qualifications',value:'Manage your profile',icon:GraduationCap},{title:'Approval',value:'Super Admin review',icon:ShieldCheck}].map(({title,value,icon:Icon})=><div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3 inline-flex rounded-xl bg-teal-50 p-2 text-teal-800"><Icon className="h-5 w-5"/></div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p><p className="mt-1 text-sm font-bold text-slate-900">{value}</p></div>)}
     </section>
     {!teacherBetaEnabled?<><section role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><h2 className="font-bold">Teacher Beta is awaiting owner-approved activation</h2><p className="mt-2">This is a visual preview only. No registration, teacher role, or backend action is enabled.</p></section><TeacherRegistrationDesignPreview/></>:!user?<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Teacher Google Login</h2><p className="mt-2 text-sm text-slate-600">Sign in to apply. Signing in never grants Teacher or Admin permissions.</p><button disabled={!configured} className="mt-5 rounded-xl bg-sky-900 px-5 py-3 font-semibold text-white disabled:opacity-50" onClick={()=>void signInTeacher().catch(()=>setError('Google login unavailable. Please try again.'))}>Sign in with Google</button>{!configured&&<p className="mt-3 text-sm">Login configuration awaits release approval.</p>}</section>:directory&&canReview?<AdminTeacherDirectoryV2 key={user.id}/>:<><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><LayoutDashboard className="h-5 w-5 text-sky-800"/><h2 className="text-lg font-bold">My Teacher Dashboard</h2></div><p className="mt-2 break-all text-sm text-slate-600">Signed-in account: {user.email||user.id}</p><p className="mt-2 text-xs text-slate-500">Resume uploads, result analytics and advanced assignments are disabled.</p></section><TeacherManagementV2 key={user.id}/></>}
     {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    </div>
   </div>
  </div>
 </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthProvider><TeacherBetaPortal/></AuthProvider></React.StrictMode>);
