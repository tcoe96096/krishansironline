# Schedule verified private read-only database export. Requires Initialize-KSOL-Backup.ps1 first.
param(
  [ValidateSet('preview','production')][string]$Source='preview',
  [string]$BackupRoot='D:\KSOL-BACKEND',
  [string]$At='18:30'
)
$ErrorActionPreference='Stop'
$root=[System.IO.Path]::GetFullPath($BackupRoot)
$configPath=Join-Path (Join-Path $root '08-Recovery-Automation-Private') "backup-$Source.json"
$secretPath=Join-Path (Join-Path $root '08-Recovery-Automation-Private') "backup-$Source.secret.dpapi"
if (!(Test-Path -LiteralPath $configPath -PathType Leaf) -or !(Test-Path -LiteralPath $secretPath -PathType Leaf)) {
  throw "Configure $Source credentials securely before scheduling an export"
}
$stamp=[datetime]::ParseExact($At,'HH:mm',[System.Globalization.CultureInfo]::InvariantCulture)
$scriptFile=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'Invoke-KSOL-DailyBackup.ps1'))
$nodeAction=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -File "'+$scriptFile+'" -Source '+$Source+' -BackupRoot "'+$root+'"')
$trigger=New-ScheduledTaskTrigger -Daily -At $stamp
$identity=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal=New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Highest
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 45)
$taskName="KSOL-Verified-Backup-$Source"
Register-ScheduledTask -TaskName $taskName -Action $nodeAction -Trigger $trigger -Principal $principal -Settings $settings -Description "Private daily encrypted-volume PostgreSQL dump; never mutates KSOL remote data" -Force | Out-Null
Write-Host "Scheduled $taskName daily at $At on this PC."
Write-Warning 'A signed-in Windows user, active network, valid local DPAPI credential, pg_dump and an encrypted disk are mandatory. This does NOT prove full restore.'
