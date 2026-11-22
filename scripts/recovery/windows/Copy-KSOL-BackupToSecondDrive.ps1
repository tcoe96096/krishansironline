# Optional second local copy to a DIFFERENT BitLocker-protected volume.
# Never uploads data, deletes a verified backup or touches any database.
param(
  [ValidateSet('preview','production')][string]$Source='preview',
  [string]$BackupRoot='D:\KSOL-BACKEND',
  [Parameter(Mandatory=$true)][string]$SecondaryRoot
)
$ErrorActionPreference='Stop'
$root=[System.IO.Path]::GetFullPath($BackupRoot)
$other=[System.IO.Path]::GetFullPath($SecondaryRoot)
$firstDrive=[System.IO.Path]::GetPathRoot($root).TrimEnd('\')
$secondDrive=[System.IO.Path]::GetPathRoot($other).TrimEnd('\')
if ($firstDrive -eq $secondDrive) { throw 'Second copy must be on a different encrypted volume' }
if (!(Get-Command Get-BitLockerVolume -ErrorAction SilentlyContinue)) { throw 'BitLocker verification is unavailable' }
foreach($drive in @($firstDrive,$secondDrive)) {
 $v=Get-BitLockerVolume -MountPoint $drive -ErrorAction Stop
 if (!$v -or $v.ProtectionStatus -ne 'On') { throw "Drive $drive is not BitLocker protected" }
}
$reportFile=Join-Path (Join-Path $root '07-Recovery-Reports') "last-$Source-export.json"
if (!(Test-Path -LiteralPath $reportFile -PathType Leaf)) { throw "No verified $Source backup report" }
$report=Get-Content -LiteralPath $reportFile -Raw | ConvertFrom-Json
$refs=@{preview='zgpkmfqioqvincmgyfpi';production='vsqwlkqqsxcehvdsdbna'}
if ($report.source -ne $Source -or $report.projectRef -ne $refs[$Source] -or
  $report.backupStatus -ne 'READABLE_EXPORT_ONLY' -or $report.pgRestoreListPass -ne $true) {
  throw 'Backup report is incomplete or for the wrong project'
}
$name=[string]$report.archiveName
if ($name -notmatch ('^ksol-'+$Source+'-[0-9TZ-]+-[0-9]+\.dump$')) { throw 'Unsafe archive name' }
$original=Join-Path (Join-Path $root '09-Automated-Backups') $name
if (!(Test-Path -LiteralPath $original -PathType Leaf)) { throw 'Original archive missing' }
$digest=(Get-FileHash -LiteralPath $original -Algorithm SHA256).Hash.ToLowerInvariant()
if ($digest -ne $report.sha256) { throw 'Original archive checksum changed' }
if (!(Test-Path -LiteralPath $other -PathType Container)) { throw "Second volume folder not found: $other" }
$destFolder=Join-Path $other 'KSOL-Encrypted-Backup-Copies'
if (!(Test-Path -LiteralPath $destFolder)) {
 New-Item -Path $destFolder -ItemType Directory | Out-Null
 $identity=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name
 & icacls.exe $destFolder '/inheritance:r' '/grant:r' "$($identity):(OI)(CI)F" '/grant:r' 'SYSTEM:(OI)(CI)F' | Out-Null
 if ($LASTEXITCODE -ne 0) { throw 'Could not secure destination backup directory' }
}
$dest=Join-Path $destFolder $name
if (!(Test-Path -LiteralPath $dest -PathType Leaf)) {
 $partial=$dest+'.partial'
 if (Test-Path -LiteralPath $partial) { throw 'An incomplete copy already exists; manual review required' }
 Copy-Item -LiteralPath $original -Destination $partial -ErrorAction Stop
 if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash.ToLowerInvariant() -ne $digest) {
   throw 'Second-copy digest mismatch; incomplete copy preserved for investigation'
 }
 Move-Item -LiteralPath $partial -Destination $dest
}
if ((Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant() -ne $digest) { throw 'Second-copy digest mismatch' }
Write-Host "Private $Source copy verified on a second protected volume: $dest"
Write-Warning 'A second encrypted local copy is not a full Supabase database restore or independent cloud backup.'
