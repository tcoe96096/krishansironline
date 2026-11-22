// REVIEW_ONLY / DO NOT DEPLOY.
// Candidate Supabase Edge Function for KSOL student result PDF links.
// Requires: private bucket + release SQL + student gate + manifest RPC,
// JWT tests, independently proven restore, and owner approval.
// No third-party imports; credentials remain in server environment only.
// Copy to a deployed Edge Function ONLY after security review.

const TTL_SECONDS = 30;
const BUCKET = "result-cards-private";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DIGEST_PDF_RE = /^[0-9a-f]{64}\.pdf$/;
const ALLOWED_ORIGINS = new Set([
  "https://krishansir.online",
  "https://www.krishansir.online",
]);

function respond(status, payload, origin) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store, max-age=0",
    "Pragma": "no-cache",
    "Vary": "Origin",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type");
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

async function callJson(url, options) {
  const res = await fetch(url, { ...options, redirect: "error" });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return respond(403, { error: "Origin not allowed" }, null);
  }
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "https://krishansir.online",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
      },
    });
  }
  if (req.method !== "POST") {
    return respond(405, { error: "Method not allowed" }, origin);
  }

  const base = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !anonKey || !serviceKey || !base.startsWith("https://")) {
    return respond(503, { error: "Service unavailable" }, origin);
  }
  const authorization = req.headers.get("authorization");
  if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
    return respond(401, { error: "Sign in required" }, origin);
  }
  // Reject oversized bodies before parsing; do not trust any supplied path.
  if (Number(req.headers.get("content-length") || 0) > 2048) {
    return respond(413, { error: "Request too large" }, origin);
  }
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 2048) return respond(413, { error: "Request too large" }, origin);
    body = JSON.parse(raw);
  } catch {
    return respond(400, { error: "Invalid JSON" }, origin);
  }
  const attemptId = typeof body?.attemptId === "string" ? body.attemptId.toLowerCase() : "";
  const version = body?.expectedVersion;
  if (!UUID_RE.test(attemptId) || !Number.isSafeInteger(version) || version < 1) {
    return respond(400, { error: "Invalid request" }, origin);
  }

  // Ask Supabase Auth to verify the actual bearer token, not JWT user_metadata.
  const user = await callJson(`${base}/auth/v1/user`, {
    method: "GET",
    headers: { apikey: anonKey, Authorization: authorization },
  }).catch(() => ({ ok: false, data: null }));
  if (!user.ok || !UUID_RE.test(user.data?.id || "")) {
    return respond(401, { error: "Sign in required" }, origin);
  }

  // Critical: use the caller's JWT for the manifest RPC, never service_role.
  const manifest = await callJson(`${base}/rest/v1/rpc/ksol_result_pdf_manifest`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_attempt_id: attemptId,
      p_expected_version: version,
    }),
  }).catch(() => ({ ok: false, data: null }));
  if (!manifest.ok) {
    return respond(503, { error: "Result access unavailable" }, origin);
  }
  const objectKey = manifest.data;
  // Never use a client-provided object key or arbitrary Supabase bucket.
  const parts = typeof objectKey === "string" ? objectKey.split("/") : [];
  if (parts.length !== 3 || parts[0] !== attemptId ||
      parts[1] !== `v${version}` || !DIGEST_PDF_RE.test(parts[2])) {
    return respond(404, { error: "Result not available" }, origin);
  }
  const encodedPath = parts.map(encodeURIComponent).join("/");
  // The service key is used ONLY to sign a verified private object path.
  const signed = await callJson(`${base}/storage/v1/object/sign/${BUCKET}/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: TTL_SECONDS }),
  }).catch(() => ({ ok: false, data: null }));
  if (!signed.ok) {
    return respond(503, { error: "Download temporarily unavailable" }, origin);
  }
  const relative = signed.data?.signedURL ?? signed.data?.signedUrl;
  // A compromised response must not redirect users to an arbitrary host.
  if (typeof relative !== "string" ||
      !relative.startsWith(`/object/sign/${BUCKET}/`)) {
    return respond(503, { error: "Invalid download link" }, origin);
  }
  const signedUrl = `${base}/storage/v1${relative}`;
  return respond(200, { signedUrl, expiresInSeconds: TTL_SECONDS }, origin);
});
// Security gap before deployment: dedicated immutable upload/approval workflow,
// real JWT and signed-link expiry tests, audit trail and rate limits.
// A previously issued signed URL cannot be recalled before its TTL expires.
