# Teacher Management v2 — Backend Merge Readiness (18 November 2026)

**Status: NO-GO for backend activation / migrations / production release.**
This is a **code-only, read-only readiness record** associated with PR #114, not approval to merge or apply any SQL. PR #109 remains **strictly read-only** and PR #110 remains separate.

## Verified source and deployment distinction

- UI PR [#116](https://github.com/tcoe96096/krishansironline/pull/116) **merged** into `main` at `fe2853b990edcd79acb732c82409049c5f5dc407`. Its isolated Teacher Registration → Login → Dashboard code has synthetic browser/static tests, but the photo remains a **browser-local preview** (not stored, not persistent across actual OAuth/refresh).
- PR [#114](https://github.com/tcoe96096/krishansironline/pull/114) is still open; its SQL diagnostics and role/RPC grants are **REVIEW ONLY**, not executed. Green static/mock CI is **not** a real Preview authorization or database acceptance result.
- `krishansir.online` is hosted on **GitHub Pages**; Cloudflare is **DNS only**. Never include Cloudflare Workers/Pages as a deployment destination.
- No conclusion about the current publicly deployed website or published Unified Preview is inferred from source-code merge alone. Confirm deployment artifacts and live URLs independently.

## Read-only Supabase catalog snapshot (both projects checked 18 November 2026)

| Catalog-only check | Preview `zgpkmfqioqvincmgyfpi` | Production `vsqwlkqqsxcehvdsdbna` |
| --- | --- | --- |
| Project health | ACTIVE_HEALTHY | ACTIVE_HEALTHY |
| `teacher_v2_save_application(jsonb,jsonb,jsonb,text,boolean,integer)` | **Absent** | **Absent** |
| `teacher_v2_review(uuid,integer,text,text,boolean,jsonb)` | **Absent** | **Absent** |
| `teacher_v2_snapshot(uuid)` | **Absent** | Not checked |
| Effective `TRUNCATE` on `public.user_roles` for `anon` | **True** | False |
| Effective `TRUNCATE` on `public.user_roles` for `authenticated` | **True** | False |
| Installed Teacher v2 migration in reported migration history | **None** | **None** |
| Preview's legacy `teacher_enrollment_requests` | Present; **not** a substitute for the v2 RPC | Not assessed |

Catalog reads do **not** prove backup restorability, OAuth acceptance, policy enforcement, or actual operational access. Source evidence for Preview's direct role grants is in `teacher-v2-preview-truncate-grant-evidence-2026-11-18.md`. **No SQL changes were performed during this audit.**

## Backend code-merge and activation sequence (distinct decisions)

1. **Consolidate source branches:** treat #116 as **already merged**; do not merge it twice. Reconcile PR #114 with current `main` and its optional applicant-reason changes. Do not modify PR #109 or import its broad unrelated changes. Keep separate PR #110 isolated.
2. **Freeze a candidate release manifest:** record the exact GitHub commit, SQL filenames, content hashes and dependency/order manifest. Review schema ownership, defaults, triggers, function overloads/search paths, `SECURITY DEFINER` privileges, grants and foreign keys. Exclude `teacher_management_v2_integration_REVIEW_ONLY.sql` from registration-only Core Beta because it changes study-material authorization.
3. **Recovery gate (blocking):** obtain owner-visible managed **Preview backup** identifier/time and a verifiably **successful disposable-target restore** (plus rollback/return-to-service steps). The same hash of a local Windows dump and archive does **not** prove a working restore. Cloud automation cannot attest to files on `D:\KSOL-BACKEND` or `E:\KSOL-SAFETY-BACKUP`. Do not restore over live Preview.
4. **Preview privilege gate (blocking):** review direct and inherited `user_roles` rights and prepare a separately authorized minimal `TRUNCATE` revocation; confirm no public/anon/authenticated escalation and no new grants. **Do not execute** before step 3 and independent explicit approval. RLS does not block TRUNCATE.
5. **Review-only SQL installation order:** `teacher_management_v2_schema_REVIEW_ONLY.sql` → `teacher_management_v2_beta_flags_REVIEW_ONLY.sql` → `teacher_management_v2_profile_rpc_REVIEW_ONLY.sql` → `teacher_management_v2_functions_REVIEW_ONLY.sql` → `teacher_management_v2_lifecycle_REVIEW_ONLY.sql` → `teacher_v2_independent_verification_REVIEW_ONLY.sql` → `teacher_v2_verification_writer_REVIEW_ONLY.sql` → `teacher_v2_review_independent_evidence_OVERRIDE_REVIEW_ONLY.sql` → `teacher_v2_final_rpc_grants_REVIEW_ONLY.sql`. This order is a **review candidate**, not an executable plan until all signatures, data migrations, policies, owner functions and rollback dependencies are verified. The final grants file is needed because review/verification overrides revoke browser RPC transport access. Never grant review rights based only on the `authenticated` role; independent server-side Super Admin and no-self-review checks are required.
6. **Authentication and role matrix:** after a separately approved Preview-only installation with flags initially **OFF**, test real authenticated anonymous/applicant/teacher/ordinary-admin/Super-Admin identities; same-user profile access, cross-user denials, stale revision, rejected/suspended access, independent verification evidence, concurrency, unique employee IDs and multi-class/multi-subject work scopes. Include positive and negative RLS/privilege tests and live Google OAuth. Static tests and synthetic browser sessions do not qualify.
7. **Photo and resume scope:** the UI collects a local registration photo but permanent Login → Dashboard persistence is **NOT IMPLEMENTED**. Plan private Storage buckets, server-authenticated ownership, file validation, RLS/read access, deletion/retention, and checks that a teacher can see only their own photo. Resume upload also requires private storage/access checks. Neither is enabled by merging UI code.
8. **Post-check release approvals:** obtain an explicit, **separate** owner decision for each Preview SQL privilege change, Preview migration, Preview feature activation, backend source merge, and eventual Production release. Production needs its **own** restore proof and authenticated tests; do not reuse Preview approval as Production authorization.

## STOP / GO result

**STOP:** Missing working Preview restore evidence, absent v2 RPCs, unsafe Preview `user_roles` TRUNCATE permissions and no authenticated Preview acceptance. Any one blocks activation and any production database change. Other independent code-only CI/tests/docs may continue.

**GO for preparation only:** continue isolated source review, conflict resolution, preflight scripts, automated static/mock tests and repeatable audit evidence. Keep Core Beta feature flag **OFF**.

**Who can approve release:** the owner must explicitly authorize high-impact operations after evidence is presented. This record and the user's general “continue” or “prepare for merge” are **not** approval to mutate either database, merge, deploy or publish.
