// STAGED ONLY / DO NOT DEPLOY OR ACTIVATE WITHOUT APPROVED RECOVERY.
// Candidate Supabase Edge Function for revocation-checked private PDF proxy downloads.
// Requires: private bucket + release SQL + student gate + manifest RPC,
// JWT tests, independently proven restore, and owner approval.
// No third-party imports; credentials remain in server environment only.
// Copy to a deployed Edge Function ONLY after security review.

const BUCKET = "result-cards-private";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DIGEST_PDF_RE = /^[0-9a-f]{64}\.pdf$/;
const ALLOWED_ORIGINS = new Set([
  "https://krishansir.online",
  "https://www.krishansir.online",
]);

function respond(status: number, payload: unknown, origin: string | null) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store, max-age=0",
    "Pragma": "no-cache",
    "Vary": "Origin",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

async function callJson(url: string, options: RequestInit) {
  const res = await fetch(url, { ...options, redirect: "error" });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

async function boundedBody(body: ReadableStream<Uint8Array> | null, limit: number): Promise<ArrayBuffer> {
  if (!body) throw new Error("Missing body");
  const reader=body.getReader();
  const chunks:Uint8Array[]=[];
  let size=0;
  try {
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>limit){await reader.cancel();throw new Error("Body exceeds limit");}
      chunks.push(value);
    }
    const out=new Uint8Array(size);
    let offset=0;
    for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength;}
    return out.buffer;
  } finally {reader.releaseLock();}
}

Deno.serve(async (req: Request) => {
  if (Deno.env.get("KSOL_RESULT_CARD_FUNCTIONS_ENABLED") !== "true") {
    return respond(423, { error: "Result Card backend is not activated" }, req.headers.get("origin"));
  }
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
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
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
    const raw = new TextDecoder('utf-8', {fatal:true}).decode(await boundedBody(req.body,2048));
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
  // Never issue a reusable signed Storage URL: revocation must be checked
  // through the caller's JWT on EVERY fresh PDF request.
  const stored = await fetch(`${base}/storage/v1/object/authenticated/${BUCKET}/${encodedPath}`, {
    method: "GET",
    redirect: "error",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  }).catch(() => null);
  if (!stored?.ok) {
    return respond(503, { error: "Download temporarily unavailable" }, origin);
  }
  const length = Number(stored.headers.get("content-length"));
  const mime = stored.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mime !== "application/pdf" || length > 10485760) {
    return respond(503, { error: "Invalid private PDF" }, origin);
  }
  // Verify the exact bytes against the immutable, version-bound object digest.
  const contents = await boundedBody(stored.body,10485760).catch(() => null);
  if (!contents || contents.byteLength < 8 || contents.byteLength > 10485760) {
    return respond(503, { error: "Invalid private PDF" }, origin);
  }
  const bytes = new Uint8Array(contents);
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-") {
    return respond(503, { error: "Invalid private PDF" }, origin);
  }
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", contents));
  const actualSha256 = Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
  if (actualSha256 !== parts[2].slice(0, 64)) {
    return respond(503, { error: "Private PDF integrity check failed" }, origin);
  }
  // Fail closed when release is revoked during private Storage retrieval.
  // A second caller-JWT manifest check narrows the TOCTOU window, but does
  // not establish an atomic database/HTTP delivery transaction.
  const finalManifest = await callJson(`${base}/rest/v1/rpc/ksol_result_pdf_manifest`, {
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
  if (!finalManifest.ok || finalManifest.data !== objectKey) {
    return respond(404, { error: "Result no longer available" }, origin);
  }
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="result-card-${attemptId}-v${version}.pdf"`,
    "Cache-Control": "private, no-store, max-age=0",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return new Response(contents, { status: 200, headers });
});
// Security gap before deployment: dedicated immutable upload/approval workflow,
// real JWT/authorization/integrity tests, audit trail and rate limits.
// No reusable signed Storage URL is issued; already-downloaded bytes cannot be recalled.
