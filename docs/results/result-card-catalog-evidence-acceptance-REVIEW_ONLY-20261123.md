# Result Card — catalog evidence acceptance sheet (REVIEW ONLY)

Status: UNVERIFIED / NO-GO. This is a **blank evidence contract**, not a claim of database access, not SQL to execute, and not authorization to connect to Preview or Production. Never include JWTs, credentials, student identifiers, PDF keys, or object bytes in Git.

## Evidence provenance (separate row per environment)

| Field | Preview | Production |
|---|---|---|
| Source project alias (non-secret) | PENDING | PENDING |
| Read-only catalog collection UTC timestamp | PENDING | PENDING |
| Collector / independent reviewer | PENDING | PENDING |
| Sanitized catalog snapshot SHA-256 | PENDING | PENDING |
| Applied migration IDs and checksums | PENDING | PENDING |
| Evidence storage location (private, access-controlled) | PENDING | PENDING |
| Differences reviewed and signed off | NO | NO |

Do not infer Production from Preview or from checked-in migrations. Record PostgreSQL version and extension versions; schema/table/column names and types, nullability/defaults; PK/FK/UNIQUE/CHECK and ON DELETE actions; indexes; triggers; RLS enabled/forced flags and policies (USING/WITH CHECK); table/sequence/schema privileges; role inheritance; function signatures, SECURITY DEFINER owners, search_path and EXECUTE grants; storage bucket privacy and policies. Sanitize before review.

## Canonical identity decision (currently UNDECIDED)

For each environment independently, establish the verified relation and cardinality between `public.test_attempts.id`, any `result_record.id`, immutable result version, active `auth.users.id` recipient, and private PDF object manifest with content digest. A delivery-notice FK to an attempt does **not** prove result-record identity. Check duplicates, nullable keys, multi-attempt/multi-version records, inactive accounts and cascades. If any link is missing, ambiguous or contradictory: **deny release, read and delivery**. Do not assume an attempt UUID equals a result UUID.

## Decision gates

| Gate | Required evidence | Current |
|---|---|---|
| Schema equivalence | Both environment snapshots and reviewed diff | BLOCKED |
| Least privilege | Complete role/grant/RLS/definer matrix, no broad PUBLIC grants | BLOCKED |
| Atomicity | Verified lock order, unique idempotency key, canonical payload conflict, audit transaction | DESIGN ONLY |
| Storage boundary | Immutable version/digest binding, private ACL, revocation-aware delivery | DESIGN ONLY |
| Exact-head tests | Local synthetic test log + exact commit SHA green CI on verified free quota | NOT VERIFIED |
| Recovery | Fresh source-specific DB backup and successful disposable restore incl. roles/grants/auth/FKs and private PDF bytes | BLOCKED |
| Authenticated security | Distinct real JWT actors, cross-student denial, release/revoke concurrency, stale-version and audit denial | BLOCKED |
| Release | Independent security review + separate explicit owner approval | NOT GRANTED |

## Review sequencing

1. Read existing PR #129 and scoped proposals; do not duplicate its runtime changes or PR #122/#135 CSV work.
2. Obtain **authorized read-only** catalog evidence separately from Preview and Production, never from active Studio data.
3. Resolve canonical identity before selecting either comment-only SQL candidate; reconcile migrations and least-privilege role contract.
4. Run local synthetic tests and collect exact-head CI only within **verified free quota**; do not activate billable runners.
5. Verify independent recovery/restore and authenticated database/storage behavior only under separately approved safe conditions.
6. Security review; obtain distinct owner authorization before **any** SQL execution, DB write, merge, Preview/Production deployment, publish, delivery or DNS change.

**Mock != Production.** Node synthetic tests are not PostgreSQL RLS, JWT, storage, concurrency, or recovery evidence. Incremental budget strictly ₹0. No paid service, credentials, Student/Exam, Teacher v2, PR #109 or ADVANCE Studio changes.
