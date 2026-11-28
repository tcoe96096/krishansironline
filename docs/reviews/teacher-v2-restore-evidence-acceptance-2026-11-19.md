# Teacher v2 recovery evidence gate — REVIEW ONLY (2026-11-19)

Status: **NOT VERIFIED / NO-GO**. This is an evidence specification, not proof of a restore or authorization to run one.

## Evidence required before any Preview mutation
1. Identify the exact Preview project `zgpkmfqioqvincmgyfpi`, backup source, snapshot timestamp, retention, checksum, and independently accessible recovery location. A matching hash between two Windows drive copies proves byte equality only, not restoreability.
2. Restore into a **separate disposable isolated database**, never Preview or Production. Record restore command/tool version, UTC start/end, exit status, full unredacted logs stored in restricted evidence storage, and sanitized summary in the PR. Do not publish credentials or private records.
3. Verify schema objects, row counts by table, constraints, indexes, RLS/policies, functions, triggers, storage metadata, and roles/grants against the source inventory. Document any unsupported provider-managed objects and a recovery plan for private Storage object bytes, OAuth settings and secrets.
4. Execute a smoke read and a controlled write/rollback in the isolated restore using synthetic records. Verify application and identity/role paths, and measure recovery time; record failures and deviations explicitly.
5. Independent reviewer confirms evidence is complete and reproducible. Only then request **distinct explicit owner authorization** for a specified Preview operation; a successful isolated restore alone does not authorize SQL, REVOKE, flags, merge or deployment.

## Preview authenticated acceptance (separate gate)
- Confirm the exact candidate migration order and final effective function EXECUTE grants; compare direct/inherited `user_roles` TRUNCATE privileges before and after a separately approved remediation.
- Use real test identities: unauthenticated, applicant A, applicant B, ordinary admin, Super Admin reviewer, and independent verifier. Test both allowed actions and denied cross-user access, self-approval, forged identity evidence, stale revision, and unauthorized photo/resume reads.
- Record HTTP/RPC outcomes, audit rows and denied operations with redacted identifiers. An SQL catalog inspection or static CI test is **not** an authenticated runtime test.
- Require a new owner decision after Preview passes and Production recoverability is independently demonstrated.

## Current evidence register
| Gate | Evidence | Status |
| --- | --- | --- |
| Backup inventory and copy hashes | Local Windows copies reported; inaccessible from cloud runner | Unverified |
| Complete isolated restore and reconciliation | No independently verified successful restore evidence | **BLOCKED** |
| Preview teacher RPC installation | `save_application`, `review`, `snapshot` reported absent | **BLOCKED** |
| `user_roles` effective TRUNCATE | anon/authenticated previously observed true | **BLOCKED** |
| Authenticated positive and negative tests | No verified runtime test results | **BLOCKED** |
| Distinct owner approval | Not requested for a specific high-impact operation | **NOT GRANTED** |

**Hard stop:** no Preview/Production mutation, migration, revoke, data deletion, merge, deploy, publish, DNS change, or feature-flag activation under this document.
