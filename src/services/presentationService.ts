import { requireSupabase } from '../lib/supabase';

export const PPT_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
export const PPT_SUBJECTS = ['History','Political Science','Geography','Economics'];
export const PPT_CLASSES = ['6','7','8','9','10','11','12'];
export type Presentation = {
  id: string; class_level: string; subject: string; chapter: string; title: string;
  status: 'queued'|'processing'|'ready'|'error'|'deleting'; slide_count: number; published: boolean;
  allow_download: boolean; created_at: string; updated_at: string;
};
export type PresentationDetails = Pick<Presentation,'class_level'|'subject'|'chapter'|'title'>;
const originals = 'ksol-ppt-originals', slides = 'ksol-ppt-slides';
const table = 'ksol_presentations';
export const presentationError = (e: unknown) => e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
export async function listPresentations(admin = false): Promise<Presentation[]> {
  let query = requireSupabase().from(table).select('*').order('created_at', {ascending:false});
  if (!admin) query = query.eq('published',true).eq('status','ready');
  const {data,error} = await query;
  if(error) throw error;
  return (data || []) as Presentation[];
}
export async function requestConversion(id:string): Promise<void> {
  const client=requireSupabase();
  const {data:session,error:sessionError}=await client.auth.getSession();
  if(sessionError||!session.session?.access_token) throw new Error('Admin session expired. Sign in again, then select Start conversion.');
  const {data,error}=await client.functions.invoke('study-ppt-dispatch',{
    body:{id},headers:{Authorization:'Bearer '+session.session.access_token}
  });
  if(error){
    let message=presentationError(error);
    const response=(error as {context?:Response}).context;
    if(response && typeof response.json==='function'){
      try { const body=await response.clone().json(); if(typeof body?.error==='string') message=body.error; } catch {}
      message='HTTP '+response.status+': '+message;
    }
    throw new Error(message);
  }
  if(data?.dispatched!==true && !['processing','ready'].includes(data?.status)) throw new Error('Conversion worker did not accept the request.');
}
export async function uploadPresentation(details: PresentationDetails, file: File) {
  if (!/\.pptx$/i.test(file.name) || !file.size || file.size > 50*1024*1024) throw new Error('Select a PPTX file up to 50 MB.');
  if (!details.title.trim() || !details.chapter.trim()) throw new Error('Title and chapter are required.');
  const client = requireSupabase(), id = crypto.randomUUID(), path = id+'/source.pptx';
  const {error:uploadError} = await client.storage.from(originals).upload(path,file,{contentType:PPT_MIME,upsert:false,cacheControl:'0'});
  if(uploadError) throw uploadError;
  const {error} = await client.from(table).insert({...details,title:details.title.trim(),chapter:details.chapter.trim(),id});
  // Do not delete the original on an ambiguous network failure: the row may have committed.
  if(error) throw new Error('Metadata save failed; refresh before retrying. '+error.message);
  try { await requestConversion(id); return null; } catch(e) { return presentationError(e); }
}
export async function updatePresentation(id: string, patch: Partial<Pick<Presentation,'title'|'chapter'|'subject'|'class_level'|'published'|'allow_download'|'status'>>) {
  const {data,error} = await requireSupabase().from(table).update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select('id').single();
  if(error || !data) throw error || new Error('Update not authorized.');
  if(patch.status==='queued') await requestConversion(id);
}
export async function archivePresentation(p: Presentation) {
  const client=requireSupabase();
  const {data:claimed,error:claimError}=await client.from(table).update({status:'deleting',published:false,allow_download:false,updated_at:new Date().toISOString()}).eq('id',p.id).in('status',['ready','error','queued','deleting']).select('id').maybeSingle();
  if(claimError||!claimed)throw claimError||new Error('Conversion in progress. Retry after conversion ends.');
  // Hide the record first. Keep the row until storage cleanup succeeds.
  const {data:files,error:listError}=await client.storage.from(slides).list(p.id,{limit:1000});
  if(listError) throw listError;
  if(files?.length){const {error}=await client.storage.from(slides).remove(files.map(f=>p.id+'/'+f.name));if(error)throw error;}
  const {error:removeError}=await client.storage.from(originals).remove([p.id+'/source.pptx']);
  if(removeError)throw removeError;
  const {error}=await client.from(table).delete().eq('id',p.id);
  if(error)throw error;
}
export async function fetchSlide(id:string, index:number) {
  const {data,error}=await requireSupabase().storage.from(slides).download(id+'/slide-'+index+'.png');
  if(error||!data)throw error||new Error('Slide unavailable.');
  return data;
}
export async function downloadPresentation(p:Presentation) {
  const {data,error}=await requireSupabase().storage.from(originals).download(p.id+'/source.pptx');
  if(error||!data)throw error||new Error('Download unavailable.');
  const url=URL.createObjectURL(data), a=document.createElement('a');
  a.href=url;a.download=p.title.replace(/[\\/:*?"<>|]/g,'_')+'.pptx';document.body.append(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
