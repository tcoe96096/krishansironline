# Teacher v2 Preview authenticated execution evidence — BLANK / REVIEW ONLY

**Status: BLOCKED — no Preview execution or authorization is implied.** This is an evidence-capture form, not a passing test report. Never include JWTs, refresh tokens, private photo/resume URLs, employee identity documents, service-role keys or personal records.

## Release identity (fill from independently verified sources)
- Main commit SHA: NOT RECORDED
- Candidate commit SHA: NOT RECORDED
- Exact reviewed SQL bundle and SHA-256 hashes: NOT RECORDED
- Preview project ID: `zgpkmfqioqvincmgyfpi` (target only; no SQL execution)
- Preview frontend URL and deployed artifact hash: NOT VERIFIED
- Recovery evidence: BLOCKED — full independent restore not verified
- Distinct owner authorization for Preview-only installation: NOT PROVIDED
- Existing Preview TRUNCATE hazard: BLOCKED until separately authorized remediation and read-only verification
- Feature flags: OFF

## Required test actors
Anonymous, pending teacher A, approved teacher B, rejected teacher C, delegated independent reviewer, super admin. Use distinct synthetic identities and server-issued JWTs. Do not put secrets in evidence.

## Per-case evidence table
Record **one row per case T01–T18** from `teacher-v2-authenticated-acceptance-matrix-2026-11-20.md`. Every case starts BLOCKED; no prefilled PASS.

| Case | Result | UTC timestamp | Synthetic actor alias | Request/operation | Expected HTTP/RPC | Actual sanitized HTTP/RPC | Audit/row-level evidence | Reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | BLOCKED | — | — | — | — | — | — | — |
| T02 | BLOCKED | — | — | — | — | — | — | — |
| T03 | BLOCKED | — | — | — | — | — | — | — |
| T04 | BLOCKED | — | — | — | — | — | — | — |
| T05 | BLOCKED | — | — | — | — | — | — | — |
| T06 | BLOCKED | — | — | — | — | — | — | — |
| T07 | BLOCKED | — | — | — | — | — | — | — |
| T08 | BLOCKED | — | — | — | — | — | — | — |
| T09 | BLOCKED | — | — | — | — | — | — | — |
| T10 | BLOCKED | — | — | — | — | — | — | — |
| T11 | BLOCKED | — | — | — | — | — | — | — |
| T12 | BLOCKED | — | — | — | — | — | — | — |
| T13 | BLOCKED | — | — | — | — | — | — | — |
| T14 | BLOCKED | — | — | — | — | — | — | — |
| T15 | BLOCKED | — | — | — | — | — | — | — |
| T16 | BLOCKED | — | — | — | — | — | — | — |
| T17 | BLOCKED | — | — | — | — | — | — | — |
| T18 | BLOCKED | — | — | — | — | — | — | — |

## Acceptance rules
- A PASS requires real JWT-backed Preview evidence for the exact case and independently reviewed before/after state; an offline unit test, mock, static SQL scan, or successful CI build is **not** a PASS.
- For denial cases, verify the attempted operation had **no unauthorized side effect**, including audit/role changes and private object writes.
- Signed URLs are time-limited bearer capabilities: logout or role revocation does **not** automatically invalidate an already-issued URL. For T14, test expiry and document any remaining validity window; do not falsely claim instant revocation.
- Do not run destructive TRUNCATE on Preview. Verify privileges using read-only catalog inspection.
- Any missing RPC, unexpected permission, failed test, incomplete restore, or missing explicit authorization keeps **NO-GO**.
- Production migration, feature activation, GitHub Pages publication, merge and Cloudflare changes remain prohibited without their separate approvals. PR #109 is read-only.
