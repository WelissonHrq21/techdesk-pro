. "$PSScriptRoot\_lib.ps1"

Write-Host "TechDesk Pro v$Script:Version - instalador Windows"

Assert-DockerAvailable

$drive = Get-PSDrive -Name ((Resolve-Path $Script:DeployRoot).Path.Substring(0, 1))
if ($drive.Free -lt 5GB) {
  throw "Espaco livre insuficiente. Recomendado: pelo menos 5 GB livres."
}

if (Test-Path -LiteralPath $Script:EnvPath) {
  Write-Host "Instalacao existente detectada. O .env sera preservado."
} else {
  $portInput = Read-Host "Porta de acesso do TechDesk Pro [8080]"
  $port = if ([string]::IsNullOrWhiteSpace($portInput)) { "8080" } else { $portInput.Trim() }

  $adminNameInput = Read-Host "Nome do ADMIN inicial [Administrador]"
  $adminName = if ([string]::IsNullOrWhiteSpace($adminNameInput)) { "Administrador" } else { $adminNameInput.Trim() }

  $adminLoginInput = Read-Host "Login do ADMIN inicial [admin]"
  $adminLogin = if ([string]::IsNullOrWhiteSpace($adminLoginInput)) { "admin" } else { $adminLoginInput.Trim() }

  $securePassword = Read-Host "Senha do ADMIN inicial" -AsSecureString
  $adminPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  )

  if ([string]::IsNullOrWhiteSpace($adminPassword) -or $adminPassword.Length -lt 6) {
    throw "A senha do ADMIN precisa ter pelo menos 6 caracteres."
  }

  $postgresPassword = New-HexSecret -ByteCount 32
  $jwtSecret = New-HexSecret -ByteCount 64
  $dbName = "techdesk"
  $dbUser = "techdesk"
  $databaseUrl = "postgresql://$dbUser`:$postgresPassword@postgres:5432/$dbName`?schema=public"
  $suffix = if ($port -eq "80") { "" } else { ":$port" }
  $ipOrigins = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.PrefixOrigin -ne "WellKnown"
    } |
    ForEach-Object { "http://$($_.IPAddress)$suffix" }
  $origins = @("http://localhost$suffix", "http://$env:COMPUTERNAME$suffix") + $ipOrigins
  $corsOrigin = ($origins | Select-Object -Unique) -join ","

  @(
    "TECHDESK_PORT=$port",
    "TECHDESK_PROJECT_NAME=techdesk-prod",
    "",
    "POSTGRES_DB=$dbName",
    "POSTGRES_USER=$dbUser",
    "POSTGRES_PASSWORD=$postgresPassword",
    "",
    "DATABASE_URL=$databaseUrl",
    "",
    "JWT_SECRET=$jwtSecret",
    "JWT_EXPIRES_IN=8h",
    "",
    "CORS_ORIGIN=$corsOrigin",
    "SWAGGER_ENABLED=false",
    "LOG_LEVEL=info",
    "",
    "ADMIN_NAME=$adminName",
    "ADMIN_LOGIN=$adminLogin",
    "ADMIN_PASSWORD=$adminPassword",
    "",
    "TECHDESK_API_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-api:1.1.1",
    "TECHDESK_FRONTEND_IMAGE=ghcr.io/welissonhrq21/techdesk-pro-frontend:1.1.1"
  ) | Set-Content -LiteralPath $Script:EnvPath -Encoding UTF8

  Write-Host ".env criado. Secrets foram gravados localmente e nao serao exibidos."
}

$portToCheck = Get-TechDeskPort
$listeners = Get-NetTCPConnection -LocalPort $portToCheck -State Listen -ErrorAction SilentlyContinue
if ($listeners) {
  Write-Host "Aviso: a porta $portToCheck ja possui listener local. O Docker pode falhar ao publicar a porta."
}

Invoke-TechDeskCompose config *> $null
if ($LASTEXITCODE -ne 0) {
  throw "docker compose config falhou."
}

Invoke-TechDeskCompose pull
Invoke-TechDeskCompose up -d
Wait-TechDeskReady -TimeoutSeconds 120

Invoke-TechDeskCompose exec -T api node /app/deploy/seed-admin.js
Wait-TechDeskReady -TimeoutSeconds 60

Show-AccessUrls
Write-Host "Instalacao concluida. Troque a senha inicial, configure a empresa e gere o primeiro backup."
