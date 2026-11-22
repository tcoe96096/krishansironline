# KSOL Recovery Automation — Phase 1: safely automated local inventory

**Status:** Code-only automation. NO cloud database writes, deployment, live merge, backup exports, actual restore, or release approval.

## Why work has been blocked

Current local scoped restore evidence stopped with `auth.users` missing from a standalone PostgreSQL environment. Earlier runs also encountered missing Supabase-specific functions/extensions. A valid archive and a successful CI build do **not** prove full recovery for the existing Supabase auth/storage ecosystem. Do not replace real `auth.users` with a fake stub or treat a partial public-schema restore as success.

## What is automated after one-time Windows setup

- `scripts/recovery/inspect-local-backups.mjs` inspects the latest `.dump/.backup/.pgdump` inside `D:\KSOL-BACKEND\01-Database-Backup` without changing the archive, checks PostgreSQL `PGDMP` signature, SHA-256, `pg_restore --list` and filesystem modification age <=36 hours. File age is only a hint, not independently verified source creation time.
- A private report is written to `D:\KSOL-BACKEND\07-Recovery-Reports\latest-recovery-inventory.json`. It contains archive filename and metadata/digest, not backup bytes, passwords, student or teacher records. Keep it private.
- `scripts/recovery/windows/Install-KSOL-RecoveryCheck.ps1` registers a 19:30 daily Windows Scheduled Task for the current signed-in user. The PC must be on and signed in; no database or Windows password is stored.
- `.github/workflows/ksol-recovery-readiness.yml` runs focused **synthetic code tests** and, only after a separate merge to the default branch, daily advisory checks. GitHub Actions **cannot read the owner's D: drive** and will always report full restore **NOT VERIFIED** without independent proof. Never take a green code check as release approval.

## One-time owner-side setup on Windows

1. Keep the repository's `scripts/recovery` directory in a trusted checkout. Install Node.js 22+ and PostgreSQL `pg_restore` 17/18 CLI and ensure both are in PATH.
2. Verify `D:\KSOL-BACKEND\01-Database-Backup` contains the private database archive and restrict directory access. Do **not** publish backup files, credentials, restore logs, JWTs or personal records in GitHub or this chat.
3. In PowerShell from the repository root: `node scripts/recovery/inspect-local-backups.mjs --root 'D:\KSOL-BACKEND'`. Review the local report.
4. Run the trusted installer in PowerShell: `& .\scripts\recovery\windows\Install-KSOL-RecoveryCheck.ps1`. Windows script execution policy must permit this trusted local script; do not bypass organization security policy. Some configurations require Task Scheduler registration permission.
5. Inspect the `KSOL-Recovery-Local-Inventory` task and select **Run** once. Confirm the private report is updated. A switched-off PC cannot perform this scheduled check.

## Remaining requirements for genuine automatic recovery

**Daily database backup creation:** needs separately approved, configured backup credentials with minimal read access, encrypted local/offsite storage and retention rules. This phase checks already-existing private backups; it does not create them. Supabase Free-tier is **not** assumed to have automatic managed backups. See the current Supabase project Backups page before choosing managed backups vs secure CLI exports.

**Full isolated restore test:** needs a disposable *Supabase-compatible* environment with real `auth`, `storage`, extensions, roles, constraints and RLS; plus source/restore data reconciliation and authenticated application smoke tests. Previous standalone PostgreSQL partial restores failed at cross-schema `auth.users` dependencies. A real restore may be billable and is not attempted here.

**Independent proof:** capture all required source archive hashes, full restoration exit codes, auth/storage object bytes, RLS/roles, application results, negative cross-user access and logs. The existing teacher-only `scripts/teacher-restore-evidence-check.mjs` is not modified; it also never authorizes release merely from a structural JSON manifest.

**Production release stays separate:** no backup/restore report, CI test or scheduled check can authorize a migration, permission change or live merge. Require actual independent recovery proof and authenticated security validation.

## Privacy

The local tool never contacts Supabase, executes SQL, restores any DB, deletes files or uploads evidence. The GitHub Action never reads local data. Do not commit local reports, backup archives, secrets, database credentials or student/teacher identities.
