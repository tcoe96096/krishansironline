import { requireSupabase } from '../lib/supabase';

/**
 * Result Card Backend integration adapter.
 * OFF by default: enable only after independent restore verification,
 * successful authenticated Preview tests and an approved production release.
 * This never sends PDFs directly from the browser or accesses private tables.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
export type AdminResultCardStatus =
  { version: number; state: 'approved' | 'released' | 'revoked' };

/** Status is derived only from an authenticated super-admin RPC. */
export async function getAdminResultCardStatus(
  attemptId: string,
): Promise<AdminResultCardStatus | null> {
  requireResultFeature();
  if (!UUID_RE.test(attemptId)) throw new Error('Invalid result attempt.');
  const { data, error } = await requireSupabase().rpc('ksol_result_admin_status', {
    p_attempt_id: attemptId,
  });
  if (error) throw new Error('Unable to read Result Card publication status.');
  if (data === null) return null;
  if (typeof data?.version !== 'number' || !Number.isSafeInteger(data.version) ||
      data.version < 1 ||
      (data.state !== 'approved' && data.state !== 'released' && data.state !== 'revoked')) {
    throw new Error('Unexpected Result Card status.');
  }
  return { version: data.version, state: data.state };
}

/**
 * Super-admin upload candidate. The Edge server verifies the user, computes
 * the digest, stores a private immutable PDF and requests approval in SQL.
 * This is not publication; release requires a separate authorized action.
 */
export async function uploadAndApproveResultCardPdf(
  attemptId: string,
  expectedVersion: number,
  pdf: File,
  requestKey: string,
): Promise<{ state: 'approved'; sha256: string; version: number }> {
  requireResultFeature();
  assertVersionedAttempt(attemptId, expectedVersion);
  if (!UUID_RE.test(requestKey) || !(pdf instanceof File) ||
      pdf.type !== 'application/pdf' || pdf.size < 8 || pdf.size > 10485760) {
    throw new Error('Invalid result PDF upload.');
  }
  const body = new FormData();
  body.append('attemptId', attemptId);
  body.append('expectedVersion', String(expectedVersion));
  body.append('requestKey', requestKey);
  body.append('pdf', pdf);
  const { data, error } = await requireSupabase().functions.invoke(
    'ksol-result-pdf-upload',
    { body },
  );
  if (error) throw new Error('Result PDF upload or approval failed.');
  const response = data as { state?: unknown; sha256?: unknown; version?: unknown } | null;
  if (response?.state !== 'approved' ||
      typeof response.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/.test(response.sha256) ||
      response.version !== expectedVersion) {
    throw new Error('Unexpected PDF approval response.');
  }
  return { state: 'approved', sha256: response.sha256, version: expectedVersion };
}

/**
 * Super-admin only. A trusted server must upload the immutable PDF first and
 * compute its SHA-256; the RPC verifies private Storage object metadata.
 * Approval is NOT publication and cannot make a PDF visible to students.
 */
export async function approveResultCardPdf(
  attemptId: string,
  expectedVersion: number,
  artifactSha256: string,
  requestKey: string,
): Promise<'approved'> {
  requireResultFeature();
  assertVersionedAttempt(attemptId, expectedVersion);
  if (!/^[0-9a-f]{64}$/.test(artifactSha256) || !UUID_RE.test(requestKey)) {
    throw new Error('Invalid result approval payload.');
  }
  const { data, error } = await requireSupabase().rpc('ksol_result_approve_pdf', {
    p_attempt_id: attemptId,
    p_expected_version: expectedVersion,
    p_artifact_sha256: artifactSha256,
    p_request_key: requestKey,
  });
  if (error || data !== 'approved') {
    throw new Error('Result approval was not completed.');
  }
  return 'approved';
}

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
 * Returns the signed-in student's current published result version.
 * No teacher/admin or other-student record is returned by this RPC.
 * Null means unavailable or not yet published.
 */
export async function getMyReleasedResultCardVersion(
  attemptId: string,
): Promise<number | null> {
  requireResultFeature();
  if (!UUID_RE.test(attemptId)) throw new Error('Invalid result attempt.');
  const { data, error } = await requireSupabase().rpc(
    'ksol_my_released_result_version',
    { p_attempt_id: attemptId },
  );
  if (error) throw new Error('Unable to verify result publication.');
  if (data === null) return null;
  if (!Number.isSafeInteger(data) || data < 1) {
    throw new Error('Invalid released result version.');
  }
  return data;
}

/**
 * Fetches the student's current authorized private PDF as bytes.
 * The server rechecks exact ownership and release state on every request,
 * returning no reusable signed Storage URL. Do not persist the Blob.
 */
export async function getMyResultCardPdfDownload(
  attemptId: string,
  expectedVersion: number,
): Promise<Blob> {
  requireResultFeature();
  assertVersionedAttempt(attemptId, expectedVersion);
  const { data, error } = await requireSupabase().functions.invoke(
    'ksol-result-pdf-download',
    { body: { attemptId, expectedVersion } },
  );
  if (error || !(data instanceof Blob) ||
      data.type !== 'application/pdf' ||
      data.size < 8 || data.size > 10485760) {
    throw new Error('Result download could not be authorized.');
  }
  if (await data.slice(0, 5).text() !== '%PDF-') {
    throw new Error('Invalid Result Card PDF response.');
  }
  return data;
}
