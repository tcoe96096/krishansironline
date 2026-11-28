// Review-only document rendering primitive. No network, storage, or publication.
// Input MUST come from the trusted snapshot RPC, not a browser request.
type Snapshot = {attemptId:string; studentName:string; rollNo:string; classLevel:string; schoolName?:string|null; testTitle:{hi?:string;en?:string}; subject:string; score:number; totalMarks:number; percentage:number; correctCount?:number|null; submittedAt:string};
type Design = {theme:'modern'|'classic'|'minimal'; version:number; options:{brandTitle?:string;tagline?:string;footerNote?:string;showInstitution?:boolean;showMetrics?:boolean;watermarkOpacity?:number}};
const esc=(x:unknown)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??''));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function bounded(value:unknown,max:number,required=false):string {
 if(typeof value!=='string'){if(required)throw new Error('Missing report field');return '';}
 const trimmed=value.trim();
 if(trimmed.length>max||(required&&!trimmed))throw new Error('Invalid report field length');
 return trimmed;
}
export function renderResultDocument(snapshot:Snapshot,design:Design):string {
 if(!uuid.test(snapshot.attemptId)||!Number.isSafeInteger(design.version)||design.version<1||!['modern','classic','minimal'].includes(design.theme))throw new Error('Invalid record or design version');
 if(![snapshot.score,snapshot.totalMarks,snapshot.percentage].every(Number.isFinite)||snapshot.totalMarks<=0||snapshot.percentage<0||snapshot.percentage>100)throw new Error('Invalid score');
 const date=new Date(snapshot.submittedAt);
 if(!Number.isFinite(date.getTime()))throw new Error('Invalid submission date');
 if(design.options.watermarkOpacity!==undefined&&(!Number.isFinite(design.options.watermarkOpacity)||design.options.watermarkOpacity<0||design.options.watermarkOpacity>18))throw new Error('Invalid watermark opacity');
 const heading=bounded(design.options.brandTitle,80)||'KRISHAN SIR ONLINE LEARNING';
 const title=bounded(snapshot.testTitle?.hi||snapshot.testTitle?.en,240,true);
 const name=bounded(snapshot.studentName,240,true);
 const roll=bounded(snapshot.rollNo,100,true);
 const grade=bounded(snapshot.classLevel,100,true);
 const school=bounded(snapshot.schoolName,240);
 const subject=bounded(snapshot.subject,160,true);
 const accent=design.theme==='classic'?'#785322':design.theme==='modern'?'#164e80':'#334155';
 const row=(key:string,value:string)=>'<tr><th scope="row">'+esc(key)+'</th><td>'+esc(value)+'</td></tr>';
 return '<!doctype html><html lang="hi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KSOL Report Card</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:"Noto Sans Devanagari","Nirmala UI",Arial,sans-serif;color:#172033;margin:0;line-height:1.55}main{position:relative;isolation:isolate;border:2px solid '+accent+';padding:20px;min-height:245mm;overflow-wrap:anywhere}main:before{content:"KSOL";position:absolute;top:45%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:72px;font-weight:bold;opacity:'+(design.options.watermarkOpacity??6)/100+';z-index:-1;pointer-events:none}header{text-align:center;border-bottom:2px solid '+accent+';padding-bottom:16px}h1{font-size:22px;color:'+accent+'}h2{font-size:17px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px;border:1px solid #cbd5e1;text-align:left}th{width:36%;background:#f1f5f9}footer{border-top:1px solid #cbd5e1;padding-top:16px;font-size:11px}tr{break-inside:avoid}</style></head><body><main><header><h1>'+esc(heading)+'</h1><p>'+esc(bounded(design.options.tagline,110))+'</p><h2>परीक्षा अंकपत्र | Examination Report Card</h2></header><table>'+row('विद्यार्थी | Student',name)+row('रोल नंबर | Roll number',roll)+row('कक्षा | Class',grade)+(design.options.showInstitution===false?'':row('विद्यालय | School',school))+row('परीक्षा | Test',title)+row('विषय | Subject',subject)+row('अंक | Score',String(snapshot.score)+' / '+String(snapshot.totalMarks))+row('प्रतिशत | Percentage',String(snapshot.percentage)+'%')+(design.options.showMetrics!==false&&Number.isSafeInteger(snapshot.correctCount)&&Number(snapshot.correctCount)>=0?row('सही उत्तर | Correct answers',String(snapshot.correctCount)):'')+row('जमा किया | Submitted (UTC)',date.toISOString())+'</table><footer><p>'+esc(bounded(design.options.footerNote,180))+'</p><p>Attempt: '+esc(snapshot.attemptId)+' · Template version: '+design.version+'</p><p>Generation preview — not an approved or released official PDF.</p></footer></main></body></html>';
}
