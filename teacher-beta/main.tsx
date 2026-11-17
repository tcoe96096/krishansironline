import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider,useAuth} from '../src/context/AuthContext';
import {TeacherManagementV2} from '../src/components/TeacherManagementV2';
import {AdminTeacherDirectoryV2} from '../src/components/AdminTeacherDirectoryV2';
import {teacherBetaEnabled} from '../src/lib/teacherBetaFlags';
import {requireSupabase} from '../src/lib/supabase';
import {teacherCall} from '../src/services/teacherManagement';
import '../src/index.css';
function TeacherBetaPortal(){
 const {user,loading,configured,signOut}=useAuth();
 const [directory,setDirectory]=useState(false),[error,setError]=useState('');
 const [superAdminAccount,setSuperAdminAccount]=useState<string|null>(null);
 const canReview=!!user&&superAdminAccount===user.id;
 useEffect(()=>{let active=true;setSuperAdminAccount(null);setDirectory(false);if(user&&teacherBetaEnabled)void teacherCall<boolean>('is_super_admin').then(ok=>{if(active&&ok===true)setSuperAdminAccount(user.id);}).catch(()=>{});return()=>{active=false;};},[user?.id]);
 const signInTeacher=async()=>{const redirectTo=new URL((import.meta.env.BASE_URL||'/')+'staff-workspace/',window.location.origin).toString();const {error}=await requireSupabase().auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(error)throw error;};
 if(loading)return <main className="mx-auto max-w-4xl p-6">Checking your teacher account…</main>;
 return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
 <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-sky-950 to-teal-800 p-6 text-white shadow-lg"><p className="text-xs font-semibold uppercase tracking-widest text-teal-200">Krishan Sir Online Learning</p><h1 className="mt-2 text-3xl font-bold">Teacher Management</h1><p className="mt-2 text-sm text-sky-100">One place to apply, manage your teaching profile, and track approval.</p><div className="mt-5 grid gap-2 sm:grid-cols-3">{["1. Google sign-in","2. Profile & qualifications","3. Admin verification"].map(step=><div key={step} className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm">{step}</div>)}</div></header>
 {!teacherBetaEnabled?<p role="status">Teacher Beta is awaiting owner-approved activation.</p>:!user?<section className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="font-bold">Teacher Google Login</h2><p>All teachers may apply. Login alone never grants Teacher or Admin authority.</p><button disabled={!configured} className="rounded bg-sky-900 px-4 py-3 text-white disabled:opacity-50" onClick={()=>void signInTeacher().catch(()=>setError('Google login unavailable. Please try again.'))}>Sign in with Google</button>{!configured&&<p>Login configuration awaits release approval.</p>}</section>:<>
 <nav className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 shadow-sm" aria-label="Teacher Beta navigation"><button aria-current={!directory?"page":undefined} className={`rounded-xl px-4 py-2 font-semibold ${!directory?"bg-sky-900 text-white":"bg-slate-100 text-slate-800"}`} onClick={()=>setDirectory(false)}>My Registration</button>{canReview&&<button aria-current={directory?"page":undefined} className={`rounded-xl px-4 py-2 font-semibold ${directory?"bg-sky-900 text-white":"bg-slate-100 text-slate-800"}`} onClick={()=>setDirectory(true)}>Review Teachers</button>}<button className="ml-auto rounded-xl border px-4 py-2" onClick={()=>void signOut().catch(()=>setError('Sign out failed. Please try again.'))}>Sign out</button></nav>
 {directory&&canReview?<AdminTeacherDirectoryV2 key={user.id}/>:<><section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Basic Teacher Dashboard</h2><p className="mt-2 break-all">Signed-in account: {user.email||user.id}</p><p className="mt-2 text-sm">Resume uploads, result analytics and advanced tools are disabled.</p></section><TeacherManagementV2 key={user.id}/></>}
 </>}{error&&<p role="alert">{error}</p>}</main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthProvider><TeacherBetaPortal/></AuthProvider></React.StrictMode>);
