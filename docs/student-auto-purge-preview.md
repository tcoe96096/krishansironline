# Student Automatic Purge — Preview package

**Scope:** isolated Preview Supabase project `zgpkmfqioqvincmgyfpi` only. Production is out of scope.

## Two systems

1. **Purge Worker** — `supabase/functions/student-auto-purge/index.ts`. It requires a verified Supabase `service_role` JWT and two independent environment gates:
   - `STUDENT_PURGE_EXECUTION_ENABLED=true`
   - `STUDENT_PURGE_CONFIRMATION=OWNER_APPROVED_PREVIEW_ONLY`

   If either is missing, it returns `423 prepared_but_disabled` and does not claim or delete anything.
2. **Scheduler** — Supabase-native `pg_cron + pg_net + Vault`. The extensions are installed in Preview by the migration, but **no cron job is created**. The separate activation SQL is intentionally not run in this package.

## Eligibility / hard stops

A record must be soft-deleted, past its server-generated 30-day deadline, not restored, not previously completed, and have a valid claim lease. The database excludes:
- blank, numeric 6–15 digit, email-like, and placeholder names;
- missing class, roll number or school;
- any user with a row in `user_roles`;
- any user owning a `visual_studio_drafts` row.

The worker rechecks eligibility immediately before calling the Auth Admin API. A 10-minute claim lease serializes overlapping jobs and blocks Restore only while the worker is processing; an expired lease permits a later retry/restore. Retries are idempotent: if Auth deletion succeeded but the response was lost, a later run detects the Auth user is already absent and completes the retained-profile cleanup.

## What is retained

The Auth login identity is the only identity permanently removed. The named academic profile, stable UUID, class, roll, school, student name, attempts, marks and results remain. Only the six approved geographic fields (`country`, `state`, `district`, `area_type`, `locality_name`, `pin_code`) are cleared after successful Auth deletion. Operational events live in the private schema and contain no geographic fields or free-text reasons.

## Preview activation checklist (not performed)

1. Create a synthetic Preview-only student Auth account and profile. Never use a real student.
2. Mark only that synthetic profile as deleted with a deadline in the past using a controlled test fixture.
3. Verify the claim and authorization RPCs, role/draft/name hard stops, restore lease behavior, retry behavior, and retained result joins.
4. Configure the Edge Function's two execution-gate secrets for Preview only.
5. Store the Preview project URL and Preview service-role JWT in Supabase Vault using the Dashboard secret UI; never commit either value to GitHub or place them in migration SQL.
6. Review the scheduler SQL in `supabase/ops/student-auto-purge-scheduler-activate.sql`. It schedules 02:30 IST daily (21:00 UTC) and invokes only the Preview function. Do not run it until synthetic tests pass.
7. After activation, verify one dry-run/synthetic cycle and inspect the private operational event log. Only then consider a separate explicit authorization to enable real purge.

## Scheduler activation SQL

The activation script expects Vault secrets named:
- `student_purge_project_url`
- `student_purge_service_role_jwt`

It is deliberately a separate operations file. Do not execute it as part of migration deployment. The scheduler must never be pointed at Production from this Preview package.

## Known release gates

- Edge Function deployment and successful TypeScript/build checks do not prove Auth deletion safety.
- This package is prepared for owner review; automatic execution remains disabled.
- No student Auth identity has been deleted by this package.
- No cron job is active.
- Production site and Production Supabase remain unchanged.
