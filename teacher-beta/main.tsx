import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider, useAuth} from '../src/context/AuthContext';
import {TeacherManagementV2} from '../src/components/TeacherManagementV2';
import {AdminTeacherDirectoryV2} from '../src/components/AdminTeacherDirectoryV2';
import {teacherBetaEnabled} from '../src/lib/teacherBetaFlags';
import {requireSupabase} from '../src/lib/supabase';
import {teacherCall} from '../src/services/teacherManagement';
import {teacherDashboardLoginCallback, teacherLoginCallback} from '../src/lib/teacherLoginCallback';
import {TeacherRegistrationDesignPreview} from './TeacherRegistrationDesignPreview';
import {TeacherDashboardOverview} from './TeacherDashboardOverview';
import {teacherPageFromPath, teacherPagePath, type TeacherPage} from './teacherRoutes';
import {BookOpen, ClipboardCheck, GraduationCap, LayoutDashboard, LogIn, LogOut, ShieldCheck, UserRound} from 'lucide-react';
import '../src/index.css';

const actionClass='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-900 px-5 py-3 text-sm font-bold text-white hover:bg-sky-800';
const secondaryClass='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-sky-900 hover:bg-sky-50';

function TeacherBetaPortal(){
  const {user, loading, configured, signOut}=useAuth();
  const [page, setPage]=useState<TeacherPage>(()=>teacherPageFromPath(window.location.pathname,import.meta.env.BASE_URL||'/'));
  const [error,setError]=useState('');
  const [superAdminAccount,setSuperAdminAccount]=useState<string|null>(null);
  const canReview=Boolean(user && superAdminAccount===user.id);
  useEffect(()=>{
    const onPopState=()=>setPage(teacherPageFromPath(window.location.pathname,import.meta.env.BASE_URL||'/'));
    window.addEventListener('popstate',onPopState);
    return ()=>window.removeEventListener('popstate',onPopState);
  },[]);
  useEffect(()=>{
    let active=true;setSuperAdminAccount(null);
    if(user&&teacherBetaEnabled)void teacherCall<boolean>('is_super_admin')
      .then(ok=>{if(active&&ok===true)setSuperAdminAccount(user.id);})
      .catch(()=>{});
    return ()=>{active=false;};
  },[user?.id]);

  function go(next:TeacherPage){
    const path=teacherPagePath(next,import.meta.env.BASE_URL||'/');
    window.history.pushState(null,'',path);
    setPage(next);setError('');
    window.scrollTo({top:0,behavior:'instant'});
  }
  async function signInTeacher(target:'registration'|'dashboard'='dashboard'){
    // An applicant returns to registration; existing accounts return to Dashboard.
    // Google OAuth creates a login identity, never an approved Teacher role.
    const origin=window.location.origin,base=import.meta.env.BASE_URL||'/';
    const redirectTo=target==='registration'?teacherLoginCallback(origin,base):teacherDashboardLoginCallback(origin,base);
    const {error:oauthError}=await requireSupabase().auth.signInWithOAuth({provider:'google',options:{redirectTo}});
    if(oauthError)throw oauthError;
  }
  if(loading)return <main className="min-h-screen bg-slate-50 p-8 text-slate-700">Checking teacher session…</main>;
  const demo=!teacherBetaEnabled;
  const teacherName=String(user?.user_metadata?.full_name||user?.email||'Example Teacher');
  const nav:{page:TeacherPage;label:string;icon:typeof GraduationCap}[]=[
    {page:'welcome',label:'Home',icon:GraduationCap},
    {page:'register',label:'Registration',icon:ClipboardCheck},
    {page:'login',label:'Login',icon:LogIn},
    {page:'dashboard',label:'Teacher Dashboard',icon:LayoutDashboard},
    ...(canReview?[{page:'admin' as TeacherPage,label:'Review Teachers',icon:ShieldCheck}]:[]),
  ];
  const demoNotice=<p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <strong>Design Preview Only.</strong> Teacher Beta is OFF. These pages do not create accounts, save applications, issue Employee IDs, upload photos or grant permissions.
  </p>;

  return <main className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 text-slate-900">
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b2448] via-[#123c70] to-[#087d86] px-6 py-7 text-white shadow-xl sm:px-9">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[36px] border-white/10" aria-hidden="true"/>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-cyan-200"><GraduationCap className="h-5 w-5"/> Krishan Sir Online Learning</p>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl">Teacher Management Portal</h1>
            <p className="mt-2 max-w-xl text-sm text-sky-100">Register → Login → Teacher Dashboard · Separate pages, one secure account.</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-xs font-semibold text-cyan-100">Teacher Core Beta</p>
            <p className="mt-1 text-sm font-bold">{demo?'Visual preview · Activation pending':'Registration workspace'}</p>
          </div>
        </div>
      </header>
      <div className="mt-5 flex flex-wrap items-center gap-2" role="navigation" aria-label="Teacher portal pages">
        {nav.map(({page:target,label,icon:Icon})=><button key={target} type="button"
          aria-current={page===target?'page':undefined} onClick={()=>go(target)}
          className={page===target?'inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-900 px-4 py-2 text-sm font-bold text-white shadow-sm':
            'inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-sky-50'}>
          <Icon className="h-4 w-4" aria-hidden="true"/>{label}
        </button>)}
        {user&&teacherBetaEnabled&&<button type="button" onClick={()=>void signOut().catch(()=>setError('Sign out failed. Please try again.'))}
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"><LogOut className="h-4 w-4"/> Sign out</button>}
      </div>
      <div className="mt-5 space-y-5">
        {demo&&demoNotice}
        {page==='welcome'&&<section className="grid gap-4 lg:grid-cols-2" aria-label="Teacher portal welcome">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-4 inline-flex rounded-2xl bg-teal-50 p-3 text-teal-800"><ClipboardCheck className="h-7 w-7"/></div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Step 01</p>
            <h2 className="mt-2 text-2xl font-extrabold">New Teacher Registration</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Personal details, qualifications, optional resume and multiple class/subject requests. Admin verification remains separate.</p>
            <button onClick={()=>go('register')} className={'mt-6 '+actionClass}>Open Registration Page</button>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-4 inline-flex rounded-2xl bg-sky-50 p-3 text-sky-800"><LogIn className="h-7 w-7"/></div>
            <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Step 02</p>
            <h2 className="mt-2 text-2xl font-extrabold">Already Registered?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Sign in with your existing Google account. After authenticated access, view your dashboard. Login does not grant Teacher permissions.</p>
            <button onClick={()=>go('login')} className={'mt-6 '+secondaryClass}>Open Login Page</button>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Step 03</p>
            <h2 className="mt-2 text-xl font-extrabold">Dashboard after Login</h2>
            <p className="mt-2 text-sm text-slate-600">Teacher profile photograph, application status, Employee ID after approval, classes and teaching tools all belong in the Teacher Dashboard, not on the public registration page.</p>
            {demo&&<button onClick={()=>go('dashboard')} className={'mt-4 '+secondaryClass}>Explore Dashboard Demo</button>}
            {user&&!demo&&<button onClick={()=>go('dashboard')} className={'mt-4 '+secondaryClass}>Open My Dashboard</button>}
          </article>
        </section>}

        {page==='register'&&<section aria-label="Teacher registration page" className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Registration Page · Step 1</p>
            <h2 className="mt-1 text-xl font-extrabold">Teacher Registration</h2>
            <p className="mt-1 text-sm text-slate-600">Separate from Login and Dashboard. New applications require a signed-in identity and independent Admin approval.</p>
          </div>
          {user&&!demo?<TeacherManagementV2 key={user.id}/>:<TeacherRegistrationDesignPreview/>}
          {(!user&&!demo)&&<button disabled={!configured} onClick={()=>void signInTeacher('registration').catch(()=>setError('Google login unavailable. Please try again.'))} className={actionClass+' disabled:opacity-50'}>Sign in to Apply</button>}
          <button type="button" onClick={()=>go('login')} className={secondaryClass}>Go to Login Page</button>
        </section>}

        {page==='login'&&<section aria-label="Teacher login page" className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="mb-4 inline-flex rounded-2xl bg-sky-50 p-3 text-sky-800"><LogIn className="h-7 w-7"/></div>
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Login Page · Step 2</p>
          <h2 className="mt-2 text-2xl font-extrabold">Teacher Google Login</h2>
          <p className="mt-3 text-sm text-slate-600">Use the same Google account used for Teacher Registration. Signing in is separate from approval and Employee ID issuance.</p>
          {user&&!demo?<><p role="status" className="mt-4 text-sm font-semibold text-teal-800">Signed in as {user.email||user.id}</p><button onClick={()=>go('dashboard')} className={'mt-4 '+actionClass}>Go to My Dashboard</button></>:<>
            <button type="button" disabled={demo||!configured} onClick={()=>void signInTeacher().catch(()=>setError('Google login unavailable. Please try again.'))} className={actionClass+' mt-5 disabled:cursor-not-allowed disabled:opacity-50'}>
              Sign in with Google {demo?'· disabled':''}
            </button>
            {demo&&<p className="mt-3 text-xs text-amber-900">Login is disabled in the visual preview. No credentials are collected.</p>}
          </>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={()=>go('register')} className={secondaryClass}>New Teacher? Registration</button>
            {demo&&<button type="button" onClick={()=>go('dashboard')} className={secondaryClass}>View Dashboard Demo</button>}
          </div>
        </section>}

        {page==='dashboard'&&<div className="space-y-5">
          {(!user&&!demo)?<section role="status" className="rounded-2xl border border-amber-200 bg-white p-7 text-center">
            <h2 className="text-xl font-bold">Login required for Teacher Dashboard</h2>
            <button onClick={()=>go('login')} className={'mt-4 '+actionClass}>Go to Login</button>
          </section>:<TeacherDashboardOverview preview={demo} teacherName={demo?'Example Teacher':teacherName} onRegistration={()=>go('register')} onLogin={()=>go('login')}/>}
        </div>}

        {page==='admin'&&<div className="space-y-4">
          {canReview&&!demo?<AdminTeacherDirectoryV2 key={user!.id}/>:<section role="status" className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Super Admin Review</h2>
            <p className="mt-2 text-sm text-slate-600">Independent identity verification, class and subject assignments and Employee ID issuance are restricted to approved administrators. No review actions are available in this preview.</p>
            <button onClick={()=>go('login')} className={'mt-4 '+secondaryClass}>Return to Login</button>
          </section>}
        </div>}
        {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">KSOL Teacher Portal · GitHub Pages design preview · No production activation</footer>
      </div>
    </div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthProvider><TeacherBetaPortal/></AuthProvider></React.StrictMode>);
