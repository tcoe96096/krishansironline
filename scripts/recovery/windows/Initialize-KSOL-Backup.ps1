# One-time, interactive Windows setup. Secrets stay on THIS Windows PC (DPAPI).
# A protected local volume is mandatory before holding any student data dump.
param(
  [ValidateSet('preview','production')][string]$Source='preview',
  [string]$BackupRoot='D:\KSOL-BACKEND'
)
$ErrorActionPreference='Stop'
if (!(Test-Path -LiteralPath $BackupRoot -PathType Container)) { throw "Backup root not found: $BackupRoot" }
$root=[System.IO.Path]::GetFullPath($BackupRoot)
$volumeRoot=[System.IO.Path]::GetPathRoot($root).TrimEnd('\')
if (!(Get-Command Get-BitLockerVolume -ErrorAction SilentlyContinue)) { throw 'Cannot verify disk encryption; cannot store personal database backup here' }
$volume=Get-BitLockerVolume -MountPoint $volumeRoot -ErrorAction Stop
if (!$volume -or $volume.ProtectionStatus -ne 'On') { throw "Disk encryption is not verified on $volumeRoot. Enable BitLocker or choose another encrypted drive." }

$refs=@{preview='zgpkmfqioqvincmgyfpi'; production='vsqwlkqqsxcehvdsdbna'}
$ref=$refs[$Source]
Write-Host "Configuring read-only export from KSOL $Source ($ref)"
$hostName=(Read-Host 'Supabase PostgreSQL host (not URL)').Trim()
$username=(Read-Host 'Supabase PostgreSQL user').Trim()
$db=(Read-Host 'Database name (usually postgres)').Trim()
$portInput=(Read-Host 'Port (usually 5432 or pooler 6543)').Trim()
$port=0
if (![int]::TryParse($portInput,[ref]$port) -or $port -lt 1 -or $port -gt 65535) { throw 'Invalid database port' }
if (!$hostName.EndsWith('.supabase.co') -or !($hostName.Contains($ref) -or $username.Contains($ref))) {
  throw "Target identity mismatch. The connection must identify the $Source project $ref."
}
if ($db -notmatch '^[\w.-]{1,80}$') { throw 'Invalid database name' }
$password=Read-Host 'Database password (hidden; never pasted into chat)' -AsSecureString
if (!$password -or $password.Length -lt 1) { throw 'Password is required' }
$private=Join-Path $root '08-Recovery-Automation-Private'
$archiveDir=Join-Path $root '09-Automated-Backups'
foreach($folder in @($private,$archiveDir)) {
  if (!(Test-Path -LiteralPath $folder)) { New-Item -Path $folder -ItemType Directory | Out-Null }
  $identity=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  & icacls.exe $folder '/inheritance:r' '/grant:r' "$($identity):(OI)(CI)F" '/grant:r' 'SYSTEM:(OI)(CI)F' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not restrict access to $folder" }
}
$config=@{source=$Source;projectRef=$ref;host=$hostName;port=$port;username=$username;database=$db}
$configPath=Join-Path $private ("backup-$Source.json")
$secretPath=Join-Path $private ("backup-$Source.secret.dpapi")
$config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
$password | ConvertFrom-SecureString | Set-Content -LiteralPath $secretPath -Encoding ASCII
Write-Host "Configuration saved locally: $configPath"
Write-Host 'Password encrypted for your current Windows account using DPAPI. Never upload these files.'
Write-Warning 'No backup has run yet. Run Invoke-KSOL-DailyBackup.ps1 for the first proof, then install its scheduled task.'
