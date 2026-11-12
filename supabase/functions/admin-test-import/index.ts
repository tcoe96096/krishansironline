import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) return json({ error: "Function configuration incomplete" }, 500);

    const boundedFetch: typeof fetch = (input, init = {}) => {
      const timeout = AbortSignal.timeout(15000);
      const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
      return fetch(input, { ...init, signal });
    };
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader }, fetch: boundedFetch },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    console.log("admin-test-import: validating user session");
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) {
      console.error("admin-test-import: auth validation failed", userError?.message);
      return json({ error: "Invalid session", detail: userError?.message }, 401);
    }

    console.log("admin-test-import: checking admin role");
    const { data: role, error: roleError } = await client
      .from("user_roles").select("role").eq("user_id", userData.user.id)
      .eq("role", "admin").maybeSingle();
    if (roleError || !role) {
      console.error("admin-test-import: admin role check failed", roleError?.message);
      return json({ error: "Admin access required", detail: roleError?.message }, 403);
    }

    let payload: { test?: unknown; answer_key?: unknown };
    try { payload = await req.json(); }
    catch { return json({ error: "Valid JSON body required" }, 400); }
    if (!payload.test || !Array.isArray(payload.answer_key)) {
      return json({ error: "Reviewed test and answer_key array are required" }, 400);
    }

    console.log("admin-test-import: saving draft through RPC");
    const { data, error } = await client.rpc("admin_save_test", {
      p_test: payload.test,
      p_answer_key: payload.answer_key,
    });
    if (error) {
      console.error("admin-test-import: draft RPC failed", error.message);
      return json({ error: error.message }, 400);
    }
    console.log("admin-test-import: draft saved", String(data));
    return json({ ok: true, test_id: data, status: "draft_saved" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected function error";
    console.error("admin-test-import: request failed", message);
    const timedOut = /timed out|abort/i.test(message);
    return json({ error: timedOut ? "A Supabase request timed out; retry after checking Preview logs." : message }, timedOut ? 504 : 500);
  }
});