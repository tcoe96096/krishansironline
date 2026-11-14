import { requireSupabase } from '../lib/supabase';

export type WebsiteConfig = {
  hero: Record<string, string>;
  header: Record<string, string>;
  sections: Record<string, boolean>;
  palette: string;
  /** Safe, versioned Visual Editor data; unknown keys are preserved by existing editors. */
  visualEditor?: Record<string, unknown>;
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

export function subscribeToWebsiteConfigChanges(onChange: () => void): () => void {
  const client = requireSupabase();
  const channel = client
    .channel('published-website-config-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_config_versions' }, onChange)
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
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

/** Browser-local input is converted to ISO UTC before calling the admin-only scheduler RPC. */
export type StudioPublishSchedule = {
  id: string;
  source_version_id: string | null;
  scheduled_for: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  completed_at: string | null;
  published_version_number: number | null;
};

export async function getStudioPublishSchedules(): Promise<StudioPublishSchedule[]> {
  const { data, error } = await requireSupabase()
    .from('studio_publish_schedules')
    .select('id,source_version_id,scheduled_for,status,created_at,completed_at,published_version_number')
    .order('created_at', { ascending: false }).limit(15);
  if (error) throw error;
  return (data || []) as StudioPublishSchedule[];
}

export async function scheduleStudioPublish(draftId: string, isoTime: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('admin_schedule_studio_publish', {
    p_draft_id: draftId, p_publish_at: isoTime,
  });
  if (error) throw error;
  return data as string;
}

export async function cancelStudioPublish(scheduleId: string): Promise<boolean> {
  const { data, error } = await requireSupabase().rpc('admin_cancel_studio_publish', {
    p_schedule_id: scheduleId,
  });
  if (error) throw error;
  return Boolean(data);
}
