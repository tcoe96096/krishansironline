/** Build a login callback from the current Vite base path, including nested GitHub Pages previews. */
export function teacherLoginCallback(origin:string,baseUrl:string):string {
 const basePath=(baseUrl||'/').replace(/\/?$/,'/');
 return new URL(basePath+'staff-workspace/',origin).toString();
}
