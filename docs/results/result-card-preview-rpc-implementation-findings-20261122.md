# Preview RPC implementation findings — REVIEW ONLY (2026-11-22)

Read-only `pg_get_functiondef` inspection in `krishan-sir-lms-preview`. **No SQL executed beyond SELECT; no result sent.**

## Existing RPC contracts
- `public.can_publish_result_card_template()`: STABLE SQL, `auth.uid() IS NOT NULL AND public.is_super_admin()`.
- `public.publish_result_card_template(text,jsonb,text)`: SECURITY DEFINER, empty search_path; super-admin only; theme enum modern/classic/minimal, options JSON object max 3000 bytes, allowlisted design keys, reason 12–1000 characters; upsert `result_card_templates` with returned version.
- `public.send_result_to_student(uuid)`: SECURITY DEFINER, empty search_path; super-admin only; reads `test_attempts.student_id/status`; requires status submitted and `student_account_is_eligible`; upserts `result_delivery_notices`, resets `read_at`, and appends `result_delivery_audit`.

## Required decisions before Production
1. **Replay/idempotency gap:** the send RPC upserts an existing notice but appends another SENT audit on every repeat call. This may represent a legitimate resend, but it is NOT idempotent delivery. Specify explicit resend vs first-send semantics and an idempotency key before adding automated delivery.
2. **Lifecycle gap:** submitted attempts are accepted; there is no explicit immutable released-version / revoked state check in this RPC. Confirm release and withdrawal requirements before relying on it for student access.
3. **Security review:** validate `is_super_admin` and `student_account_is_eligible` definitions and grants; confirm definer owner, EXECUTE ACL, RLS and trigger behavior. SECURITY DEFINER with fixed search_path alone does not prove safety.
4. **Template version:** verify the existing version increment trigger and constraints; the upsert does not explicitly increment version in the inspected function.
5. **Schema migration:** exact six-table schema, constraints, sequences, triggers and dependencies must be generated from catalog before Production rollout. Never copy only the functions.
6. **No automatic sends:** do not run `send_result_to_student` as a test. Use synthetic transaction fixtures on a disposable restore after backup evidence.

## Go/no-go
**NO-GO for Production activation at present.** Missing independently verified restore, reviewed dependency-ordered migration, authenticated negative tests and separate owner authorization. Draft PR #129 is review-only, not a deployment request.
