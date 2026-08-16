param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$ExpectedSha256 = ""
)

. "$PSScriptRoot\_lib.ps1"

Assert-DockerAvailable

if (-not (Test-Path -LiteralPath $Script:EnvPath)) {
  throw "Arquivo .env nao encontrado em $Script:EnvPath. Execute install.ps1 primeiro."
}

$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
$backupDir = Split-Path -Parent $resolvedBackup
$fileName = Split-Path -Leaf $resolvedBackup
$backupItem = Get-Item -LiteralPath $resolvedBackup
$postgresUser = Get-TechDeskEnvValue -Name "POSTGRES_USER" -Default "techdesk"
$tempDb = "techdesk_restore_check_$((New-Guid).ToString('N').Substring(0, 12))"
$containerBackupFile = "/tmp/$fileName"
$containerId = $null

if ($backupItem.Length -le 0) {
  throw "Backup vazio: $BackupFile"
}

docker run --rm -v "${backupDir}:/backups" postgres:16 pg_restore -l "/backups/$fileName" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "pg_restore -l falhou para $BackupFile."
}

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedBackup).Hash
if ($ExpectedSha256 -and ($hash.ToUpperInvariant() -ne $ExpectedSha256.ToUpperInvariant())) {
  throw "SHA256 divergente. Esperado: $ExpectedSha256. Atual: $hash."
}

$containerId = Invoke-TechDeskCompose ps -q postgres
if (-not $containerId) {
  throw "Container postgres nao encontrado. Suba o PostgreSQL antes do restore-check."
}

docker cp $resolvedBackup "${containerId}:$containerBackupFile"
if ($LASTEXITCODE -ne 0) {
  throw "docker cp falhou."
}

try {
  Invoke-TechDeskCompose exec -T postgres createdb -U $postgresUser $tempDb
  if ($LASTEXITCODE -ne 0) {
    throw "createdb falhou para banco temporario $tempDb."
  }

  Invoke-TechDeskCompose exec -T postgres pg_restore -U $postgresUser -d $tempDb $containerBackupFile
  if ($LASTEXITCODE -ne 0) {
    throw "restore isolado falhou no banco temporario $tempDb."
  }

  $validationSql = @(
    'select count(*) as migrations from "_prisma_migrations";',
    'select count(*) as users from "User";',
    'select count(*) as customers from "Customer";',
    'select count(*) as equipments from "Equipment";',
    'select count(*) as service_orders from "ServiceOrder";',
    'select count(*) as accessories from "Accessory";',
    'select count(*) as budgets from "Budget";',
    'select count(*) as budget_items from "BudgetItem";',
    'select count(*) as parts from "Part";',
    'select count(*) as stock_movements from "StockMovement";',
    'select count(*) as service_order_histories from "ServiceOrderHistory";',
    'select count(*) as company_settings from "CompanySettings";',
    'select count(*) as orphan_equipment from "Equipment" e left join "Customer" c on c.id = e."customerId" where c.id is null;',
    'select count(*) as orphan_service_order_customer from "ServiceOrder" s left join "Customer" c on c.id = s."customerId" where c.id is null;',
    'select count(*) as orphan_service_order_equipment from "ServiceOrder" s left join "Equipment" e on e.id = s."equipmentId" where e.id is null;'
  )

  foreach ($sql in $validationSql) {
    Invoke-TechDeskCompose exec -T postgres psql -U $postgresUser -d $tempDb -v ON_ERROR_STOP=1 -c $sql | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Validacao SQL falhou no banco temporario $tempDb."
    }
  }

  Write-Host "Dump valido para listagem pg_restore."
  Write-Host "Restore isolado concluido no banco temporario $tempDb."
  Write-Host "Tabelas criticas e relacoes basicas validadas."
  Write-Host "SHA256: $hash"
  Write-Host "Este script nao restaura sobre producao."
} finally {
  if ($containerId) {
    Invoke-TechDeskCompose exec -T postgres dropdb -U $postgresUser --if-exists $tempDb | Out-Null
    Invoke-TechDeskCompose exec -T postgres rm -f $containerBackupFile | Out-Null
  }
}
