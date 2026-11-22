# KSOL Result Card independent LOCAL restore check. NOT a Supabase script.
# Requires a FRESH backup from the current database; an older backup is not release proof.
param(
  [string]$BackupPath = "$env:USERPROFILE\Downloads\ksol-preview-backup.dump",
  [string]$PostgresBin = "C:\Program Files\PostgreSQL\18\bin",
  [string]$PgHostName = "localhost",
  [int]$PgPort = 5432,
  [string]$PgUser = "postgres"
)
$ErrorActionPreference = "Stop"
$psql = Join-Path $PostgresBin "psql.exe"
$pgRestore = Join-Path $PostgresBin "pg_restore.exe"
$pgCreate = Join-Path $PostgresBin "createdb.exe"
$out = Join-Path $env:USERPROFILE ("Downloads\KSOL-result-restore-proof-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".txt")
$report = New-Object System.Collections.Generic.List[string]
$report.Add("KSOL RESULT CARD INDEPENDENT LOCAL RESTORE PROOF")
$report.Add("Date: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss K"))
$report.Add("Target: local Postgres only; no Supabase write or deployment.")
# Fail closed if someone passes a remote database host. This verifier may
# create a disposable database and must NEVER target a cloud Supabase host.
if ($PgHostName -notin @("localhost", "127.0.0.1", "::1")) {
  $report.Add("FAIL: only localhost/127.0.0.1/::1 is allowed; remote host denied.")
  $report | Set-Content -Path $out -Encoding UTF8
  Write-Host ("Report: " + $out)
  exit 2
}
function Save-Report {
  $report | Set-Content -Path $out -Encoding UTF8
  Write-Host ("Report: " + $out)
}
foreach ($tool in @($psql, $pgRestore, $pgCreate)) {
  if (-not (Test-Path -LiteralPath $tool)) {
    $report.Add("FAIL: PostgreSQL tool unavailable: " + $tool)
    Save-Report
    exit 2
  }
}
if (-not (Test-Path -LiteralPath $BackupPath)) {
  $report.Add("FAIL: backup not found: " + $BackupPath)
  Save-Report
  exit 2
}
$backup = Get-Item -LiteralPath $BackupPath
$report.Add("Backup file: " + $backup.FullName)
$report.Add("Size: " + $backup.Length)
$report.Add("Modified: " + $backup.LastWriteTime.ToString("o"))
$report.Add("SHA256: " + (Get-FileHash -LiteralPath $BackupPath -Algorithm SHA256).Hash)
$fresh = ($backup.LastWriteTime -ge (Get-Date).AddDays(-1))
$report.Add("Backup current within 24h: " + $fresh)
if (-not $fresh) {
  $report.Add("FAIL: stale backup; obtain a fresh source-specific dump before restore.")
  Save-Report
  exit 1
}
# A readable archive is necessary, but never sufficient for a verified restore.
& $pgRestore --list $BackupPath > $null 2>&1
$archiveExit = $LASTEXITCODE
$report.Add("Archive list exit code: " + $archiveExit)
if ($archiveExit -ne 0) {
  $report.Add("FAIL: archive TOC is unreadable.")
  Save-Report
  exit 1
}
$db = "ksol_result_restore_" + (Get-Date -Format "yyyyMMddHHmmss") + "_" + (Get-Random -Minimum 1000 -Maximum 9999)
$report.Add("Disposable local database: " + $db)
Write-Host "PostgreSQL will request your LOCAL password. Never paste it into ChatGPT."
& $pgCreate -h $PgHostName -p $PgPort -U $PgUser -W $db 2>&1 | ForEach-Object { $report.Add($_.ToString()) }
$createExit = $LASTEXITCODE
$report.Add("Create database exit code: " + $createExit)
if ($createExit -ne 0) { Save-Report; exit 1 }
& $pgRestore -h $PgHostName -p $PgPort -U $PgUser -W --no-owner --no-privileges --exit-on-error -d $db $BackupPath 2>&1 | ForEach-Object { $report.Add($_.ToString()) }
$restoreExit = $LASTEXITCODE
$report.Add("Restore exit code: " + $restoreExit)
if ($restoreExit -ne 0) { $report.Add("FAIL: restore incomplete"); Save-Report; exit 1 }
$checks = @'
SELECT 'table_count=' || count(*) FROM pg_tables WHERE schemaname IN ('public','private','auth','storage');
SELECT 'public_function_count=' || count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';
SELECT 'rls_policy_count=' || count(*) FROM pg_policies WHERE schemaname IN ('public','private','storage');
SELECT 'result_source_attempts=' || EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='test_attempts');
'@
$checkOut = & $psql -h $PgHostName -p $PgPort -U $PgUser -W -d $db -X -v ON_ERROR_STOP=1 -At -c $checks 2>&1
$checkExit = $LASTEXITCODE
$report.AddRange([string[]]@($checkOut | ForEach-Object { $_.ToString() }))
$report.Add("Inspect exit code: " + $checkExit)
if ($checkExit -ne 0) { $report.Add("FAIL: inspect failed"); Save-Report; exit 1 }
$tableCount = [int](($checkOut | Where-Object { $_ -match '^table_count=' } | Select-Object -First 1) -replace '^table_count=', '')
$functionsCount = [int](($checkOut | Where-Object { $_ -match '^public_function_count=' } | Select-Object -First 1) -replace '^public_function_count=', '')
$policiesCount = [int](($checkOut | Where-Object { $_ -match '^rls_policy_count=' } | Select-Object -First 1) -replace '^rls_policy_count=', '')
# PostgreSQL's -At boolean output is usually "t"/"f", not "true"/"false".
$attemptLine = [string]($checkOut | Where-Object { $_ -match '^result_source_attempts=' } | Select-Object -First 1)
$hasAttempts = ($attemptLine -match '^result_source_attempts=(t|true|1)
$passed = $fresh -and ($tableCount -ge 10) -and ($functionsCount -ge 10) -and ($policiesCount -gt 0) -and $hasAttempts
$report.Add("VERIFICATION PASS (basic): " + $passed)
if (-not $passed) { $report.Add("FAIL: stale or incomplete restore. Do not claim Production recovery readiness.") }
$report.Add("The new local database is retained for inspection: " + $db)
$report.Add("Archive restore used --no-privileges; original GRANT/ACL completeness is NOT verified.")
$report.Add("Basic restore proof alone is NOT Production PITR/rollback verification.")
Save-Report
if ($passed) { exit 0 } else { exit 1 }
)
$report.Add("Result source attempts table detected: " + $hasAttempts)
$passed = $fresh -and ($tableCount -ge 10) -and ($functionsCount -ge 10) -and ($policiesCount -gt 0) -and $hasAttempts
$report.Add("VERIFICATION PASS (basic): " + $passed)
if (-not $passed) { $report.Add("FAIL: stale or incomplete restore. Do not claim Production recovery readiness.") }
$report.Add("The new local database is retained for inspection: " + $db)
$report.Add("Basic restore proof alone is NOT Production PITR/rollback verification.")
Save-Report
if ($passed) { exit 0 } else { exit 1 }
