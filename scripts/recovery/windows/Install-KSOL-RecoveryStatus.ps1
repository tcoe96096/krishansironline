# Register a daily LOCAL-only recovery readiness summary, with fail-visible Task Scheduler status.
# No network credentials. It never restores or authorizes deployment.
param([string]$BackupRoot='D:\KSOL-BACKEND',[string]$At='19:45')
$ErrorActionPreference='Stop'
$root=[System.IO.Path]::GetFullPath($BackupRoot)
if (!(Test-Path -LiteralPath $root -PathType Container)) { throw "Backup root unavailable: $root" }
$node=(Get-Command node.exe -ErrorAction Stop).Source
$scriptFile=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\check-readiness.mjs'))
if (!(Test-Path -LiteralPath $scriptFile -PathType Leaf)) { throw 'Local recovery readiness report script not found' }
$stamp=[datetime]::ParseExact($At,'HH:mm',[System.Globalization.CultureInfo]::InvariantCulture)
$action=New-ScheduledTaskAction -Execute $node -Argument ('"'+$scriptFile+'" --root "'+$root+'" --source all')
$trigger=New-ScheduledTaskTrigger -Daily -At $stamp
$identity=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal=New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName 'KSOL-Recovery-Status' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Private verification of both local exports and advisory NO-GO restore status' -Force | Out-Null
Write-Host "Installed daily local recovery status report at $At."
Write-Host "Open $root\07-Recovery-Reports\latest-recovery-readiness.json after it runs."
Write-Warning 'If backups are absent, corrupt or stale, Task Scheduler shows a failed exit code. Full restore remains NOT_VERIFIED.'
