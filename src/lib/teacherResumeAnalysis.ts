/** Draft-only suggestions from scanner-extracted plain text, never a credential decision.
 * No raw resume text is persisted or logged. Teachers must review all suggestions.
 */
export type ResumeSuggestions={qualifications:{title:string;institution:string;year:number}[];experienceYears:number|null;skills:string[];requiresReview:true};
const skills=['Teaching','Curriculum Design','Lesson Planning','Classroom Management','Assessment','Research','Political Science','History','Geography','Economics','Computer Skills','Communication'];
const qualification=/\b(?:Ph\.?D\.?|M\.?Phil\.?|M\.?Ed\.?|B\.?Ed\.?|M\.?A\.?|B\.?A\.?|M\.?Sc\.?|B\.?Sc\.?)\b/gi;
export function analyzeVerifiedResumeText(value:unknown):ResumeSuggestions{
 const empty=():ResumeSuggestions=>({qualifications:[],experienceYears:null,skills:[],requiresReview:true});
 if(typeof value!=='string'||value.length>32768)return empty();
 const text=value.normalize('NFKC').replace(/[\x00-\x1f\x7f-\x9f]/g,' ');
 const found=[...text.matchAll(qualification)].slice(0,20);
 const titles=[...new Set(found.map(m=>m[0].toUpperCase().replaceAll('.','')))];
 // Institution and graduation year are intentionally not guessed: incorrect
 // credential attribution must never be presented as verified qualifications.
 const years=[...text.matchAll(/\b(\d{1,2})(?:\+)?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:teaching\s+)?experience\b/gi)]
   .map(m=>Number(m[1])).filter(n=>n>=0&&n<=70);
 const detected=skills.filter(s=>new RegExp('\\b'+s.replaceAll(' ','\\s+')+'\\b','i').test(text));
 return {qualifications:titles.map(title=>({title,institution:'',year:0})),
   experienceYears:years.length?Math.max(...years):null,skills:detected,requiresReview:true};
}
