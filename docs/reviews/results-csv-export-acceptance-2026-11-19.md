# Admin CSV export — review-only acceptance checklist (2026-11-19)

Scope: existing draft PR #122 (`fix/results-csv-formula-guard-20261119`), not digital Result Card publication or activation. No database operations.

## Verified source comparison
- On `main`, `src/components/AdminTestResults.tsx` concatenates raw values with commas, so spreadsheet formula interpretation and embedded delimiter/quote ambiguity are possible.
- On the isolated branch, `src/lib/resultsCsvSafety.ts` quotes each cell, doubles embedded double quotes, and prefixes an apostrophe when leading whitespace/control characters precede `=`, `+`, `@`, or `-` (or the cell begins with tab/CR/LF).
- The branch's `AdminTestResults.tsx` imports that helper for exported data and headers. This is a proposed client-side export hardening only, not an authorization boundary.

## Acceptance matrix (must be run before merge)
1. Formula-leading values: `=1+1`, `+SUM(1,1)`, `-1+2`, `@SUM(1,1)`.
2. Leading spaces/tabs/newlines and ASCII control characters before a formula marker.
3. Commas, quotes, CR/LF, Hindi and other Unicode text; verify exact round-trip of intended content.
4. Empty/null values, numbers and dates; verify no data loss or accidental formula execution.
5. Open exported CSV in actual Excel and Google Sheets with untrusted synthetic names; confirm inert text. Automated string assertions alone do not prove spreadsheet behavior.
6. Test UTF-8 BOM, CSV quoting and CRLF line endings.
7. Verify that server-side admin authorization, tenant/student scope, row-level policies and export audit are enforced independently. Frontend filtering alone is insufficient.
8. Review Unicode invisible-prefix edge cases and spreadsheet import differences before treating the formula guard as complete.

## Release gates
- No student/teacher source edits, result-card RPC activation, storage changes, data delivery, database migrations, preview/live deployments or merges from this checklist.
- Require exact-head CI, human review and separate owner approval. Production Result Card backend remains unavailable/unverified; do not conflate the CSV export with Result Inbox.

## Next bounded task
Add and execute focused synthetic Unicode-prefix regression tests for the existing CSV helper, then validate the resulting exact-head CI. Keep PR #122 draft.
