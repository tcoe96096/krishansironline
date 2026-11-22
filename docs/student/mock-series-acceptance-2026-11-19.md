# Student Mock Test Series — draft acceptance matrix (2026-11-19)

Scope: `src/components/StudentMockTestSeries.tsx` on Draft PR #120 only. No student records, SQL, deployment, or shared module changes.

## Synthetic acceptance scenarios (not yet executed)

| Case | Fixture | Expected behavior |
| --- | --- | --- |
| No class selected | `classLevel` undefined | Prompt to choose a class; no series query and no launch link |
| Class switch in flight | Response A arrives after class B request | Ignore A; render only B |
| Unpublished/mismatched ID | Series references IDs absent from published catalogue | Do not show or count IDs; no link when none remain |
| Duplicate/blank IDs | `[' A ', 'A', '', null]` | Count A once, ignore invalid entries |
| Completed attempt | Published A has submitted attempt | Completion denominator counts A once |
| Active attempt | Published A in progress with future expiry | Resume A ahead of next pending test |
| Expired attempt | In progress with past/invalid expiry | Do not offer resume; server still decides launch eligibility |
| No available tests | All series IDs unavailable | Disabled empty state with no test URL |
| Hindi/English | Localized labels and screen reader | Status and launch semantics understandable in both languages |
| Mobile | 320px–768px viewport | No overflow or inaccessible controls |
| Network failure | Series/history/catalogue request rejects | Clear error and retry; no stale history displayed |

## Verification gate

1. CI must install dependencies before lint/build or browser checks can be credited.
2. At head `716fd790b45b941c243e0d7861b2a61cd8531549`, GitHub Actions reports **success** for all four completed workflows: Validate website build, Teacher Core Beta isolated checks, Preview build (no production deploy), and Hosting compliance. This supersedes the earlier `0e173983` dependency-install failures for this head only. CI build success does **not** establish browser, mobile, accessibility, or authenticated exam-flow acceptance.
3. Shared dependency/lockfile repairs belong to a coordinated integration proposal; do not edit shared manifests from this student-only branch.
4. No merge, deployment, Preview/Production database access or student account changes without separate owner approval and recovery/authenticated safety gates.

This matrix documents intended tests; it is **not** evidence that browser tests or authenticated security tests passed.

## Reproducible fixture and security test protocol (draft, not executed)

Use **synthetic users only** and mock `mock_test_series`, `getPublishedTests`, and `getMyTestAttempts` at the component boundary. Record the exact branch SHA, test command, browser version, viewport, fixture name and assertion output before checking any scenario above. Never use Production credentials or actual student identifiers.

1. **Cross-class race:** mount class A, hold its three API responses, switch to class B, resolve B with published test B1, then resolve A. Assert B1 remains visible and no A title, test ID or launch URL appears at any post-switch render.
2. **Malformed catalogue:** return `null`, non-array objects, duplicate IDs, blank IDs and wrong-class published tests separately. Assert no crash, no wrong-class launch, and progress denominator equals distinct valid published IDs.
3. **Attempt expiry:** freeze the clock; inject submitted, active future-expiry, expired, missing-expiry and invalid-date attempts. Assert only future-expiry in-progress attempts get a Resume label; verify server-side eligibility independently before release.
4. **Accessibility/mobile:** run Hindi and English text assertions at 320, 375 and 768 CSS pixels, keyboard-focus Refresh and launch, inspect progressbar accessible value and check horizontal overflow.
5. **Network failure/retry:** reject each of the three requests independently; assert alert, no stale rows or links, then retry with valid fixture and assert recovery.

**Release blocker:** A successful build does not satisfy these assertions. Authenticated authorization, 30-day recovery and server grading require separate student-owned integration tests and verified recovery evidence; no Preview/Production mutations or deployment are authorized by this document.

## CI evidence reconciliation — 22 November 2026 (draft only)

- Exact pre-update head: `33db522f9c345f7b0fe726132af124873dc38353`. Five completed, successful pull-request checks were verified: Hosting compliance - GitHub Pages only; Student Mock Series Source Contracts; Preview build (no production deploy); Validate website build; Teacher Core Beta isolated checks - no deployment. The shared Teacher CI check does not authorize changes to Teacher source.
- Student runner: `node tests/student/run-mock-series-contracts.mjs` executes four static source-contract suites. Green CI does **not** establish real Chromium runtime, 320px mobile layout, authenticated student access, server grading or expiry enforcement.
- Next acceptance: run a fully intercepted synthetic browser harness with held class-A responses after class-B navigation, malformed/duplicate published IDs, expired attempts, retry, Hindi/English accessible labels and 320/375/768px overflow checks. Capture exact SHA, browser version, viewport, fixtures and logs; do not connect to real student accounts.
- Authenticated ownership, cross-student RLS, answer-key isolation and server-authoritative grading remain independent **NO-GO** gates until verified recovery, safe JWT testing and separate owner approval. Do not mutate Preview or Production.
- At review, `main` was `a464cd4ae7b0c892220687feba4a49f9a19c6652`; draft branch was 38 ahead / 13 behind. Recheck integration conflicts and overlapping student PRs before proposing any merge.
