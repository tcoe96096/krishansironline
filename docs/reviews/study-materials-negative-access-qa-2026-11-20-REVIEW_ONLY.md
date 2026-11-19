# Study Materials — negative-access mock QA matrix (REVIEW ONLY)

Date: 2026-11-20. Applies to the proposed role/linking contract, not a deployed feature. No live identities, uploads, signed URLs, SQL, or API calls are required.

## Synthetic fixtures
- Classes A and B, subjects History and Science; material M1 is a published private History PDF for A, M2 is a draft note for A, M3 is an archived video for B.
- Student S1 is enrolled in A; S2 is enrolled in B; S3 has withdrawn from A. Teacher T1 is assigned to A/History, T2 to B/Science; Admin A1 has content-review permission but **not** publish delegation.
- All fixtures use invented identifiers and mock storage keys only. Mock signed URLs are inert strings, never real bearer tokens.

## Required assertions before backend approval
| Case | Request | Expected mock outcome |
|---|---|---|
| 01 | S1 lists published materials for A | M1 visible; M2/M3 absent |
| 02 | S2 requests M1 by direct ID | Denied without title, object key, or download URL disclosure |
| 03 | S3 uses stale A enrollment to request M1 | Denied after entitlement re-check |
| 04 | S1 requests M2 by direct ID | Denied; draft metadata not leaked |
| 05 | S2 requests archived M3 | Denied; no cached private link |
| 06 | T2 attempts to edit M1 | Denied despite teacher role |
| 07 | A1 attempts to publish M2 | Denied absent explicit publish delegation |
| 08 | Client changes class_ids in request | Server-side authoritative class/subject validation required |
| 09 | S1 reuses expired mock download token | Denied; fresh authorization required before issuing replacement |
| 10 | S1 loses A enrollment after listing M1 | Subsequent download denied; listing cache not authority |
| 11 | Video source is javascript:, http:, or unapproved embed | Rejected; no unsafe embed or link rendering |
| 12 | Studio draft changes material visibility | No content publish action or access expansion |
| 13 | Student attempts Result Inbox route using material entitlement | Denied; result permissions independent |
| 14 | Mobile width 320px and keyboard-only navigation | No inaccessible controls, horizontal page overflow, or hidden denial message |

## Evidence format for future mock browser QA
For each case record fixture ID, action, visible result, redacted console output, viewport where relevant, and pass/fail. Use local/mock routes only; do not capture personal data. Tests should assert absence of forbidden metadata as well as visible denial. No passing status is claimed by this document.

## Implementation boundaries
This is a review checklist, not executable tests or proof of working production authorization. Before implementing: reconcile Preview-only Result Card RPC/RLS/storage against Production; review recovery evidence; obtain owner-approved shared contracts. Keep Student/Exam and Teacher source, PR #109, ADVANCE Studio, active Studio drafts, databases, deployments, and publishing untouched.
