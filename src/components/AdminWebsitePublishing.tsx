import React, { useEffect, useState } from 'react';
import { ArrowRight, History, RefreshCw, ShieldCheck } from 'lucide-react';
import { getWebsiteConfigVersions, type WebsiteConfigVersion } from '../services/siteConfigService';

type Props = {
  demoMode?: boolean;
  onOpenVisualStudio: () => void;
};

/**
 * Website Publishing & History is intentionally a status-only module.
 * All page editing, draft saving, and publishing actions live in Visual Studio.
 */
export const AdminWebsitePublishing: React.FC<Props> = ({ demoMode = false, onOpenVisualStudio }) => {
  const [versions, setVersions] = useState<WebsiteConfigVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshVersions = async () => {
    if (demoMode) return;
    setLoading(true);
    setError('');
    try {
      setVersions(await getWebsiteConfigVersions());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Website version history could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!demoMode) void refreshVersions();
  }, [demoMode]);

  const published = versions.find((version) => version.status === 'published');
  const draft = versions.find((version) => version.status === 'draft');

  const statusStyle = (status: WebsiteConfigVersion['status']) => {
    if (status === 'published') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'draft') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <section className="space-y-5" data-testid="website-publishing-history">
      <header className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-700">
            <History className="h-3.5 w-3.5" /> Website Operations
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Website Publishing &amp; History</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            यहाँ केवल Draft और Published versions की स्थिति देखें। वेबसाइट की editing, Save Draft और Publish &amp; Schedule का एकमात्र स्थान Visual Website Studio है।
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!demoMode && (
            <button onClick={() => void refreshVersions()} disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh History
            </button>
          )}
          <button onClick={onOpenVisualStudio}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-800">
            Open Visual Studio <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-500">Current Published Version</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{demoMode ? 'Preview only' : published ? `Version ${published.version_number}` : 'Not available'}</p>
          <p className="mt-1 text-xs text-slate-500">{published?.published_at ? new Date(published.published_at).toLocaleString() : 'No published version found in the loaded history.'}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-500">Latest Saved Draft</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{demoMode ? 'Demo mode' : draft ? `Version ${draft.version_number}` : 'No saved draft'}</p>
          <p className="mt-1 text-xs text-slate-500">{draft ? new Date(draft.created_at).toLocaleString() : 'Save a draft from Visual Studio to create a new version.'}</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Version History</h3>
            <p className="mt-1 text-xs text-slate-500">Latest 20 website configuration versions</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
        </div>
        {demoMode ? (
          <p className="p-5 text-sm leading-6 text-slate-600">यह सुरक्षित Preview है। इसमें live database data या publishing actions उपलब्ध नहीं हैं। Visual Studio का interface देखने के लिए ऊपर का बटन चुनें।</p>
        ) : error ? (
          <p role="alert" className="p-5 text-sm text-rose-700">{error}</p>
        ) : loading && versions.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Version history लोड हो रही है…</p>
        ) : versions.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">अभी कोई version उपलब्ध नहीं है। Visual Studio से Draft सेव करने पर history यहाँ दिखाई देगी।</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {versions.map((version) => (
              <div key={version.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Version {version.version_number}</p>
                  <p className="mt-1 text-xs text-slate-500">Created {new Date(version.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase ${statusStyle(version.status)}`}>{version.status}</span>
                  {version.published_at && <span className="text-[10px] text-slate-400">Published {new Date(version.published_at).toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <aside className="rounded-xl border border-sky-100 bg-sky-50 p-4">
        <p className="text-xs font-bold text-sky-950">Single-editor rule</p>
        <p className="mt-1 text-xs leading-5 text-sky-900">इस पेज पर कोई दूसरा content editor, visual controls, Save Draft या Publish button नहीं है। सभी editing और publishing कार्य Main Visual Website Editor में ही होंगे।</p>
      </aside>
    </section>
  );
};
