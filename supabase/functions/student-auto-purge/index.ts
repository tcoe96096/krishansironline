import { createClient } from "npm:@supabase/supabase-js@2";

type PurgeClaim = {
  student_id: string;
  student_name: string;
  claim_token: string;
  purge_after: string;
  class_level: string;
  roll_no: string;
  school_name: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function jwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Supabase gateway verifies the JWT signature (verify_jwt=true). The worker
  // additionally requires the service_role claim; ordinary Admin JWTs are refused.
  const authorization = req.headers.get("Authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!bearer || jwtRole(bearer) !== "service_role") {
    return json({ error: "service_role_required" }, 403);
  }

  // Fail closed until the owner explicitly enables the execution gate after Preview review.
  if (Deno.env.get("STUDENT_PURGE_EXECUTION_ENABLED") !== "true" || Deno.env.get("STUDENT_PURGE_CONFIRMATION") !== "OWNER_APPROVED_PREVIEW_ONLY") {
    return json({
      status: "prepared_but_disabled",
      message: "Auth deletion is disabled. Configure the execution gate only after synthetic Preview acceptance.",
    }, 423);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "worker_configuration_missing" }, 503);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: claims, error: claimError } = await admin
    .rpc("claim_student_purge_batch", { p_batch_size: 10 });
  if (claimError) return json({ error: "claim_batch_failed", code: claimError.code ?? "db_error" }, 500);

  const results: Array<{ status: string; code?: string }> = [];
  for (const claim of (claims ?? []) as PurgeClaim[]) {
    const { student_id: studentId, claim_token: claimToken } = claim;
    try {
      const { data: authorized, error: authzError } = await admin
        .rpc("authorize_student_purge", {
          p_student_id: studentId,
          p_claim_token: claimToken,
        });
      if (authzError || authorized !== true) {
        await admin.rpc("release_student_purge_claim", {
          p_student_id: studentId,
          p_claim_token: claimToken,
          p_error_code: "eligibility_recheck_failed",
        });
        results.push({ status: "blocked", code: "eligibility_recheck_failed" });
        continue;
      }

      // Confirm the Auth identity still exists. A prior successful delete followed
      // by a network timeout is treated idempotently on the next retry.
      const { data: authUser, error: getUserError } = await admin.auth.admin.getUserById(studentId);
      let alreadyAbsent = false;
      if (getUserError) {
        const status = (getUserError as { status?: number }).status;
        if (status === 404 || getUserError.message.toLowerCase().includes("not found")) {
          alreadyAbsent = true;
        } else {
          throw new Error("auth_lookup_failed");
        }
      }

      if (!alreadyAbsent && !authUser.user) {
        throw new Error("auth_lookup_returned_no_user");
      }

      if (!alreadyAbsent && authUser.user) {
        const appRole = String(authUser.user.app_metadata?.role ?? "").toLowerCase();
        const appRoles = Array.isArray(authUser.user.app_metadata?.roles)
          ? authUser.user.app_metadata.roles.map((v: unknown) => String(v).toLowerCase())
          : [];
        if (["admin", "super_admin", "staff"].includes(appRole) ||
            appRoles.some((role: string) => ["admin", "super_admin", "staff"].includes(role))) {
          throw new Error("privileged_auth_identity_blocked");
        }
        const { error: deleteError } = await admin.auth.admin.deleteUser(studentId, false);
        if (deleteError) throw new Error("auth_delete_failed");
      }

      const { data: completed, error: completeError } = await admin
        .rpc("complete_student_purge", {
          p_student_id: studentId,
          p_claim_token: claimToken,
          p_auth_user_absent: alreadyAbsent,
        });
      if (completeError || completed !== true) throw new Error("completion_finalize_failed");
      results.push({ status: alreadyAbsent ? "already_absent_completed" : "auth_deleted_completed" });
    } catch (error) {
      const code = error instanceof Error ? error.message : "worker_error";
      await admin.rpc("release_student_purge_claim", {
        p_student_id: studentId,
        p_claim_token: claimToken,
        p_error_code: code,
      });
      results.push({ status: "retryable_failure", code });
    }
  }

  return json({
    status: "processed",
    claimed: (claims ?? []).length,
    results,
  });
});
