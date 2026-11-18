# Teacher v2 — Preview activation checklist (18 Nov 2026)

**Scope:** isolated planning branch; no migration executed, no live deployment, no PR #109 changes. Existing class-10 teacher grants remain untouched. Legacy teacher subject backfill is deferred, not implicitly approved.

## Verified Preview baseline
- Project: `zgpkmfqioqvincmgyfpi` (`krishan-sir-lms-preview`), ACTIVE_HEALTHY.
- Two active legacy teacher grants, class 10.
- `teacher_profiles`, `teacher_assignments`, `teacher_qualifications` not installed.
- `public.user_roles` has effective TRUNCATE privilege for `anon` and `authenticated`; fix requires controlled, separately verified recovery and privilege review.
- No verified managed backup or successful disposable restore of this Preview project.
- The main branch contains merged code-only Teacher Core Beta (#111), with feature flag default OFF.
- Draft PR #109 remains excluded.

## Execution gates (not completed)
1. Confirm exact Preview project and current schema/policy/grant fingerprints.
2. Verify actual managed backup timestamp, restore access, retention, and a disposable-target restore rehearsal. Do not restore over Preview.
3. Independently review minimal TRUNCATE revocation for `public.user_roles`; inspect effective inherited privileges and dependent RPCs. Do not run TRUNCATE.
4. Prepare additive, review-only v2 schema and lifecycle RPC bundle. No legacy enrollment/grant or study-material policy modifications in initial schema phase. Keep resume upload, AI and analytics disabled.
5. Inspect SQL functions, SECURITY DEFINER authorization, grants, RLS and feature gates. Test migration and rollback on recoverable isolated target.
6. Run authenticated positive/negative tests for teacher, admin, super admin and anonymous roles, including cross-account, cross-subject, suspension and employee ID uniqueness. Verify real Google OAuth.
7. Only after gates pass, seek explicit separate approval for Preview SQL and feature activation. Production SQL, deployment and merge require separate owner decisions.

**STOP conditions:** missing backup/restore evidence, privilege escalation, role/RLS denial failure, schema drift, unreviewed policy replacement, or failed OAuth/CI. Never bypass by widening privileges.
