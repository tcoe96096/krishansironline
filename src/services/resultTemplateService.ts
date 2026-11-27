import { requireSupabase } from '../lib/supabase';

export type ResultTemplateTheme = 'modern' | 'classic' | 'minimal';
export type ResultTemplateOptions = { brandTitle?: string; tagline?: string; footerNote?: string; showInstitution?: boolean; showMetrics?: boolean; showLogo?: boolean; showPortrait?: boolean; showSubjectTable?: boolean; watermarkOpacity?: number };
export type ResultTemplate = { theme: ResultTemplateTheme; options: ResultTemplateOptions; version: number };

export async function getPublishedResultTemplate(): Promise<ResultTemplate | null> {
  const { data, error } = await requireSupabase().from('result_card_templates')
    .select('theme,options,version').eq('template_key','default').eq('is_published',true).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (!['modern','classic','minimal'].includes(data.theme) || !Number.isSafeInteger(data.version) || data.version < 1 ||
    !data.options || typeof data.options !== 'object' || Array.isArray(data.options)) throw new Error('Invalid template');
  return {theme:data.theme,version:data.version,options:data.options};
}
export async function canPublishResultTemplate(): Promise<boolean> {
  const {data,error}=await requireSupabase().rpc('can_publish_result_card_template');
  if(error) throw error;
  return data===true;
}
export async function publishResultTemplate(theme:ResultTemplateTheme,options:ResultTemplateOptions,reason:string):Promise<number>{
  const {data,error}=await requireSupabase().rpc('publish_result_card_template',{p_theme:theme,p_options:options,p_reason:reason.trim()});
  if(error) throw error;
  if(!Number.isSafeInteger(data)||data<1) throw new Error('Unconfirmed publication');
  return data;
}
