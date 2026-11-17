# KSOL Teacher Core Beta — isolated code review (2026-11-17)
Status: CODE-ONLY REVIEW. NOT DEPLOYED. NOT DATABASE-ACTIVATED. DO NOT MERGE UNTIL REQUIRED CI AND RELEASE GATES PASS.

Source: draft PR #109 at a789634da8e734a5a87ff4590e9f4c1420025fc9. Base main: 0e78ec8dd9d23ac179519ed6f9f0de33f9a6feb4.
This dedicated Teacher Beta portal defaults to OFF (VITE_TEACHER_BETA_ENABLED unset).
The release excludes Resume Upload, Resume AI, private Storage activation, analytics UI, unrelated website changes and auto-applied migrations.

Verified READ-ONLY Preview findings (zgpkmfqioqvincmgyfpi):
- Project ACTIVE_HEALTHY; legacy teacher_enrollment_requests and teacher_enrollment_audit tables exist with RLS.
- Teacher v2 profiles, assignments and RPCs not installed; no teacher v2 core migration in history.
- The security advisor reported SECURITY DEFINER access warnings requiring targeted authorization review.
- Managed backups/PITR or a successful isolated restore have NOT been verified.
- Both legacy class-10 teachers' exact subject mappings, real OAuth and authenticated role/RLS tests are unverified.

Before release: test recovery, review all proposed SQL/grants, run real Preview role/OAuth acceptance, check CI and main website regression, verify there is no implicit deployment trigger, and obtain deliberate owner release decision. All SQL is REVIEW_ONLY; do not execute automatically.
