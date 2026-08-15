param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

. "$PSScriptRoot\_lib.ps1"

Assert-DockerAvailable

$resolvedBackup = Resolve-Path -LiteralPath $BackupFile
$backupDir = Split-Path -Parent $resolvedBackup
$fileName = Split-Path -Leaf $resolvedBackup

docker run --rm -v "${backupDir}:/backups" postgres:16 pg_restore -l "/backups/$fileName" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "pg_restore -l falhou para $BackupFile."
}

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedBackup).Hash
Write-Host "Dump valido para listagem pg_restore."
Write-Host "SHA256: $hash"
Write-Host "Este script nao restaura sobre producao."
