import { requireSupabase } from '../lib/supabase';

export type WebsiteConfig = {
  hero: Record<string, string>;
  header: Record<string, string>;
  sections: Record<string, boolean>;
  palette: string;
};

export type WebsiteConfigVersion = {
  id: string;
  version_number: number;
  config: WebsiteConfig;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  published_at: string | null;
};

export async function getWebsiteConfigVersions(): Promise<WebsiteConfigVersion[]> {
  const { data, error } = await requireSupabase()
    .from('site_config_versions')
    .select('id,version_number,config,status,created_at,published_at')
    .order('version_number', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as WebsiteConfigVersion[];
}

export async function getPublishedWebsiteConfig(): Promise<WebsiteConfig | null> {
  const { data, error } = await requireSupabase()
    .from('site_config_versions')
    .select('config')
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return (data?.config ?? null) as WebsiteConfig | null;
}

export async function saveWebsiteConfigDraft(config: WebsiteConfig): Promise<string> {
  const { data, error } = await requireSupabase().rpc('admin_save_site_config', { p_config: config });
  if (error) throw error;
  return data as string;
}

export async function publishWebsiteConfig(versionId: string): Promise<number> {
  const { data, error } = await requireSupabase().rpc('admin_publish_site_config', { p_version_id: versionId });
  if (error) throw error;
  return Number(data);
}
