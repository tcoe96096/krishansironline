export function deriveTeacherBetaFlags(env:Record<string,string|undefined>){
 const core=env.VITE_TEACHER_BETA_ENABLED==='true';
 const advanced=core&&env.VITE_TEACHER_ADVANCED_ENABLED==='true';
 return {core,advanced,analytics:core&&env.VITE_TEACHER_RESULT_ANALYTICS_ENABLED==='true',resumes:core&&env.VITE_TEACHER_RESUME_ENABLED==='true'};
}
