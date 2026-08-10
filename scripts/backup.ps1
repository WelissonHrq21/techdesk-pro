$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { "backups" }
$PostgresService = if ($env:POSTGRES_SERVICE) { $env:POSTGRES_SERVICE } else { "postgres" }
$PostgresUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }
$PostgresDb = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "techdesk" }
$Timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$BackupFile = Join-Path $BackupDir "techdesk-$Timestamp.sql"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

docker compose exec -T $PostgresService pg_dump `
  -U $PostgresUser `
  -d $PostgresDb `
  | Out-File -FilePath $BackupFile -Encoding utf8

Write-Host "Backup created at $BackupFile"
