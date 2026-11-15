import React from 'react';
import { CheckCircle2, GraduationCap, Printer, ShieldCheck, Target, XCircle } from 'lucide-react';
import { percentageLabel, percentBarWidth, submittedMetrics } from '../services/resultMetrics';
import type { TestAttempt } from '../services/testService';

/** Display-only report: values come from a previously graded, server-recorded attempt. */
export type ResultReportTheme = 'modern' | 'classic' | 'minimal';
/** Presentation-only editing; never overrides student identity, grades or recorded answers. */
export type ResultReportOptions = {
  showInstitution?: boolean;
  showMetrics?: boolean;
  footerNote?: string;
};

export type ResultReportStudent = {
  name: string;
  rollNo?: string | null;
  classLevel?: string | null;
  school?: string | null;
};
export type ResultReportData = {
  attempt: TestAttempt;
  title: string;
  subject?: string | null;
  student: ResultReportStudent;
  theme?: ResultReportTheme;
  isEnglish?: boolean;
  options?: ResultReportOptions;
};

const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
));
const dateText = (value: string | null, en: boolean) => value
  ? new Date(value).toLocaleDateString(en ? 'en-IN' : 'hi-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';
const themeStyles: Record<ResultReportTheme, { main: string; accent: string; bg: string }> = {
  modern: { main: '#092d63', accent: '#087f8c', bg: '#eef8fb' },
  classic: { main: '#243452', accent: '#ad8535', bg: '#f8f5ee' },
  minimal: { main: '#222d3e', accent: '#64748b', bg: '#f2f5f9' }
};

/**
 * The report is generated at render/print time — no duplicate grades or invented
 * certificate verification. Printable data is escaped and only submitted attempts qualify.
 */
export function openSmartResultPrint(data: ResultReportData): boolean {
  if (data.attempt.status !== 'submitted') return false;
  const popup = window.open('', '_blank', 'width=920,height=980');
  if (!popup) return false;
  popup.opener = null;
  const en = Boolean(data.isEnglish);
  const style = themeStyles[data.theme || 'modern'];
  const attempt = data.attempt;
  const options = data.options || {};
  const showInstitution = options.showInstitution !== false;
  const showMetrics = options.showMetrics !== false;
  const footerNote = String(options.footerNote || '').trim().slice(0, 180);
  const metrics = submittedMetrics(attempt);
  if (!metrics) return false;
  const { correct, attempted, incorrect } = metrics;
  const doc = [
    '<!doctype html><html lang="', en ? 'en' : 'hi', '"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Krishan Sir Online | Student Result Report</title>',
    '<style>:root{--main:', style.main, ';--accent:', style.accent, ';--tint:', style.bg, '}',
    '*{box-sizing:border-box}body{font:15px system-ui,Arial,sans-serif;color:#23324c;padding:28px;max-width:860px;margin:auto}',
    '.header{padding:28px;border-radius:18px;background:var(--main);color:white}',
    '.eyebrow{font-size:11px;letter-spacing:1.5px;font-weight:700;opacity:.85}.header h1{margin:8px 0;font-size:27px}',
    '.header p{margin:0;color:#dbe9f7}.columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}',
    '.panel{border:1px solid #dae1ea;border-radius:13px;padding:16px;margin:14px 0}.panel b{display:block;margin-top:5px}',
    '.score{background:var(--tint);border:2px solid var(--accent);border-radius:16px;padding:26px;margin:20px 0}',
    '.score strong{font-size:46px;color:var(--main)}.score span{font-size:18px;color:#52627b}',
    '.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metric{border:1px solid #dae1ea;border-radius:12px;padding:13px}',
    '.metric strong{display:block;font-size:22px;color:var(--main)}small{color:#52627b;font-size:12px}',
    '.footer{margin-top:28px;padding-top:15px;border-top:1px solid #cbd5e1;font-size:11px;color:#617086}',
    '@media print{body{padding:0;max-width:none}.header,.score{-webkit-print-color-adjust:exact;print-color-adjust:exact}}',
    '</style></head><body>',
    '<div class="header"><div class="eyebrow">KRISHAN SIR ONLINE · SMART RESULT SYSTEM</div>',
    '<h1>', en ? 'Individual Assessment Report' : 'व्यक्तिगत परीक्षा परिणाम पत्र', '</h1>',
    '<p>', escapeHtml(data.title), '</p></div>',
    '<div class="columns"><div class="panel"><small>', en ? 'Student name' : 'विद्यार्थी का नाम', '</small><b>', escapeHtml(data.student.name || '—'), '</b></div>',
    '<div class="panel"><small>', en ? 'Roll number' : 'रोल नंबर', '</small><b>', escapeHtml(data.student.rollNo || '—'), '</b></div>',
    '<div class="panel"><small>', en ? 'Class / Course' : 'कक्षा / कोर्स', '</small><b>', escapeHtml(data.student.classLevel || '—'), '</b></div>',
    ...(showInstitution ? ['<div class="panel"><small>', en ? 'School / Institution' : 'विद्यालय / संस्थान', '</small><b>', escapeHtml(data.student.school || '—'), '</b></div>'] : []), '</div>',
    '<div class="score"><small>', en ? 'SERVER-RECORDED SCORE' : 'सर्वर पर दर्ज प्राप्तांक', '</small><div><strong>',
    escapeHtml(attempt.score ?? '—'), '</strong><span> / ', escapeHtml(attempt.total_marks ?? '—'), '</span></div>',
    '<b style="color:var(--accent);margin-top:7px">', escapeHtml(percentageLabel(attempt.percentage)), '</b></div>',
...(showMetrics ? [
      '<div class="metrics"><div class="metric"><small>', en ? 'Correct' : 'सही', '</small><strong>', correct, '</strong></div>',
      '<div class="metric"><small>', en ? 'Incorrect' : 'गलत', '</small><strong>', incorrect, '</strong></div>',
      '<div class="metric"><small>', en ? 'Attempted' : 'प्रयास', '</small><strong>', attempted, '</strong></div>',
      '<div class="metric"><small>', en ? 'Attempt number' : 'प्रयास क्रम', '</small><strong>', escapeHtml(attempt.attempt_number), '</strong></div></div>'
    ] : []),
    '<div class="panel"><div class="columns"><div><small>', en ? 'Subject' : 'विषय', '</small><b>', escapeHtml(data.subject || '—'), '</b></div>',
    '<div><small>', en ? 'Submitted on' : 'जमा करने की तारीख', '</small><b>', escapeHtml(dateText(attempt.submitted_at, en)), '</b></div></div></div>',
    '<div class="footer">', en ? 'Internal attempt reference' : 'आंतरिक प्रयास संदर्भ', ': ', escapeHtml(attempt.id),
    '<p>', en ? 'Automatically generated from this student’s recorded assessment. This is not a government, university, or external board certificate.'
      : 'यह रिपोर्ट वेबसाइट पर दर्ज विद्यार्थी के परीक्षा परिणाम से स्वतः तैयार हुई है। यह किसी सरकारी, विश्वविद्यालय या बाहरी बोर्ड का प्रमाणपत्र नहीं है।',
    '</p>', ...(footerNote ? ['<p>', escapeHtml(footerNote), '</p>'] : []),
    '</div><script>window.onload=function(){window.print();};<\/script></body></html>'
  ].join('');
  popup.document.write(doc);
  popup.document.close();
  return true;
}

export const SmartResultReportCard: React.FC<{
  data: ResultReportData;
  onPrint?: () => void;
}> = ({ data, onPrint }) => {
  const { attempt, student, title, subject, theme = 'modern', isEnglish: en = false, options = {} } = data;
  const showInstitution = options.showInstitution !== false;
  const showMetrics = options.showMetrics !== false;
  const footerNote = String(options.footerNote || '').trim().slice(0, 180);
  const style = themeStyles[theme];
  if (attempt.status !== 'submitted') return null;
  const metrics = submittedMetrics(attempt);
  if (!metrics) return null;
  const { correct, attempted, incorrect } = metrics;
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
      <div className="relative overflow-hidden p-6 text-white sm:p-8" style={{ background: style.main }}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[28px] border-white/10"/>
        <p className="relative text-[10px] font-bold tracking-[.15em] text-white/80">KRISHAN SIR ONLINE • SMART RESULT REPORT</p>
        <div className="relative mt-4 flex items-center gap-3"><GraduationCap size={27}/><h3 className="text-xl font-extrabold">{en ? 'Student Performance Card' : 'विद्यार्थी परिणाम पत्र'}</h3></div>
        <p className="relative mt-2 text-sm text-white/80">{title}</p>
      </div>
      <div className="space-y-5 p-5 sm:p-7">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[{k: en ? 'Student' : 'विद्यार्थी', v: student.name}, {k: en ? 'Roll No.' : 'रोल नंबर', v: student.rollNo},
            {k: en ? 'Class' : 'कक्षा', v: student.classLevel},
            ...(showInstitution ? [{k: en ? 'Institution' : 'संस्थान', v: student.school}] : []),
            {k: en ? 'Subject' : 'विषय', v: subject}, {k: en ? 'Date' : 'तारीख', v: dateText(attempt.submitted_at,en)}
          ].map((item) => <div key={item.k} className="min-w-0"><p className="text-[11px] font-semibold text-slate-500">{item.k}</p><p className="mt-1 truncate font-bold text-slate-900" title={item.v || '—'}>{item.v || '—'}</p></div>)}
        </div>
        <div className="rounded-2xl border-2 p-5" style={{background:style.bg,borderColor:style.accent}}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xs font-bold text-slate-600">{en ? 'Total Score' : 'कुल प्राप्तांक'}</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums" style={{color:style.main}}>{attempt.score ?? '—'} <span className="text-base text-slate-500">/ {attempt.total_marks ?? '—'}</span></p></div>
            <div className="text-right"><p className="text-xs font-semibold text-slate-600">{en ? 'Percentage' : 'प्रतिशत'}</p><p className="mt-1 text-2xl font-extrabold" style={{color:style.accent}}>{percentageLabel(attempt.percentage)}</p></div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full" style={{width:percentBarWidth(attempt.percentage),background:style.accent}}/></div>
        </div>
        {showMetrics && <div className="grid grid-cols-3 gap-2 text-center">
          {[{label: en ? 'Correct' : 'सही',v:correct,icon:CheckCircle2},
            {label:en ? 'Incorrect' : 'गलत',v:incorrect,icon:XCircle},
            {label:en ? 'Attempted' : 'प्रयास',v:attempted,icon:Target}].map(({label,v,icon:Icon}) =>
            <div key={label} className="rounded-xl bg-slate-50 p-3"><Icon size={18} className="mx-auto text-slate-500"/><p className="mt-2 text-lg font-extrabold text-slate-900">{v}</p><p className="text-[11px] text-slate-500">{label}</p></div>)}
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><ShieldCheck size={15}/> {en ? 'Server-recorded result' : 'सर्वर पर दर्ज परिणाम'}</span>
          <span>{en ? 'Attempt' : 'प्रयास'} #{attempt.attempt_number} · {en ? 'Ref' : 'संदर्भ'} {attempt.id.slice(-8)}</span>
        </div>
        <p className="text-[11px] text-slate-500">{en ? 'Platform assessment report, not an external board certificate.' : 'यह प्लेटफॉर्म की परीक्षा रिपोर्ट है, बाहरी बोर्ड का प्रमाणपत्र नहीं।'}</p>
        {footerNote && <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700">{footerNote}</p>}
        <button type="button" onClick={onPrint || (() => openSmartResultPrint(data))}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800" style={{background:style.main}}>
          <Printer size={17}/>{en ? 'Print / Save as PDF' : 'प्रिंट / PDF सेव करें'}
        </button>
      </div>
    </div>
  );
};
