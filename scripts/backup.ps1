$ErrorActionPreference = "Stop"

$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { "backups" }
$PostgresService = if ($env:POSTGRES_SERVICE) { $env:POSTGRES_SERVICE } else { "postgres" }
$PostgresUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }
$PostgresDb = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "techdesk" }
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupFileName = "techdesk-$Timestamp.dump"
$BackupFile = Join-Path $BackupDir $BackupFileName
$ContainerBackupFile = "/tmp/$BackupFileName"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

docker compose exec -T $PostgresService pg_dump `
  -U $PostgresUser `
  -d $PostgresDb `
  -Fc `
  -f $ContainerBackupFile

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed"
}

$ContainerId = docker compose ps -q $PostgresService
if (-not $ContainerId) {
  throw "Postgres service container not found: $PostgresService"
}

docker cp "${ContainerId}:$ContainerBackupFile" $BackupFile
if ($LASTEXITCODE -ne 0) {
  throw "docker cp failed"
}

docker compose exec -T $PostgresService rm -f $ContainerBackupFile | Out-Null

$BackupItem = Get-Item -LiteralPath $BackupFile
if ($BackupItem.Length -le 0) {
  throw "Backup file is empty: $BackupFile"
}

docker run --rm -v "${PWD}/${BackupDir}:/backups" postgres:16 pg_restore -l "/backups/$BackupFileName" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Backup validation failed"
}

$Hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $BackupFile).Hash

Write-Host "Backup created at $BackupFile"
Write-Host "Size: $($BackupItem.Length) bytes"
Write-Host "SHA256: $Hash"
