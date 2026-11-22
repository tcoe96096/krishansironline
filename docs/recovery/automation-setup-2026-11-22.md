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


## Phase 2 — automatically create verified LOCAL PostgreSQL exports (new, code-only)

**This is NOT activated on your PC or cloud database.** It requires one-time setup by the Windows owner and an encrypted backup volume. No production database mutation and no automatic production release are performed. Backup export reads private records; never send archives, password/config/DPAPI secret files, private logs, or restore contents to GitHub or ChatGPT.

### What is now implemented

- `scripts/recovery/create-verified-backup.mjs` runs PostgreSQL `pg_dump` in custom format against an explicitly selected **Preview** or **Production** project. It validates target-project identity, rejects ambiguous host/username combinations, checks `PGDMP` and `pg_restore --list`, calculates SHA-256 and records whether the TOC includes `auth.users`, `storage.objects`, `student_profiles` and `test_attempts`. The source is never modified.
- `scripts/recovery/windows/Initialize-KSOL-Backup.ps1` prompts locally for that project's database connection and password, stores only the password encrypted with Windows DPAPI for the current user and restricts the newly created private directories. It refuses unverified BitLocker volumes.
- `scripts/recovery/windows/Invoke-KSOL-DailyBackup.ps1` retrieves the same-user DPAPI secret, checks BitLocker again, temporarily passes credentials to the read-only export process, then clears them from the PowerShell process environment.
- `scripts/recovery/windows/Install-KSOL-DailyBackup.ps1` schedules that source's export with Task Scheduler. It requires the config to already exist, uses the signed-in Windows account, and never saves a Task Scheduler password.
- New archives are created in **`D:\KSOL-BACKEND\09-Automated-Backups`**, separate from historic `01-Database-Backup`. The existing daily inventory now looks in **both** folders.
- Reports are kept at `D:\KSOL-BACKEND\07-Recovery-Reports\last-preview-export.json` / `last-production-export.json`. They include digest and file metadata, never raw database rows or passwords.

### One-time setup on your Windows PC

Prerequisites: Windows PC running under your own account, Node.js 22+, official PostgreSQL `pg_dump` and `pg_restore` in PATH, your Supabase **database** connection details, sufficient free space, and a **BitLocker-protected** chosen backup volume. The scripts refuse unencrypted backup storage. If `D:` is not protected, use another encrypted drive. A cloud project cannot reach your Windows `D:` drive.

Run from a **trusted checkout** of this PR's updated files in PowerShell:

```powershell
# Preview source: prompts once for Preview DB host/user/password on your own PC.
& .\scripts\recovery\windows\Initialize-KSOL-Backup.ps1 -Source preview -BackupRoot 'D:\KSOL-BACKEND'

# Run one read-only export and verify that the local report says READABLE_EXPORT_ONLY.
& .\scripts\recovery\windows\Invoke-KSOL-DailyBackup.ps1 -Source preview -BackupRoot 'D:\KSOL-BACKEND'

# Schedule Preview export daily. The PC must be signed in and able to connect.
& .\scripts\recovery\windows\Install-KSOL-DailyBackup.ps1 -Source preview -BackupRoot 'D:\KSOL-BACKEND' -At '18:30'

# Keep the existing local archive inventory at 19:30 (one-time installation):
& .\scripts\recovery\windows\Install-KSOL-RecoveryCheck.ps1
```

For Production, configure it **separately**, never reuse Preview credentials or reports:
```powershell
& .\scripts\recovery\windows\Initialize-KSOL-Backup.ps1 -Source production -BackupRoot 'D:\KSOL-BACKEND'
& .\scripts\recovery\windows\Invoke-KSOL-DailyBackup.ps1 -Source production -BackupRoot 'D:\KSOL-BACKEND'
& .\scripts\recovery\windows\Install-KSOL-DailyBackup.ps1 -Source production -BackupRoot 'D:\KSOL-BACKEND' -At '18:45'
```

Each command will report an explicit error if prerequisites are absent. It does not delete any successful existing backup; failed partial exports are removed locally to avoid retaining unnecessary sensitive fragments. Do not add the password as a command argument or write it to GitHub Secrets.

### What remains *not* automated or verified

