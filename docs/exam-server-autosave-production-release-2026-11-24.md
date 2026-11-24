# Exam autosave production release — 24 November 2026

## Current decision: NO_GO for database activation
Frontend PR #185 is merged into main (7abc7a2b3c30bd5c78f877d19bd8fe7f2a9ae54c). All five PR checks passed, including synthetic browser save/finalization. The production flag defaults off. Preview has private draft storage, authenticated RPCs and a successful minute-based scheduler. This does not establish live activation or full recovery.

Production read-only preflight found 2 published tests, both with aligned questions/keys and matching configured marks, 13 submitted attempts, and no currently running attempts at the check time. Existing attempt limits are deliberately unchanged. Recheck before release. Production legacy submission uses equal weighting and lacks the explicit eligibility check; the guard candidate preserves its scoring formula and hardens eligibility/deadline boundaries. Preview rollback-only tests passed for draft bypass rejection and both new and legacy submission. No production rows were modified.

## Mandatory sequence
1. Obtain fresh verified recovery evidence for the authorized isolated restore, including application-level checks; require the recovery gate to be GO. Do not substitute archive readability or synthetic restore.
2. Confirm production project identity, fresh backup and no active attempts. Capture non-sensitive aggregate inventory; securely retain exact current RPC definitions and column defaults for rollback outside public logs.
3. Confirm the release SQL and permissions. Apply the following in a single controlled transaction, excluding the schedule until verification:
   - supabase/preview/exam_server_autosave_candidate.sql
   - supabase/preview/exam_server_autosave_finish_candidate.sql
   - supabase/preview/exam_server_autosave_legacy_guard_candidate.sql
4. Verify private schema is inaccessible to anon/authenticated directly, draft table RLS enabled, anonymous RPC execution denied, authenticated RPC ownership/eligibility checks present, and old result count unchanged. Run approved isolated functional tests; no fabricated production student records.
5. Install the schedule using supabase/preview/exam_server_autosave_schedule_candidate.sql and verify one active successful job.
6. Set repository variable VITE_EXAM_SERVER_AUTOSAVE_ENABLED=true and redeploy main via GitHub Pages. Confirm the deployed build has the flag, test with an authorized synthetic account, confirm answer sync, resume, finalization and result. Existing attempts already in progress must not be interrupted.
7. Monitor the scheduler, RPC errors, result accuracy and unacknowledged draft counts. Only claim production activation after verification.

## Rollback (non-destructive)
Keep the draft table, private snapshots and cron until all draft-enabled attempts are finalized. First disable new exam starts through an authorized maintenance window if needed; keep the current client and finalizer usable for active drafts. After active draft count is zero, set the flag false and redeploy. Unschedule the named cron job only after pending drafts are resolved and verified. Restore the exact saved legacy RPC definition and privileges, if needed, and verify result counts. Do not drop draft tables, overwrite submitted rows, or relax access control to force release. Database changes and flag activation require the release gate above.

## References
- PR #185: https://github.com/tcoe96096/krishansironline/pull/185
- Recovery gate: docs/recovery/real-backup-restore-preflight-2026-11-23.md
