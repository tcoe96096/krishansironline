# KSOL Preview Backup — Local Restore Failure Diagnosis (2026-11-17)

**State: HOLD, no Supabase SQL writes.** Owner wants Teacher v2 SQL activated when safe. The local backup `C:\Users\lenovo\Downloads\ksol-preview-backup.dump` exists according to prior archive diagnostics, but complete successful recovery has **not** been verified.

## Evidence from user's local diagnostics

- Archive custom-format TOC was readable with **860 entries**; original archive was created **2026-11-17 12:23:32**, dumped from **PostgreSQL 17.11**, using `pg_dump 18.7`.
- TOC contains the real `FUNCTION auth uid()` entry, listed as `406; 1255 16538 FUNCTION auth uid() ...`.
- A first restore failed at Supabase-only extension `pg_net` on standalone Windows PostgreSQL.
- A `public/private` scoped restore initially failed because schema `private` was absent.
- The later dependency-aware local restore did create `private`, `auth`, `extensions` schema shells, but stopped at `public.result_staff_grants`: `function auth.uid() does not exist`. The backed-up `auth.uid()` was excluded by the `public/private` schema filter.
- Previous restore summary had exit code **1** and a subsequent local PostgreSQL authentication error; a readable archive is not a successful restore.

## New Windows diagnostic kit available in the conversation

`KSOL-Local-Recovery-Check.zip` contains `KSOL-Local-Recovery-Check.cmd` and `KSOL-Local-Recovery-Check.ps1`. It uses only `127.0.0.1:5432`, the local backup and the installed PostgreSQL 18 tools. It performs archive TOC + SHA-256 verification, creates a **unique new local database**, restores the original `auth.uid()` function from its selected TOC entry (no fabricated stub), and **then** attempts the limited `public/private` application restore. It produces `summary.txt`, `restore-log.txt`, and the archive TOC in `%USERPROFILE%\Downloads\ksol-restore-check\<run-id>`.

The test uses the **local** PostgreSQL password, not a Supabase credential; does not store it in the output report, never drops a database, and does not touch cloud Supabase. It leaves any new local test DB in place for investigation. It may still fail on other Supabase-specific dependencies, and that is useful diagnostic evidence.

**WARNING:** Even `LIMITED_APP_RESTORE=PASS` must **not** be treated as full Supabase recovery verification. It does not restore/validate managed auth users, OAuth, Storage, roles, triggers, extensions, real RLS or end-to-end application recovery. A current Preview-specific full recovery test is required separately.

## Next gating actions

1. Examine kit `summary.txt` and first error in `restore-log.txt`; fix root cause without altering existing databases.
2. Use an isolated Supabase-compatible restore environment to prove current Preview's full database + application recovery (including auth, RLS and cross-schema dependencies).
3. Recheck current Preview `user_roles` dangerous `TRUNCATE/TRIGGER/REFERENCES` privileges; independent review of `teacher_management_v2_role_grants_hardening_REVIEW_ONLY.sql`.
4. Obtain a distinct owner Preview release authorization after recovery and security verification. Keep all SQL scripts review-only and feature flags OFF until then.

**Production `vsqwlkqqsxcehvdsdbna` and Preview `zgpkmfqioqvincmgyfpi` remain untouched by this diagnostic.**
