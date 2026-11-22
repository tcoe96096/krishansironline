# One-time orchestrator. Only the current signed-in PC is configured.
# This does not publish GitHub or modify either hosted Supabase database.
param(
 [string]$BackupRoot='D:\KSOL-BACKEND',
 [switch]$EnableProduction
)
$ErrorActionPreference='Stop'
$root=[System.IO.Path]::GetFullPath($BackupRoot)
$here=$PSScriptRoot
$preview=@{
 Source='preview';BackupRoot=$root
}
Write-Host 'KSOL private recovery setup: Preview backup, verification and scheduled reports'
& (Join-Path $here 'Initialize-KSOL-Backup.ps1') @preview
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'Preview initialization failed' }
& (Join-Path $here 'Invoke-KSOL-DailyBackup.ps1') @preview
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'Initial Preview backup failed' }
& (Join-Path $here 'Install-KSOL-DailyBackup.ps1') @preview -At '18:30'
if ($EnableProduction) {
 Write-Host 'Configuring independently identified Production project.'
 & (Join-Path $here 'Initialize-KSOL-Backup.ps1') -Source production -BackupRoot $root
 & (Join-Path $here 'Invoke-KSOL-DailyBackup.ps1') -Source production -BackupRoot $root
 & (Join-Path $here 'Install-KSOL-DailyBackup.ps1') -Source production -BackupRoot $root -At '18:45'
}
& (Join-Path $here 'Install-KSOL-RecoveryCheck.ps1') -BackupRoot $root -At '19:30'
& (Join-Path $here 'Install-KSOL-RecoveryStatus.ps1') -BackupRoot $root -At '19:45'
Write-Host 'One-time Windows scheduling complete. All backup files and reports remain private on this PC.'
Write-Warning 'This proves readable exports only. Independently verified full Supabase-compatible restore is still required before production release.'
