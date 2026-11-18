# Teacher v2 — reuse existing reviewed migration bundle

Verified against GitHub `main` on 2026-11-18; **no SQL executed**.

Existing review-only files:
1. `docs/proposed-migrations/teacher_management_v2_schema_REVIEW_ONLY.sql` — proposed additive teacher_profiles, qualifications, assignments and other supporting objects.
2. `docs/proposed-migrations/teacher_management_v2_beta_flags_REVIEW_ONLY.sql` — server-side feature flags default OFF.
3. `docs/proposed-migrations/teacher_management_v2_profile_rpc_REVIEW_ONLY.sql` — owner-bound profile editing.
4. `docs/proposed-migrations/teacher_management_v2_functions_REVIEW_ONLY.sql` — employee ID and assignment functions.
5. `docs/proposed-migrations/teacher_management_v2_lifecycle_REVIEW_ONLY.sql` — registration, review and suspension lifecycle.
6. `docs/proposed-migrations/teacher_management_v2_integration_REVIEW_ONLY.sql` — **separate approval required**; replaces existing study-material policies, not part of initial registration rollout.

**Actionable decision:** Do not create a competing schema migration. Review these files as one versioned bundle, compare with current Preview schema, then run against an isolated recoverable target. Recommended review sequence: schema → beta_flags → profile_rpc → functions → lifecycle. Do not run integration in the initial phase.

**Known security gates:** user_roles TRUNCATE privileges remain exposed in Preview; managed backup and disposable restore proof missing; real OAuth and authenticated RLS denial tests missing. Existing class-10 legacy grants remain untouched. PR #109 is read-only and independent. Production unchanged.

**Do not infer:** presence in GitHub is not presence in Supabase. A passed mocked UI test is not a passed authenticated RLS test. Review-only SQL is not authorization to execute.
