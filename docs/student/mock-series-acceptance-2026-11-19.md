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
2. At head `0e173983daa3db9076433c2eabd8530d1b2b4993`, GitHub Actions reports Hosting compliance **success**; website build, Preview build, and isolated Teacher build **failure**. Previous run identified `@supabase/auth-js@2.119.2` npm E404 during install; confirm current logs before concluding the same root cause for all jobs.
3. Shared dependency/lockfile repairs belong to a coordinated integration proposal; do not edit shared manifests from this student-only branch.
4. No merge, deployment, Preview/Production database access or student account changes without separate owner approval and recovery/authenticated safety gates.

This matrix documents intended tests; it is **not** evidence that browser tests or authenticated security tests passed.
