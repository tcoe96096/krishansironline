# KSOL ₹0 Google Drive encrypted cloud backup — Owner setup, code-only opt-in

**Status:** Review-only code on Draft PR #143. The user's Google One screenshot from 2026-11-22 showed 2.74 GB / 15 GB used, ~12.26 GB remaining. This is a capacity observation, not actual cloud-backup verification. No paid plan, hosting provider, credentials or billing should be activated.

## Architecture

Supabase Preview PostgreSQL (READ ONLY \`pg_dump\`) → in-memory streaming \`rclone crypt\` → private Google Drive folder → streamed encrypted object is downloaded, decrypted in runner memory and parsed with \`pg_restore --list -\` → short success/failure report without personal records.

- **Zero plaintext backup file** is deliberately written to the GitHub runner or unencrypted Windows C:/D:/E: disks; encrypted bytes are sent to Drive through rclone's Crypt overlay.
- Backup encryption happens BEFORE sending to Google Drive; filenames are encrypted by the Crypt overlay. Anyone accessing the raw Google Drive folder sees ciphertext, not student records.
- PostgreSQL custom-format data can include \`auth.users\` and \`storage.objects\` **metadata**. Supabase Storage file bytes, Auth/OAuth provider configuration, extensions/roles external to the dump and full application recovery still require separate coverage. This job always returns \`fullSupabaseRestore: NOT_VERIFIED\` and \`releaseGate: NO_GO\`.
- Direct Google Drive uploads to the unencrypted \`gdrive:\` remote are forbidden in the script. It checks the exact \`[ksolcrypt]\` config section is \`type = crypt\` with an underlying remote before transfer.
- New cloud objects are uniquely named; they are not deleted, overwritten by a fixed-name backup, rotated or shared publicly. Periodic Drive usage review will be needed, because the user's personal 15 GB quota can eventually fill.
- GitHub Actions standard hosted runners are free for **public** repositories; the workflow checks repository visibility at runtime and **will not run in a private repository**. Repository visibility must be reevaluated before using it.
- No secret is committed to source control. Never paste any DB password, Google OAuth token, rclone config file, key, or backup into ChatGPT.

## Owner one-time setup (requires an interactive browser, no fee)

1. Use official documentation at https://rclone.org/downloads/ for a free local rclone installation, and the Google Drive setup at https://rclone.org/drive/. The rclone shared Google OAuth client is being retired during 2026; set up your **own Google Drive OAuth client ID** per official guidance. No credit card or billable Google Cloud service is to be enabled. If prompted for billing, STOP and choose another genuinely free option.
2. Configure an rclone Drive remote called \`gdrive\` and authenticate directly in your own browser. Give Drive access only to the private Google account you control. No credential information should ever be sent through chat or GitHub issues.
3. Configure a second rclone remote called \`ksolcrypt\` with type \`crypt\`, underlying location \`gdrive:KSOL-Private-Encrypted-Backups\`, and *standard encrypted filenames + content*. Generate and privately save a high-entropy crypt password and salt. **Losing the crypt key/config makes the backup unrecoverable.** Store recovery material securely OFF Google Drive, not in the public repo.
4. Protect your local \`rclone.conf\`. Its 'obscured' credentials are NOT strong encryption. Consider \`rclone config password\` and only keep the config in an authorized account's private directory. For GitHub Actions secret storage, the repository owner must create an encrypted repository secret named \`KSOL_RCLONE_CONFIG_B64\` containing the base64 of this configured file. Base64 is NOT encryption; GitHub's protected Secrets storage is what protects it. Never commit the base64 value or put it into a public command/output screenshot.
5. Configure five separate **GitHub Actions repository secrets** with trusted **Preview-only** PostgreSQL connection details, each privately from the Supabase Preview project's Connection page: \`KSOL_PREVIEW_DB_HOST\`, \`KSOL_PREVIEW_DB_PORT\`, \`KSOL_PREVIEW_DB_USER\`, \`KSOL_PREVIEW_DB_NAME\`, \`KSOL_PREVIEW_DB_PASSWORD\`. Verify Preview reference \`zgpkmfqioqvincmgyfpi\` in host or username. The workflow will never use Production credentials.
6. Do not set the repository variable \`KSOL_CLOUD_BACKUP_ENABLED\` until the complete code review, GitHub CI, authorized connection, storage quota and owner confirmation are complete. When you explicitly choose to activate, set that variable to the exact literal \`true\` under GitHub repository Settings → Secrets and variables → Actions → Variables, **only after the Draft PR has been separately approved/merged**. The only cloud backup workflow trigger is manual or daily schedule on \`main\`; no pull_request trigger can access private secrets.
7. Check the GitHub Actions run of \`KSOL private encrypted Google Drive backup\`, verify it reports \`READABLE_ARCHIVE_ONLY\`, then open Google Drive privately and confirm encrypted-looking filenames under your \`KSOL-Private-Encrypted-Backups\` folder. Do not upload a raw \`.dump\` into Google Drive.
8. Real recovery remains not verified. Conduct a **complete isolated Supabase-compatible restore** and authenticated positive/negative tests before allowing high-impact database migrations or live release.

## Safety and ₹0 limits

The cloud job only runs on the reviewed default branch of public \`tcoe96096/krishansironline\`, after explicit opt-in with GitHub Variable \`KSOL_CLOUD_BACKUP_ENABLED=true\` and correctly scoped GitHub Secrets. It uses the standard free \`ubuntu-24.04\` GitHub runner, free open-source PostgreSQL and rclone tools, and the user's existing free personal Google Drive quota. Do not upgrade plans, enable billable APIs or switch to private-repository paid runner use as a workaround.

This setup is **not yet active**. No local disk access, Google Drive OAuth approval, Supabase credentials or other secrets are available from the assistant. The actual first cloud backup, readback and full restore cannot be claimed successful from code-only CI.

## References

- rclone Google Drive OAuth: https://rclone.org/drive/
- rclone Crypt protection: https://rclone.org/crypt/
- rclone streaming rcat: https://rclone.org/commands/rclone_rcat/
- GitHub Actions public runner charges: https://docs.github.com/en/actions/concepts/billing-and-usage
- Supabase database dump exclusions and managed objects: https://supabase.com/docs/reference/cli/global-flags


## Important 2026 Google OAuth continuity preflight (must be addressed before opting in)

- The shared rclone Google Drive OAuth client is being retired during 2026. Per the official rclone Drive documentation, create your own OAuth client ID (using free Google Drive API access) instead of depending on a retired shared client. **Do not enable a billable Google Cloud product or add a payment method** for this project.
- For an OAuth consent screen with External audience and Testing publishing status, Google refresh tokens typically expire after **7 days** when requesting Google Drive access. A daily backup that works for one week and silently stops is unacceptable; check the consent screen status and Google policies before treating automation as permanent. The appropriate published/production configuration may have additional Google verification requirements. See https://developers.google.com/identity/protocols/oauth2 .
- If you encrypt your *rclone configuration file itself*, set the separate GitHub repository secret \`KSOL_RCLONE_CONFIG_PASSWORD\` so the cloud workflow can unlock the configuration through \`RCLONE_CONFIG_PASS\`. The encryption key for rclone Crypt should be kept in an independent owner-controlled recovery record; GitHub Secrets are not themselves a disaster-recovery archive.
- A green archive readback, like a green local TOC, is not an authenticated application restore. If Google OAuth expires or cloud quota is reached, the workflow must report failure and keep release \`NO_GO\`.

## First owner-side setup check (no account credentials required)

From an ordinary PowerShell window, run only \`rclone version\`. If it prints a version, proceed to interactive private OAuth/crypt setup. If it is not found, install rclone **from its official free download** (https://rclone.org/downloads/). Never paste OAuth URLs containing authorization codes, local rclone config, passwords or tokens into a chat. Since the remote cloud workflow cannot access Windows D: and needs no Windows BitLocker, no VHDX or D: drive encryption operation is necessary to *create that cloud-only backup*.
