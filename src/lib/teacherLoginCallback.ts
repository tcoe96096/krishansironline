/** Build a same-origin login callback from a trusted Vite base path.
 * Fail closed for malformed or external paths; never turn a Preview OAuth
 * callback into an open redirect if deployment configuration is corrupted.
 */
export function teacherLoginCallback(origin:string,baseUrl:string):string {
  const site=new URL(origin);
  if(!['https:','http:'].includes(site.protocol)||site.username||site.password||
    site.pathname!=='/'||site.search||site.hash)throw new Error('Invalid teacher login origin.');
  const raw=baseUrl||'/';
  if(!raw.startsWith('/')||raw.startsWith('//')||raw.includes('\\')||
    /[?#\x00-\x1f\x7f]/.test(raw)||/%(?:2f|5c|2e|00)/i.test(raw)||
    raw.split('/').some(segment=>segment==='.'||segment==='..')) {
    throw new Error('Invalid teacher login base path.');
  }
  const basePath=raw.endsWith('/')?raw:raw+'/';
  const callback=new URL(basePath+'staff-workspace/',site);
  if(callback.origin!==site.origin)throw new Error('Invalid teacher login callback.');
  return callback.toString();
}
