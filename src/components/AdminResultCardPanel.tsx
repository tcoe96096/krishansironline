import React, { useCallback, useEffect, useState } from 'react';
import {
  getAdminResultCardStatus,
  transitionResultCard,
  uploadAndApproveResultCardPdf,
  type AdminResultCardStatus,
} from '../services/resultCardBackend';

type Props = {
  attemptId: string;
  onClose: () => void;
};

/**
 * Super-admin Result Card workflow, gated by the parent feature flag.
 * Upload+approval and publication are deliberately two separate actions.
 */
export const AdminResultCardPanel: React.FC<Props> = ({ attemptId, onClose }) => {
  const [current, setCurrent] = useState<AdminResultCardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [uploadRetryKey, setUploadRetryKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCurrent(await getAdminResultCardStatus(attemptId));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Result Card status उपलब्ध नहीं है।');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const nextVersion = current?.state === 'revoked'
    ? current.version + 1 : current?.version ?? 1;
  const canUpload = !current || current.state === 'revoked';

  const runUpload = async () => {
    if (!file || !canUpload) return;
    const key = uploadRetryKey || crypto.randomUUID();
    setUploadRetryKey(key);
    setWorking(true); setError(''); setNotice('');
    try {
      const result = await uploadAndApproveResultCardPdf(attemptId, nextVersion, file, key);
      // An idempotent replay can return the ORIGINAL outcome even when a
      // different admin has already released/revoked that version. Refresh.
      const confirmed = await getAdminResultCardStatus(attemptId);
      if (!confirmed || confirmed.version !== result.version) {
        throw new Error('PDF stored; current approval state needs review.');
      }
      setCurrent(confirmed);
      setFile(null); setUploadRetryKey(null);
      setNotice(confirmed.state === 'approved'
        ? 'PDF सुरक्षित रूप से स्वीकृत है। विद्यार्थी के लिए जारी करना अभी बाकी है।'
        : 'PDF की वर्तमान स्थिति सर्वर से दोबारा सत्यापित की गई है।');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PDF Approval असफल रहा।');
      // An uncertain response must be reconciled with the server before retry.
      try {
        const reconciled = await getAdminResultCardStatus(attemptId);
        if (reconciled) setCurrent(reconciled);
      } catch { /* retain the original error */ }
    } finally {
      setWorking(false);
    }
  };

  const runTransition = async (operation: 'release' | 'revoke') => {
    if (!current || (operation === 'release' && current.state !== 'approved')
      || (operation === 'revoke' && current.state !== 'released')) return;
    setWorking(true); setError(''); setNotice('');
    try {
      const state = await transitionResultCard(
        attemptId, current.version, operation, crypto.randomUUID(),
      );
      const confirmed = await getAdminResultCardStatus(attemptId);
      if (!confirmed || confirmed.version !== current.version || confirmed.state !== state) {
        throw new Error('Operation acknowledged but current Result Card status changed.');
      }
      setCurrent(confirmed);
      setRevokeConfirm(false);
      setNotice(state === 'released'
        ? 'Result Card जारी कर दिया गया है। अब विद्यार्थी इसे डाउनलोड कर सकता है।'
        : 'Result Card वापस ले लिया गया है। नए Download की अनुमति बंद है।');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Result Card कार्रवाई विफल रही।');
      try {
        setCurrent(await getAdminResultCardStatus(attemptId));
      } catch { /* retain the actionable error */ }
    } finally {
      setWorking(false);
    }
  };

  return (
    <section aria-label="Result Card administration" className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800">Private Result Card</p>
          <h4 className="text-base font-extrabold text-slate-900">Result PDF Approval &amp; Publication</h4>
          <p className="mt-1 break-all text-[11px] text-slate-500">Attempt: {attemptId}</p>
        </div>
        <button type="button" onClick={onClose}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">
          बंद करें
        </button>
      </div>

      {loading ? <p role="status" className="mt-3 text-sm">स्थिति जाँच रहे हैं…</p> : (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-700">
            वर्तमान स्थिति: {current?.state ?? 'अभी कोई PDF स्वीकृत नहीं'}
            {' · '} Version: {current?.version ?? '—'}
          </p>
          {canUpload && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-xs font-semibold text-slate-700">
                Version {nextVersion} की PDF चुनें (अधिकतम 10 MB)
                <input className="mt-1 block max-w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                  type="file" accept="application/pdf"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setUploadRetryKey(null);
                    setError(''); setNotice('');
                  }} />
              </label>
              <button type="button" disabled={working || !file}
                onClick={() => void runUpload()}
                className="rounded-lg bg-sky-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {working ? 'अपलोड हो रहा है…' : 'PDF अपलोड और स्वीकृत करें'}
              </button>
            </div>
          )}
          {current?.state === 'approved' && (
            <button type="button" onClick={() => void runTransition('release')} disabled={working}
              className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              {working ? 'जारी कर रहे हैं…' : 'विद्यार्थी के लिए Result Card जारी करें'}
            </button>
          )}
          {current?.state === 'released' && (
            <div className="mt-3">
              {!revokeConfirm ? (
                <button type="button" onClick={() => setRevokeConfirm(true)} disabled={working}
                  className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-800">
                  Result Card वापस लें
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-rose-800">वापस लेने की पुष्टि करें:</p>
                  <button type="button" onClick={() => void runTransition('revoke')} disabled={working}
                    className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                    पुष्टि — वापस लें
                  </button>
                  <button type="button" onClick={() => setRevokeConfirm(false)} disabled={working}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs">रद्द करें</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {notice && <p role="status" className="mt-3 text-xs font-semibold text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-700">{error}</p>}
      <button type="button" onClick={() => void refresh()} disabled={working || loading}
        className="mt-3 text-xs font-semibold text-sky-800 underline disabled:opacity-50">स्थिति रिफ्रेश करें</button>
    </section>
  );
};
