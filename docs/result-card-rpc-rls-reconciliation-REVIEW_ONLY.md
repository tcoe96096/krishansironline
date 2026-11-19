# Result Card RPC / RLS reconciliation worksheet — REVIEW ONLY

Status: **unverified inventory, no database access or execution**. Prepared against Draft PR #122 and the current repository search surface on 2026-11-19. This is not proof that any Preview RPC exists, or that Production has the feature.

## Evidence and unknowns

- PR #117 is merged into main; it consolidates Website Studio navigation, not report-card issuance.
- PR #122 is a draft containing `MockResultCardDesigner`, `MockResultInbox` and review-only private-delivery acceptance criteria.
- Repository code searches for `result_card`, `result_cards`, `issue_result_card` and `rpc_result` returned no indexed matches in this review. **Search absence is not a database inventory**; migration folders, branches and actual Preview catalog remain to be reconciled.
- Production must be treated as **not having a verified Result Card backend**. Do not activate a client call based on Preview design notes.

## Read-only inspection checklist for authorized reviewer

1. Record exact Preview and Production project identifiers **privately**, without copying keys, URLs containing secrets, or student records into PR comments.
2. Inspect migration history and compare names, signatures, argument types, SECURITY DEFINER/INVOKER mode, owner, grants, `search_path`, dependencies and revocation paths of every candidate Result Card RPC.
3. Inspect tables, foreign keys, uniqueness constraints, RLS enablement, policy expressions and the effect of nullable `auth.uid()` for anonymous calls.
4. Inspect private Storage bucket policies and signed URL issuance independently of table RLS; verify URL expiry and revocation semantics.
5. Map each operation (draft template, approve, issue, list own inbox, download, print, deliver, revoke, audit) to one server-authorized actor and a negative test. If no matching RPC exists, mark **MISSING**, not `implemented`.
6. Compare Preview-only migrations against main and Production's applied migration ledger; record missing, divergent or reordered migrations. Never run them as part of this worksheet.
7. Confirm recoverable backups and a rehearsed rollback separately; require owner authorization for Preview changes and another authorization for Production changes.

## Denial-first test matrix (specification, not executed)

| Operation | Negative fixture | Required outcome |
| --- | --- | --- |
| List inbox | anonymous; student B requesting student A | no rows or unauthorized |
| Fetch PDF/print payload | forged issue ID; revoked or undelivered issue | denied before payload or URL creation |
| Issue report | student; unapproved teacher; admin without issuer grant | denied, no state change |
| Scoped teacher review | wrong class, subject, assignment or suspended profile | denied |
| Deliver | mismatched recipient; duplicate idempotency key | denied or one effective delivery, never fan-out |
| Revoke | non-issuer; stale revision | denied |
| Audit | student asking for other actors' events | denied, no sensitive payload exposure |
| Website Studio publish | any Studio editor without result-issuer grant | cannot issue or deliver |

## Required handoff artifacts

- Redacted per-environment schema/RPC inventory with object signatures and migration checksums.
- Reviewed authorization mapping and least-privilege GRANT/RLS/Storage proposals.
- Isolated fixture test evidence (positive and negative), including role revocation, cross-student access and idempotent retry.
- Recovery evidence and explicit separate owner approvals.

**Current gate: BLOCKED for backend activation.** This worksheet is safe to review and commit; it authorizes no SQL execution, database mutation, deployment, merge, publication or result delivery. Teacher v2, PR #109, Student/Exam source and standalone ADVANCE Studio remain out of scope.
