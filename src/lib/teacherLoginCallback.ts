/** Build a same-origin login callback from a trusted Vite base path.
 * Fail closed for malformed or external paths; never turn a Preview OAuth
 * callback into an open redirect if deployment configuration is corrupted.
 */
export function teacherLoginCallback(origin:string,baseUrl:string):string {
  // URL() silently strips some control characters and normalizes deceptive origins.
  // Only accept the canonical origin supplied by window.location.origin.
  if(typeof origin!=='string'||/[\x00-\x1f\x7f\\]/.test(origin))throw new Error('Invalid teacher login origin.');
  const site=new URL(origin);
  if(origin!==site.origin&&origin!==site.origin+'/')throw new Error('Invalid teacher login origin.');
  if(!['https:','http:'].includes(site.protocol)||site.username||site.password||
    site.pathname!=='/'||site.search||site.hash)throw new Error('Invalid teacher login origin.');
  const raw=baseUrl||'/';
  if(!raw.startsWith('/')||raw.startsWith('//')||raw.includes('\\')||
    /[?#%\x00-\x1f\x7f]/.test(raw)||
    raw.split('/').some(segment=>segment==='.'||segment==='..')) {
    throw new Error('Invalid teacher login base path.');
  }
  // Reject all percent escapes, including double-encoded separators and dot segments.
  // The callback is generated from a deployment path, not arbitrary URL input.
  const basePath=raw.endsWith('/')?raw:raw+'/';
  const callback=new URL(basePath+'staff-workspace/',site);
  if(callback.origin!==site.origin)throw new Error('Invalid teacher login callback.');
  return callback.toString();
}

/** Login flow returns to the dedicated Teacher Dashboard. This does not
 * bypass any authentication or Super Admin authorization checks.
 * Owner-approved OAuth allowed redirect URLs must include this path before activation.
 */
export function teacherDashboardLoginCallback(origin:string,baseUrl:string):string {
  const registration=teacherLoginCallback(origin,baseUrl);
  if(!registration.endsWith('/staff-workspace/'))throw new Error('Invalid teacher dashboard callback.');
  return registration.slice(0,-'staff-workspace/'.length)+'dashboard/';
}
