import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Award, RefreshCw, Trophy, Users } from 'lucide-react';
import { requireSupabase } from '../lib/supabase';

type Profile = { user_id: string; student_name: string; class_level: string; roll_no: string };
type Attempt = { student_id: string; status: string; percentage: number | null };
type Leader = { id: string; name: string; classLevel: string; average: number; tests: number };

export const AdminProAnalytics: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [bookmarks, setBookmarks] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState<number | null>(null);
  const [activityCount, setActivityCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const db = requireSupabase();
      const [p, a, b, m, d] = await Promise.all([
        db.from('student_profiles').select('user_id,student_name,class_level,roll_no').limit(1000),
        db.from('test_attempts').select('student_id,status,percentage').eq('status','submitted').order('submitted_at',{ascending:false}).limit(5000),
        db.from('student_bookmarks').select('id',{count:'exact',head:true}),
        db.from('student_mistake_notebook').select('id',{count:'exact',head:true}),
        db.from('student_daily_activity').select('student_id,activity_date',{count:'exact',head:true}).gte('activity_date',new Date(Date.now()-6*86400000).toISOString().slice(0,10)),
      ]);
      for (const result of [p,a,b,m,d]) if (result.error) throw result.error;
      setProfiles((p.data ?? []) as Profile[]);
      setAttempts((a.data ?? []) as Attempt[]);
      setBookmarks(b.count ?? 0); setMistakes(m.count ?? 0); setActivityCount(d.count ?? 0);
    } catch (e) { setError(e instanceof Error ? e.message : 'Analytics डेटा लोड नहीं हो सका।'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const leaders = useMemo<Leader[]>(() => {
    const profileMap = new Map(profiles.map(p => [p.user_id,p]));
    const grouped = new Map<string,{total:number;count:number}>();
    attempts.forEach(a => {
      const old=grouped.get(a.student_id) ?? {total:0,count:0};
      old.total += Number(a.percentage ?? 0); old.count += 1; grouped.set(a.student_id,old);
    });
    return [...grouped.entries()].map(([id,v]) => {
      const p=profileMap.get(id);
      return p ? {id,name:p.student_name,classLevel:p.class_level,average:Math.round(v.total/v.count),tests:v.count} : null;
    }).filter((x): x is Leader => Boolean(x)).sort((a,b)=>b.average-a.average || b.tests-a.tests).slice(0,10);
  },[profiles,attempts]);

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-indigo-700">ADMIN INTELLIGENCE</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">Pro Student Analytics & Leaderboard</h3><p className="mt-1 text-xs text-slate-500">सर्वर पर उपलब्ध student activity और submitted test records के आधार पर</p></div>
      <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"><RefreshCw className="h-4 w-4"/>{loading?'लोड हो रहा है':'Refresh'}</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[{label:'Students loaded',value:profiles.length,icon:Users},{label:'Submitted attempts',value:attempts.length,icon:Activity},{label:'Bookmarks saved',value:bookmarks,icon:Award},{label:'Mistakes recorded',value:mistakes,icon:Trophy}].map((x,i)=>{const Icon=x.icon;return <div key={x.label} className="rounded-xl bg-slate-50 p-3"><Icon className="h-4 w-4 text-indigo-700"/><p className="mt-2 text-xl font-black text-slate-900">{loading?'…':x.value ?? '—'}</p><p className="text-[10px] font-semibold text-slate-500">{x.label}</p></div>;})}
    </div>
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="flex items-center justify-between gap-2"><div><h4 className="text-sm font-extrabold text-slate-900">Top 10 Student Ranking</h4><p className="text-[10px] text-slate-500">Average percentage across up to 5,000 latest submitted attempts</p></div><Trophy className="h-5 w-5 text-amber-500"/></div>
      {leaders.length ? <div className="mt-3 divide-y divide-slate-100">{leaders.map((x,i)=><div key={x.id} className="flex items-center gap-3 py-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-xs font-black text-slate-700">{i+1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{x.name}</p><p className="text-[10px] text-slate-500">Class {x.classLevel} · Roll {profiles.find(p=>p.user_id===x.id)?.roll_no} · {x.tests} tests</p></div><span className="text-sm font-black text-emerald-700">{x.average}%</span></div>)}</div> : <p className="py-5 text-center text-xs text-slate-500">{loading?'डेटा लोड हो रहा है…':'अभी पर्याप्त submitted test data उपलब्ध नहीं है।'}</p>}
    </div>
    <p className="text-[10px] leading-4 text-slate-400">Recent activity rows (last 7 days): {activityCount ?? '—'}. Ranking is based on average percentage, not a live competitive exam rank. Student profiles are limited to the latest 1,000 records and attempts to the latest 5,000.</p>
  </section>;
};
