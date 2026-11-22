# Teacher v2 — offline Preview recovery evidence verifier (2026-11-22)

**Scope:** Review-only in Draft PR #126. **Status: RECOVERY NOT VERIFIED — NO-GO.**
This tool performs **no SQL, pg_restore, database write, network request, role grant/revoke, deployment, or merge**. Do not connect it to Production. It cannot restore a database.

Earlier KSOL local archive checks could read the archive but scoped restores failed at actual Supabase cross-schema dependencies (auth.uid(), then auth.users). Those runs did not establish successful full recovery. A readable archive, matching copies and green synthetic browser tests are not a completed restore.

## Deliverables

- scripts/teacher-restore-evidence-check.mjs — offline SHA-256, byte-size, target identity and chronology checker.
- tests/teacherRestoreEvidenceCheck.test.mjs — synthetic positive/negative tests, using only temporary fake files.
- docs/reviews/teacher-v2-restore-evidence-manifest.EXAMPLE.json — intentionally invalid example; placeholders never count as evidence.

## Local-only usage

After an independently performed restore into a **disposable Supabase-compatible target**, and after collecting its evidence, place the manifest and referenced files together inside a **private local folder**. Copy the example manifest into that folder and replace placeholders with independently verified values. File paths must be relative to the manifest folder; symlinks and parent traversal are rejected.

Use Node.js 22 or compatible in a checkout of this repository:

    node scripts/teacher-restore-evidence-check.mjs "D:\KSOL-BACKEND\private-recovery-evidence\manifest.json"

Windows PowerShell may calculate local digests with Get-FileHash -Algorithm SHA256 and sizes with (Get-Item 'file-path').Length. Do **not** publish the backup, restore logs, complete manifest, credentials, private URLs, tokens, personal records or storage object bytes in GitHub or this chat.

The backup for this verification path must be a PostgreSQL custom-format archive with the real **PGDMP** header; a file merely named `.dump` or with a valid SHA-256 is insufficient. The CLI also checks UTC timestamps strictly instead of accepting normalized impossible calendar dates. Neither check proves the archive can be restored.\n\nThe offline tool requires six present, individually SHA-256-verified files: backup archive, complete restore log, source inventory, restored inventory, reconciliation report and synthetic smoke report. The manifest must record a zero restore exit status, chronological UTC timestamps, and a unique disposable target (not the Preview or Production project IDs). It must contain explicit reconciliation confirmations for schemas, tables, row counts, constraints, indexes, functions, triggers, RLS policies, effective grants, auth dependencies, Storage metadata, a synthetic read and a controlled synthetic write/rollback. Current Preview state must independently match the backup source; stale or partial copies are not acceptable.

Missing/mismatched/unsafe artifacts produce INVALID_EVIDENCE and exit 1. **Even if all fields and hashes appear consistent, the checker always returns releaseGate: NO_GO and STRUCTURALLY_CONSISTENT_NOT_VERIFIED.** Reports and boolean assertions could be fabricated. A qualified independent reviewer must inspect the actual evidence and confirm application-level recovery, including non-database Storage object bytes, Auth/OAuth, cross-schema dependencies, service permissions and extensions.

## Remaining independent gates

1. Independently verify complete, current Preview backup and isolated full restore with source-vs-restored reconciliation. Production needs its own recovery proof.
2. Review PR #114's proposed least-privilege public.user_roles TRUNCATE remediation. Actual Preview grants to anon and authenticated are still unsafe; RLS does not apply to TRUNCATE. No privilege change is authorized by this report.
3. Review migration dependency order, exact function signatures, SECURITY DEFINER grants and all overlapping Storage policies.
4. Perform actual Preview JWT positive/negative access tests for separate synthetic applicants, ordinary Admin and independent Super Admin, and require quarantining plus malware scanning before reviewer download of PDF/DOCX files.
5. Obtain **separate explicit owner approval** for each precisely scoped high-impact Preview operation; do not infer permission from a successful evidence package or a generic "continue".

**Release boundary:** GitHub Pages only; Cloudflare is DNS only. PR #126 remains Draft, PR #109 remains read-only. No Preview/Production mutation, source merge, live deployment or flag activation was performed while preparing this verifier.