1. **A complete Supabase-compatible restore**, including cross-schema `auth.users`, grants, extensions, RLS, and account login; a simple local PostgreSQL database is not adequate. A downloaded physical backup and a `PGDMP` logical dump are different formats and require different restoration procedures. No restore has been performed by this pipeline.
2. **Storage object bytes** outside PostgreSQL, custom role passwords, OAuth and application configuration, cross-student negative auth checks and actual exam Login → Submit → Grade → Result. SQL backups alone do not include Storage object content.
3. **A second, encrypted, independent offsite copy.** Do not email raw dumps or upload to a public GitHub repo. Configure an approved private encrypted destination separately; there is no cloud-upload integration in this PR.
4. **Windows Task installation and first live export.** This chat does not have access to your Windows machine, so the scripts cannot be activated here.
5. **Production release** remains `NO_GO` until independent recovery evidence and authenticated safety tests plus a separate release decision. A source archive's readable TOC or green GitHub CI is never full recovery proof.

### Compatibility note

Supabase's `supabase db dump` command normally **excludes managed `auth` and `storage` schemas** and is not a standalone full recovery artifact. This Phase 2 exporter invokes `pg_dump` directly and explicitly checks that selected managed tables appear in the archive; insufficient permissions result in an incomplete/failing export rather than a false claim of recovery. See the Supabase database-backup and CLI reference documents before using the resulting archive to design a full restore:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/reference/cli/introduction
- https://supabase.com/docs/guides/local-development/restoring-downloaded-backup


## Phase 3 — one-command owner setup, offline readiness and second encrypted copy

All below is **prepared code, not activated on the owner's computer**. It cannot run from ChatGPT because the Windows drive and locally encrypted credentials are inaccessible here.

For an owner who has an encrypted \`D:\` drive, Node 22+, PostgreSQL CLI and both project's database connection details, a *single entry-point* configures the read-only exports and scheduled checks:

\`\`\`powershell
& .\scripts\recovery\windows\Install-KSOL-RecoveryPipeline.ps1 -BackupRoot 'D:\KSOL-BACKEND' -EnableProduction
\`\`\`

It securely prompts for separate Preview and Production credentials, runs a **first locally verified** read-only dump, schedules Preview at 18:30 and Production at 18:45, the existing archive inspection at 19:30 and both-project offline readiness reporting at 19:45. If a prerequisite is missing, it stops rather than inventing a green status. Omit \`-EnableProduction\` to configure only Preview.

The local readiness reporter can also run manually:

\`\`\`powershell
node .\scripts\recovery\check-readiness.mjs --root 'D:\KSOL-BACKEND' --source all
\`\`\`

It checks *both* latest source-specific manifests, matching archive files, SHA-256, age and a fresh \`pg_restore --list\` verification. It writes \`07-Recovery-Reports\latest-recovery-readiness.json\` with clearly separate \`backupStatus\` and \`fullSupabaseRestore: NOT_VERIFIED\`, always \`releaseGate: NO_GO\`. The Windows Task records a nonzero exit code if an archive is missing/corrupt/stale. This is a **local alert/report**; it is not an email or push notification.

Optional verified **second private copy** on another BitLocker-protected drive (example \`E:\Private-Recovery\`):

\`\`\`powershell
& .\scripts\recovery\windows\Copy-KSOL-BackupToSecondDrive.ps1 -Source preview -BackupRoot 'D:\KSOL-BACKEND' -SecondaryRoot 'E:\Private-Recovery'
& .\scripts\recovery\windows\Copy-KSOL-BackupToSecondDrive.ps1 -Source production -BackupRoot 'D:\KSOL-BACKEND' -SecondaryRoot 'E:\Private-Recovery'
\`\`\`

The destination must already exist and cannot be the same drive. The script validates both volumes' protection, verifies each source against its manifest before copying, and rechecks the copy's SHA-256. It never deletes a successful copy and does not send database data to a cloud provider. Schedule these commands on Windows only after the independent second volume is connected. This local second copy is not an independently verified **offsite/cloud** backup.

### Remaining irreducible external prerequisites

- **The owner must activate the scripts on their signed-in Windows PC and supply database credentials privately.** No remote assistant or GitHub Action can see the local \`D:\` drive or fetch Windows DPAPI secrets.
- **Real full recovery is still unverified:** restore a current real backup into a *fresh Supabase-compatible disposable environment* with correct auth, storage, roles, extensions and RLS. Then reconcile source/restore records and perform authenticated Student Login → Exam → Submit → Server Grade → Result and cross-user negative tests. Do not repeat the failed standalone PostgreSQL \`public/private\`-only attempt or fabricate \`auth.users\`.
- **Cloud-offsite copy and user-facing push notification** require an explicitly chosen, secure external destination/channel and separate connection approval; neither is silently created or granted access.
- **No production deployment, DB migration, merge or permission change** is performed by the recovery scripts or GitHub CI.
