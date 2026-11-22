# Scheduled wrapper. No secrets or database data are uploaded to GitHub.
param(
  [ValidateSet('preview','production')][string]$Source='preview',
  [string]$BackupRoot='D:\KSOL-BACKEND'
)
$ErrorActionPreference='Stop'
$root=[System.IO.Path]::GetFullPath($BackupRoot)
$volumeRoot=[System.IO.Path]::GetPathRoot($root).TrimEnd('\')
if (!(Get-Command Get-BitLockerVolume -ErrorAction SilentlyContinue)) { throw 'Disk encryption could not be verified' }
$volume=Get-BitLockerVolume -MountPoint $volumeRoot -ErrorAction Stop
if (!$volume -or $volume.ProtectionStatus -ne 'On') { throw 'Backup volume must be protected by BitLocker before storing database data' }
$refs=@{preview='zgpkmfqioqvincmgyfpi';production='vsqwlkqqsxcehvdsdbna'}
$private=Join-Path $root '08-Recovery-Automation-Private'
$configPath=Join-Path $private "backup-$Source.json"
$secretPath=Join-Path $private "backup-$Source.secret.dpapi"
if (!(Test-Path -LiteralPath $configPath -PathType Leaf) -or !(Test-Path -LiteralPath $secretPath -PathType Leaf)) {
  throw "Recovery $Source credential is not configured on this computer"
}
$config=Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
if ($config.projectRef -ne $refs[$Source] -or $config.source -ne $Source) {
  throw 'Backup project identity does not match the selected source'
}
$secure=(Get-Content -LiteralPath $secretPath -Raw).Trim() | ConvertTo-SecureString
$credential=New-Object System.Management.Automation.PSCredential('backup',$secure)
$password=$credential.GetNetworkCredential().Password
$node=(Get-Command node.exe -ErrorAction Stop).Source
$pgdump=Get-Command pg_dump.exe -ErrorAction Stop
$pgrestore=Get-Command pg_restore.exe -ErrorAction Stop
$scriptFile=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\create-verified-backup.mjs'))
if (!(Test-Path -LiteralPath $scriptFile -PathType Leaf)) { throw 'KSOL backup runner is missing' }
$names=@('KSOL_STORAGE_ENCRYPTED','KSOL_DB_HOST','KSOL_DB_PORT','KSOL_DB_USER','KSOL_DB_NAME','KSOL_DB_PASSWORD')
$previous=@{}
foreach($name in $names) { $previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process') }
try {
  $env:KSOL_STORAGE_ENCRYPTED='verified-by-windows-wrapper'
  $env:KSOL_DB_HOST=$config.host
  $env:KSOL_DB_PORT=[string]$config.port
  $env:KSOL_DB_USER=$config.username
  $env:KSOL_DB_NAME=$config.database
  $env:KSOL_DB_PASSWORD=$password
  $password=$null
  & $node $scriptFile --source $Source --root $root
  $exitCode=$LASTEXITCODE
  if ($exitCode -ne 0) { throw "KSOL $Source backup validation failed (exit $exitCode). Existing backups were preserved." }
} finally {
  foreach($name in $names) { [Environment]::SetEnvironmentVariable($name,$previous[$name],'Process') }
  $password=$null
  $credential=$null
  $secure=$null
}
