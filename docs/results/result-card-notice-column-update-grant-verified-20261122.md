# Preview notice column-grant audit — verified 2026-11-22

Read-only `information_schema.column_privileges` check for anon/authenticated non-SELECT grants.

**Finding:** `authenticated` has `UPDATE` on **only** `public.result_delivery_notices.read_at`. No UPDATE grant was returned for `attempt_id`, `student_id`, `sent_by`, or `sent_at`. This explains how student mark-read works even though authenticated has no table-level UPDATE grant.

Combined with the previously verified UPDATE RLS policy requiring `student_id=auth.uid()` and `student_account_is_eligible(auth.uid())` in both USING and WITH CHECK, the intended least-privilege design is consistent at the direct-role grant level.

**Limitations:** Catalog grants do not substitute for actual JWT-based negative tests; inherited roles, function privileges and triggers still need review. This does not establish that delivery notices are versioned, revocable results. Existing `send_result_to_student` resend behavior remains a separate gap.

**Disposition:** No need to add a mark-read RPC solely to overcome missing UPDATE privilege. Preserve the column-specific grant in migration. No DB writes made.
