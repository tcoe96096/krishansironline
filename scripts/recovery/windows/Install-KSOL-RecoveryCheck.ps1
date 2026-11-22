# One-time Windows Task Scheduler installation. READ-ONLY backup inspection.
# Requires Node.js 22+ and a trusted checkout of the KSOL repository.
param([string]$BackupRoot = 'D:\KSOL-BACKEND', [string]$At = '19:30')
$ErrorActionPreference = 'Stop'
$node = (Get-Command node.exe -ErrorAction Stop).Source
$scriptFile = Join-Path $PSScriptRoot '..\inspect-local-backups.mjs'
$scriptFile = [System.IO.Path]::GetFullPath($scriptFile)
if (!(Test-Path -LiteralPath $scriptFile -PathType Leaf)) { throw 'KSOL recovery script not found' }
if (!(Test-Path -LiteralPath $BackupRoot -PathType Container)) { throw "Backup root not found: $BackupRoot" }
$stamp = [datetime]::ParseExact($At, 'HH:mm', [System.Globalization.CultureInfo]::InvariantCulture)
$arguments = '"' + $scriptFile + '" --root "' + ([System.IO.Path]::GetFullPath($BackupRoot)) + '"'
$action = New-ScheduledTaskAction -Execute $node -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Daily -At $stamp
# Interactive-only principal: doesn't store a Windows password. PC must be on and signed in.
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'KSOL-Recovery-Local-Inventory' -Action $action -Trigger $trigger -Principal $principal -Description 'Private daily archive inventory only; NO DB writes or automatic release' -Force | Out-Null
Write-Host 'Task installed: KSOL-Recovery-Local-Inventory'
Write-Host "Daily local inspection at $At; data stays in $BackupRoot\07-Recovery-Reports"
Write-Warning 'This DOES NOT create a backup or prove a full restore. PC must be on and signed in.'
