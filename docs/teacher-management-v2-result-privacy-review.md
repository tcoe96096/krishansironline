# Result-summary privacy revision — REVIEW ONLY, excluded from Core Beta

No SQL was executed. Preview migration remains held; analytics remain disabled.
The historical source `77c6e71` exposed a count and exact average for a single
submitted attempt. The captured local review demonstrated count 1 / average 87
with synthetic data. That historical result is not validation of this revision.

## Proposed policy

1. The server defines exactly one canonical cohort per test. Only Super Admin may
   freeze it after explicit closure confirmation, an unpublished test, no active
   attempts and a recorded reason. Teachers cannot select members, dates, attempts,
   schools, subsets, exclusions or arbitrary filters.
2. A student contributes once, using the earliest valid submitted attempt. At least
   **5 distinct students** are required. Zero through four all produce the same
   suppressed result, with no average, score distribution or exact count.
3. Freeze once, then never recalculate. New submissions, grade corrections,
   deletions and repeated requests cannot produce a different mean for that test.
   Suppressed cohorts also remain suppressed after later submissions. There is no
   re-release/reset endpoint, and released test IDs cannot be reused for a second
   cohort. Private append-only rows enforce this invariant.
4. Every read requires a fresh approved Teacher profile and active `result.review`
   assignment for the exact class and subject, plus the server analytics flag.
   Role names or frontend flags never authorize a read. A re-labeled test does not
   move a frozen report to a new class/subject. No alternate cohort/totals/roll-up
   endpoint is provided that could be subtracted from the canonical cohort.
5. For eligible cohorts, return a **20-percentage-point average band**, not an exact
   mean: `0-<20`, `20-<40`, `40-<60`, `60-<80`, `80-100`. This is deliberately
   stricter than merely hiding exact averages below five. There are no exact
   contributor/attempt counts, student IDs, attempt IDs, minima/maxima or raw marks
   in the reader output or release storage. Release audit stores only actor/test/
   reason. Repeated queries return the same stored band, so request averaging cannot
   recover precision.

These controls address caller-selected overlapping cohorts, retake inflation,
threshold crossing and temporal differencing. They are **not a differential-privacy
guarantee** against arbitrary external knowledge, colluding privileged operators,
or unrelated authorized student-result APIs. No claim of universal inference
prevention is made. Privileged offline changes and any proposed re-release or
cross-test roll-up require another privacy review.

## API difference

Old: `teacher_v2_result_summary(class,subject)` returned `test_id`, exact
`submitted_count`, exact `average_percentage`, recomputed from live attempts.

Proposed: same two scope arguments, but returns only `test_id`, `availability`
(`not_released`, `suppressed`, `available`), and `average_band` (NULL unless eligible).
Dropping/recreating the old signature is explicitly required to change the return
shape. It is review-only and not included in the core migration. Client formatting
rejects historical raw-score responses; it cannot display their exact averages.

The integration proposal no longer defines the unsafe raw RPC. The basic feature
flag proposal revokes execution on any older optional analytics endpoint if one
exists. Core Beta does not install this new snapshot module and keeps analytics
off in browser and server.

## Tests and outstanding acceptance

`tests/teacherResultPrivacy.test.ts` contains positive/negative non-SQL reference
and API-contract tests: distinct-student thresholds, duplicate/invalid attempts,
permutation stability, late arrivals/score changes/deletions, attempted overlapping
subsets/date filters, scope and revocation denial, re-labeling, response shape and
historical-average suppression. Static SQL checks verify the corresponding
server-side gates and immutable storage. These tests do not execute the SQL.

The new SQL is syntax-parsed only. Runtime database/role/transaction/concurrency
acceptance remains unexecuted under the hold. Before any later analytics launch:
review the band precision and frozen-cohort lifecycle; execute real SQL acceptance
with 0/1/4/5 students, many retakes, wrong roles/scopes, concurrent freeze calls,
post-freeze data changes, revoked assignments, metadata moves and direct private
storage mutation attempts; verify no exact/identifying aggregates in responses.
Analytics is not required for the fastest Core Beta release.
