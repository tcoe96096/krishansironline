# Results / Study Materials / Main Website Studio boundary QA — REVIEW ONLY

Date: 2026-11-20. Scope: PR #122 draft against main, with Main Visual Website Studio introduced by merged PR #117. This is a **proposed synthetic acceptance protocol**, not executed browser or server evidence.

## Authority boundaries

| Surface | May edit draft | May publish/issue | May view/download | Server-side gate to prove |
| --- | --- | --- | --- | --- |
| Main Visual Website Studio | authorized website admin only | separately approved website publisher | public published pages only | website roles, version ownership, publish approval |
| Result card template / letterpad | results admin or delegated template editor | no result issue from template editor | sanitized synthetic preview | template capability distinct from student issue capability |
| Result Inbox | no editing of issued record | results issuer with class/subject scope and audit | only authenticated recipient student | issue ownership, revocation, private storage, signed URL TTL |
| Study Materials | content author with scoped class/subject | authorized content publisher | eligible enrolled students after publish | material status, class/subject assignment and enrollment |

All role and RPC names are **proposals**, not claims about deployed permissions. Teachers must not gain issuance/publishing rights merely through website-editor access. No Student/Exam or Teacher source changes are authorized here.

## Synthetic end-to-end negative checks

1. **Studio → result boundary:** website editor attempts to insert a Result Inbox link with another student's issue ID. Preview must not expose private result content, signed URL or audit metadata. A copied URL must be denied by server without recipient authentication.
2. **Template → issue boundary:** modify draft logo, header and watermark; verify no result is sent, no issue record created, and print/download buttons remain mock-only until backend and authorization are verified.
3. **Material draft → student boundary:** link unpublished PDF/video/notes from a published website page; student receives no private content. Public page publication cannot implicitly publish a material.
4. **Material assignment boundary:** student enrolled in class A tries class B private notes using direct URL; server must deny even if UI link is manipulated.
5. **Revocation boundary:** student retains a previously copied result download URL after issue revocation; new downloads must be denied. Verify expiration of previously issued signed URLs against the agreed TTL; do not claim immediate revocation of already-issued URLs without server evidence.
6. **Role crossover:** teacher with multiple assigned classes and subjects can author only authorized materials; must not publish website pages or issue results absent separate explicit capability.
7. **Responsive and print:** 320/375/768/1280 px, Hindi and English, keyboard focus, long titles, PDF print clipping and no hidden private IDs in printed footer. Record actual screenshots before marking PASS.
8. **Failure mode:** absent Production Result Card RPC/storage must produce an explicit unavailable state, not synthetic success or a fake delivery receipt.

## Evidence ledger (blank until executed)

| Case | Commit SHA | Browser / viewport | Fixture | Actual | Screenshot / console | Server denial trace | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1–8 | pending | pending | synthetic only | not run | not captured | not available | NOT VERIFIED |

## Non-negotiable gates

- Read-only, redacted Preview vs Production RPC, RLS, migration and private Storage inventory; never assume Preview design equals Production capability.
- Verified recovery/rollback and separately recorded owner approval before migration, deployment, merge, website publishing or sending results.
- Real recipient, teacher assignment and admin role authorization must be tested server-side, not inferred from disabled buttons.
- Do not modify Student/Exam, Teacher v2, PR #109, ADVANCE Studio repository, credentials or active Studio data.

No database access, real result send, release, merge, publishing or deployment is part of this document.
