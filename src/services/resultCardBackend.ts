import { requireSupabase } from '../lib/supabase';

/**
 * Result Card Backend integration adapter.
 * OFF by default: enable only after independent restore verification,
 * successful authenticated Preview tests and an approved production release.
 * This never sends PDFs directly from the browser or accesses private tables.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESULT_BUCKET_PATH = '/storage/v1/object/sign/result-cards-private/';

export type ResultOperation = 'release' | 'revoke';
export type ResultState = 'released' | 'revoked';

export const isResultCardBackendEnabled = (): boolean =>
  import.meta.env.VITE_RESULT_CARD_BACKEND_ENABLED === 'true';

function requireResultFeature() {
  if (!isResultCardBackendEnabled()) {
    throw new Error('Result Card Backend is not active for this deployment.');
  }
}

function assertVersionedAttempt(attemptId: string, expectedVersion: number) {
  if (!UUID_RE.test(attemptId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw new Error('Invalid result attempt or version.');
  }
}

/**
 * Super-admin only; authorization and idempotency are enforced by the RPC.
 * Callers must retain the SAME requestKey when retrying an uncertain response.
 */
export async function transitionResultCard(
  attemptId: string,
  expectedVersion: number,
  operation: ResultOperation,
  requestKey: string,
): Promise<ResultState> {
  requireResultFeature();
  assertVersionedAttempt(attemptId, expectedVersion);
  if (!UUID_RE.test(requestKey) || (operation !== 'release' && operation !== 'revoke')) {
    throw new Error('Invalid transition request.');
  }
  const { data, error } = await requireSupabase().rpc('ksol_result_transition', {
    p_attempt_id: attemptId,
    p_expected_version: expectedVersion,
    p_operation: operation,
    p_request_key: requestKey,
  });
  if (error) throw new Error('Result transition was not completed.');
  if (data !== 'released' && data !== 'revoked') {
    throw new Error('Unexpected result transition response.');
  }
  return data;
}

/**
 * Student download link: the server rechecks ownership, eligibility and
 * current exact released version. No public/storage object URLs are cached.
 */
export async function getMyResultCardPdfDownloadUrl(
  attemptId: string,
  expectedVersion: number,
): Promise<string> {
  requireResultFeature();
  assertVersionedAttempt(attemptId, expectedVersion);
  const { data, error } = await requireSupabase().functions.invoke(
    'ksol-result-pdf-download',
    { body: { attemptId, expectedVersion } },
  );
  if (error) throw new Error('Result download could not be authorized.');

  const response = data as { signedUrl?: unknown; expiresInSeconds?: unknown } | null;
  if (typeof response?.signedUrl !== 'string' ||
      response.expiresInSeconds !== 30) {
    throw new Error('Invalid result download response.');
  }
  const projectUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!projectUrl) throw new Error('Result download service is not configured.');
  let signedUrl: URL;
  try {
    signedUrl = new URL(response.signedUrl);
  } catch {
    throw new Error('Invalid result download link.');
  }
  if (signedUrl.origin !== new URL(projectUrl).origin ||
      !signedUrl.pathname.startsWith(RESULT_BUCKET_PATH) ||
      !signedUrl.searchParams.has('token')) {
    throw new Error('Result download link is not from the private result bucket.');
  }
  return signedUrl.toString();
}
