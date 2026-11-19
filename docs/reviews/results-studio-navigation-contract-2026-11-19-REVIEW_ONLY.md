# Results ↔ Main Visual Studio integration contract (REVIEW ONLY)

Date: 2026-11-19. Scope: proposal and static acceptance gates; no routes, shared components, backend, or active Studio state changed.

## Verified repository evidence
- PR #122 is open and draft on `fix/results-csv-formula-guard-20261119`; head before this note: `c2eba1559382aa3dbbbcf11f6a12020a8c7fcb2d`.
- GitHub compare main → draft: 29 ahead, 13 behind. No changed-path overlap with the three Studio files identified in the previous review; semantic integration is **not** proven.
- Four PR-triggered GitHub Actions workflows for the head above completed successfully. This is build/check evidence, **not** live functional evidence.
- `MockResultCardDesigner.tsx` uses local React state, synthetic marks, a DRAFT/NOT ISSUED watermark, and no persistence or issuance.
- `MockResultInbox.tsx` filters synthetic records for demo-self, issued status, valid date/revision, and unique IDs. This filtering is explicitly **not** an authorization boundary.

## Proposed ownership and navigation boundary
1. Main Visual Website Studio owns page navigation, component registry, draft/publish controls, and website-wide responsive behavior. Results must not replace or modify those shared contracts in this PR.
2. Results owns its *mock* designer and inbox view. A future adapter may register a **preview-only** entry with Studio, after the Studio owner reviews route IDs, permission model, fallback state and responsive behavior.
3. Never infer real authorization from client role labels or demo-self filtering. Future result inbox/read/download/print endpoints must verify authenticated student ownership, issued state, latest non-revoked revision, and audit permissions server-side.
4. No route or UI action may send a result to another account or expose a signed storage URL until backend RLS/RPC, private storage, audit, and recovery are separately verified.
5. Draft preview, publish, print, download, and delivery are distinct actions. Mock previews must retain DRAFT/NOT ISSUED labeling and never appear as officially issued result cards.
6. Teacher role and Student/Exam interfaces are **proposals only**. Do not modify teacher, student/exam, credentials, active Studio data or ADVANCE Studio source.

## Review-only acceptance matrix
| Scenario | Expected behavior | Gate |
| --- | --- | --- |
| Studio navigation opens mock result designer | Design-only UI, synthetic fields and watermark | Browser mock evidence pending |
| Studio navigation opens mock inbox | Only synthetic eligible entries visible; no API calls | Browser mock evidence pending |
| Responsive mobile/tablet/desktop | No clipped inputs, horizontal overflow or hidden preview disclaimer | Browser QA pending |
| Unauthenticated visitor requests real result | Denied by backend, not by client filter alone | Backend unavailable / not tested |
| Revoked or foreign result requested | Denied even with a guessed ID | Backend unavailable / not tested |
| Admin publishes a result | Requires separate server-side authorization and audit | Explicit owner approval required |
| Print/download/share | Disabled for synthetic mock; future server-issued assets only | Backend unavailable / not tested |

## Blocking gates and next action
- Inventory actual Preview and Production RPC signatures, grants, RLS and private storage using read-only metadata; historical migration mentions are insufficient proof.
- Verify recovery evidence and obtain separate owner approval **before** any DB write, migration, merge, publishing, deployment or real result delivery.
- Recheck current main/PR head immediately before integration. Review route/component registry ownership with the Main Visual Studio maintainer and gather mock browser evidence, without changing shared files.

No production or Preview deployment, SQL execution, real student data, merge, DNS change, or cross-user send occurred in this documentation task.
