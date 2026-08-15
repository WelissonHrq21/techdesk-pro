. "$PSScriptRoot\_lib.ps1"

Assert-DockerAvailable

$backupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $Script:DeployRoot "backups" }
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$fileName = "backup-inicial-producao-$timestamp.dump"
$backupFile = Join-Path $backupDir $fileName
$containerBackupFile = "/tmp/$fileName"
$postgresUser = Get-TechDeskEnvValue -Name "POSTGRES_USER" -Default "techdesk"
$postgresDb = Get-TechDeskEnvValue -Name "POSTGRES_DB" -Default "techdesk"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Invoke-TechDeskCompose exec -T postgres pg_dump -U $postgresUser -d $postgresDb -Fc -f $containerBackupFile
if ($LASTEXITCODE -ne 0) {
  throw "pg_dump falhou."
}

$containerId = Invoke-TechDeskCompose ps -q postgres
if (-not $containerId) {
  throw "Container postgres nao encontrado."
}

docker cp "${containerId}:$containerBackupFile" $backupFile
if ($LASTEXITCODE -ne 0) {
  throw "docker cp falhou."
}

Invoke-TechDeskCompose exec -T postgres rm -f $containerBackupFile | Out-Null

$backupItem = Get-Item -LiteralPath $backupFile
if ($backupItem.Length -le 0) {
  throw "Backup vazio: $backupFile"
}

docker run --rm -v "${backupDir}:/backups" postgres:16 pg_restore -l "/backups/$fileName" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "pg_restore -l falhou."
}

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $backupFile).Hash

Write-Host "Backup criado: $backupFile"
Write-Host "Tamanho: $($backupItem.Length) bytes"
Write-Host "SHA256: $hash"
Write-Host "Copie este backup tambem para outro dispositivo ou host."
