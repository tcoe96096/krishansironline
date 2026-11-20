# Result Inbox synthetic browser acceptance — REVIEW ONLY (2026-11-20)

Scope: Draft PR #122, mock-only Result Inbox and Result Card Designer. This is a **test plan, not executed browser evidence**. Production result-card RPC is unverified/unavailable; no real student delivery is authorized.

## Preflight
- Pin exact PR head SHA and record the four CI conclusions. Build success is not browser authorization evidence.
- Use synthetic records only. No real student identifiers, credentials, private PDFs or active Studio data.
- Test desktop and 320px/375px/768px viewport widths, Hindi and English, keyboard navigation and print preview without transmitting data.

## Denial-first scenarios
| Case | Synthetic input | Expected UI | Server evidence still required |
| --- | --- | --- | --- |
| R1 | null/array/object title or session | no React crash or object rendering | server schema validation |
| R2 | blank/whitespace title, control or bidi formatting chars | reject or safe rendering | normalized persisted value |
| R3 | duplicate issue ID, revoked record preceding valid record | deterministic safe selection, no revoked payload | unique key and revocation check |
| R4 | student B opens student A's issue ID | mock must not claim access | authenticated RLS/RPC denial |
| R5 | revoked/undelivered issue, forged download/print action | no active download in mock | server rejects URL generation |
| R6 | teacher without class/subject assignment, Studio editor | no result issuance authority implied | server role/assignment enforcement |
| R7 | repeated delivery request with same idempotency key | no mock claim of actual delivery | atomic one-recipient issuance and audit |
| R8 | missing RPC/backend or offline | explicit preview-only/unavailable state | production inventory and recovery |

## Evidence capture template
For each case record: tested commit SHA, viewport, locale, browser version, fixture ID (synthetic), expected/actual, screenshot path, console errors, pass/fail and reviewer. Do not label a case PASS until actually executed.

## Release gates
1. Read-only Preview and Production RPC, migration, RLS and private Storage inventory with redacted evidence.
2. Server-side positive and negative authorization tests, including cross-student isolation, revocation and signed URL expiry.
3. Verified recovery/rollback and **separate explicit owner approval** before any migration, merge, deployment, publication or result send.

No SQL executed, no database writes, no release or production functionality claimed. Teacher v2 / PR #109, Student/Exam and ADVANCE Studio are excluded.
