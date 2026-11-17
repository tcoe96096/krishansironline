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
 const [superAdmin,setSuperAdmin]=useState(false);
 useEffect(()=>{let active=true;setSuperAdmin(false);setDirectory(false);if(user&&teacherBetaEnabled)void teacherCall<boolean>('is_super_admin').then(ok=>{if(active)setSuperAdmin(ok===true);}).catch(()=>{});return()=>{active=false;};},[user?.id]);
 const signInTeacher=async()=>{const redirectTo=new URL((import.meta.env.BASE_URL||'/')+'staff-workspace/',window.location.origin).toString();const {error}=await requireSupabase().auth.signInWithOAuth({provider:'google',options:{redirectTo}});if(error)throw error;};
 if(loading)return <main className="mx-auto max-w-4xl p-6">Checking your teacher account…</main>;
 return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
 <header className="rounded-2xl bg-sky-950 p-5 text-white"><h1 className="text-2xl font-bold">KSOL Teacher Beta</h1><p className="mt-2 text-sm">Registration, verified profiles, qualifications and class/subject assignments.</p></header>
 {!teacherBetaEnabled?<p role="status">Teacher Beta is awaiting owner-approved activation.</p>:!user?<section className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="font-bold">Teacher Google Login</h2><p>All teachers may apply. Login alone never grants Teacher or Admin authority.</p><button disabled={!configured} className="rounded bg-sky-900 px-4 py-3 text-white disabled:opacity-50" onClick={()=>void signInTeacher().catch(()=>setError('Google login unavailable. Please try again.'))}>Sign in with Google</button>{!configured&&<p>Login configuration awaits release approval.</p>}</section>:<>
 <nav className="flex flex-wrap gap-4" aria-label="Teacher Beta navigation"><button onClick={()=>setDirectory(false)}>Teacher Profile</button>{superAdmin&&<button onClick={()=>setDirectory(true)}>Teacher Directory</button>}<button onClick={()=>void signOut().catch(()=>setError('Sign out failed. Please try again.'))}>Sign out</button></nav>
 {directory?<AdminTeacherDirectoryV2 key={user.id}/>:<><section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Basic Teacher Dashboard</h2><p className="mt-2 break-all">Signed-in account: {user.email||user.id}</p><p className="mt-2 text-sm">Resume uploads, result analytics and advanced tools are disabled.</p></section><TeacherManagementV2 key={user.id}/></>}
 </>}{error&&<p role="alert">{error}</p>}</main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthProvider><TeacherBetaPortal/></AuthProvider></React.StrictMode>);
