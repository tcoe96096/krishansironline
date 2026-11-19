# Result Card Preview RPC evidence gap — REVIEW ONLY (2026-11-19)

**No database connection, SQL execution, schema change, deployment, or release.** This is a source-evidence reconciliation for draft PR #122, not a live inventory.

## Repository evidence reviewed

| Evidence | What it supports | What it does NOT prove |
| --- | --- | --- |
| `docs/teacher-management-v2-activation-readiness-2026-11-17.md` (main) | A 17 Nov Preview read-only report says its migration listing reached a **result-card publisher migration dated 15 Nov 2026** | The publisher migration's filename, SQL body, RPC signatures, applied checksum, current existence, grants, or Production state |
| `docs/results-private-delivery-acceptance-REVIEW_ONLY.md` (PR #122) | Proposed template/issue/delivery/audit contract and denial-first cases | Deployed tables or server authorization |
| `docs/result-card-rpc-rls-reconciliation-REVIEW_ONLY.md` (PR #122) | Outstanding review checklist | An executed catalog inspection |
| `src/components/MockResultCardDesigner.tsx`, `src/components/MockResultInbox.tsx` (PR #122) | Mock-only UX candidates | Authenticated inbox, issuance, private download, or production backend |
| PR #117 (merged) | Single Main Visual Website Studio editor navigation | Result issuer permissions or result-card publication |

**Important correction:** Earlier searches for `result_card`, `report_card`, or `issue_report` returned no indexed matches, but the 17 Nov Preview report *does* mention a result-card publisher migration. Thus do **not** describe the Preview migration as absent. Neither an indexed search nor that historical report replaces current per-environment catalog evidence.

## Bounded next read-only inventory (authorized reviewer)

Capture a redacted, dated Preview catalog report containing: migration version/name/checksum, `pg_proc` signature/namespace, function security mode and fixed `search_path`, owner and effective EXECUTE grants (including PUBLIC), dependency table names, RLS policy names and expressions, storage bucket privacy and object policies. Separately capture the Production catalog to confirm differences; do not infer Production availability from Preview.

For each proposed operation — template draft, approve, issue, own inbox, deliver, download/print, revoke and audit — label `VERIFIED`, `MISSING`, `DIFFERENT` or `UNKNOWN`. Until signed-off, label all actual backend mappings **UNKNOWN**. Keep credentials, student records, full SQL results with personal data and signed URLs out of GitHub.

## Release gate

The 17 Nov recovery report records an incomplete local restore and missing `auth.users` in a limited-scope restore, not a successful current-state recovery. No backend wiring, Preview or Production migration, merge, publish, signed URL generation or cross-user delivery may proceed without recovery verification, security review and distinct target-specific owner approval.

Teacher v2, PR #109, Student/Exam code, Studio live data and the standalone ADVANCE Studio repository remain untouched.
