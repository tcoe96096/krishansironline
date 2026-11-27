export {};
// Review-only Deno server runtime declarations; not browser runtime code.
declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Response | Promise<Response>): unknown };
// STAGED ONLY / DO NOT DEPLOY OR ACTIVATE WITHOUT APPROVED RECOVERY.
// Candidate Supabase Edge Function: trusted PDF upload + admin approval.
// Prerequisites: approved migrations, private bucket, JWT+RLS tests,
// independent restore proof, rate limits, audit review, owner approval.
// This code does not run until explicitly deployed in a later release.

const BUCKET = "result-cards-private";
const LIMIT_BYTES = 10485760;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ALLOWED_ORIGINS = new Set([
  "https://krishansir.online",
  "https://www.krishansir.online",
]);

function response(status: number, body: unknown, origin: string | null) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store, max-age=0",
    "Vary": "Origin",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function jsonFetch(url: string, options: RequestInit) {
  const res = await fetch(url, { ...options, redirect: "error" });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
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
    return response(423, { error: "Result Card backend is not activated" }, req.headers.get("origin"));
  }
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return response(403, { error: "Origin not allowed" }, null);
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
    return response(405, { error: "Method not allowed" }, origin);
  }
  const base = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base?.startsWith("https://") || !anonKey || !serviceKey) {
    return response(503, { error: "Service unavailable" }, origin);
  }
  const authorization = req.headers.get("authorization");
  if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
    return response(401, { error: "Sign in required" }, origin);
  }
  // Validate the current server-side user session before consuming PDF bytes.
  const user = await jsonFetch(`${base}/auth/v1/user`, {
    method: "GET",
    headers: { apikey: anonKey, Authorization: authorization },
  }).catch(() => ({ ok: false, data: null }));
  if (!user.ok || !UUID_RE.test(user.data?.id || "")) {
    return response(401, { error: "Sign in required" }, origin);
  }
  // Super-admin role is checked in Postgres; never trust user_metadata.
  const admin = await jsonFetch(`${base}/rest/v1/rpc/is_super_admin`, {
    method: "POST",
    headers: {
      apikey: anonKey, Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: "{}",
  }).catch(() => ({ ok: false, data: null }));
  if (!admin.ok || admin.data !== true) {
    return response(403, { error: "Not authorized" }, origin);
  }

  // Multipart body: pdf (binary File), attemptId, expectedVersion, requestKey.
  // Browser must never supply arbitrary Storage paths, credentials or digest.
  const maxMultipartBytes = LIMIT_BYTES + 65536;
  if (Number(req.headers.get("content-length") || 0) > maxMultipartBytes) {
    return response(413, { error: "PDF too large" }, origin);
  }
  let form: FormData;
  try {
    // Do not trust Content-Length: stream and cap the ACTUAL request bytes.
    // req.formData() alone can buffer an unbounded request into memory.
    const reader = req.body?.getReader();
    if (!reader) return response(400, { error: "Missing request body" }, origin);
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxMultipartBytes) {
        await reader.cancel();
        return response(413, { error: "PDF too large" }, origin);
      }
      chunks.push(value);
    }
    const boundedBytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      boundedBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const multipart = new Response(boundedBytes.buffer, {
      headers: { "Content-Type": req.headers.get("content-type") ?? "" },
    });
    form = await multipart.formData();
  } catch {
    return response(400, { error: "Invalid multipart request" }, origin);
  }
  const attemptId = String(form.get("attemptId") || "").toLowerCase();
  const version = Number(form.get("expectedVersion"));
  const requestKey = String(form.get("requestKey") || "").toLowerCase();
  const pdf = form.get("pdf");
  if (!UUID_RE.test(attemptId) || !Number.isSafeInteger(version) || version < 1 ||
      !UUID_RE.test(requestKey) || !(pdf instanceof File) ||
      pdf.type !== "application/pdf" || pdf.size < 8 || pdf.size > LIMIT_BYTES) {
    return response(400, { error: "Invalid PDF approval request" }, origin);
  }
  const bytes = new Uint8Array(await pdf.arrayBuffer());
  if (String.fromCharCode(...bytes.subarray(0,5)) !== "%PDF-") {
    return response(400, { error: "Invalid PDF format" }, origin);
  }
  // Real digest of the exact uploaded bytes: never accept a client hash.
  const checksum = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const sha256 = Array.from(checksum, b => b.toString(16).padStart(2, "0")).join("");
  const key = `${attemptId}/v${version}/${sha256}.pdf`;
  const encoded = key.split("/").map(encodeURIComponent).join("/");

  // This upload path is server-only, immutable, and never uses upsert.
  const upload = await fetch(`${base}/storage/v1/object/${BUCKET}/${encoded}`, {
    method: "POST",
    redirect: "error",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/pdf",
      "x-upsert": "false",
    },
    body: bytes,
  }).catch(() => null);
  // On both new uploads and retries, read back the actual stored bytes.
  // A failed or unknown write never grants approval.
  if (!upload?.ok && upload?.status !== 409) {
    return response(503, {error:"PDF could not be stored"}, origin);
  }
  const stored = await fetch(`${base}/storage/v1/object/authenticated/${BUCKET}/${encoded}`, {
    method:"GET",redirect:"error",
    headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`},
  }).catch(()=>null);
  if(!stored?.ok || stored.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/pdf"){
    return response(409,{error:"Stored PDF requires review"},origin);
  }
  const previous=await boundedBody(stored.body,LIMIT_BYTES).catch(()=>null);
  if(!previous || previous.byteLength!==bytes.byteLength){
    return response(409,{error:"Stored PDF mismatch"},origin);
  }
  const priorDigest=new Uint8Array(await crypto.subtle.digest("SHA-256",previous));
  const priorSha256=Array.from(priorDigest,b=>b.toString(16).padStart(2,"0")).join("");
  if(priorSha256!==sha256){
    return response(409,{error:"Stored PDF checksum mismatch"},origin);
  }

  // Trusted server approval: caller JWT validated above; SQL rechecks actor role.
  const approval = await jsonFetch(`${base}/rest/v1/rpc/ksol_result_approve_pdf`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_actor_id: user.data.id,
      p_attempt_id: attemptId,
      p_expected_version: version,
      p_artifact_sha256: sha256,
      p_request_key: requestKey,
    }),
  }).catch(() => ({ ok: false, data: null }));
  if (!approval.ok || approval.data !== "approved") {
    // Fail closed; an uploaded orphan is NOT released. Do not auto-delete.
    return response(409, { error: "PDF uploaded but approval requires review" }, origin);
  }
  return response(200, { state: "approved", sha256, version }, origin);
});
// No automatic release or notification. Approval does not make results public.
// Block deployment until real end-to-end authorization, storage, rollback,
// file validation, short-lived URL, rate-limit and audit tests are complete.
