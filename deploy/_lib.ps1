$ErrorActionPreference = "Stop"

$Script:DeployRoot = $PSScriptRoot
$Script:EnvPath = Join-Path $Script:DeployRoot ".env"
$Script:ExampleEnvPath = Join-Path $Script:DeployRoot ".env.example"
$Script:ComposeFile = Join-Path $Script:DeployRoot "docker-compose.yml"
$Script:Version = (Get-Content -LiteralPath (Join-Path $Script:DeployRoot "VERSION") -Raw).Trim()

function Get-TechDeskEnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [string]$Default = ""
  )

  if (-not (Test-Path -LiteralPath $Script:EnvPath)) {
    return $Default
  }

  foreach ($line in Get-Content -LiteralPath $Script:EnvPath) {
    if ($line -match "^\s*$([regex]::Escape($Name))=(.*)$") {
      return $Matches[1].Trim()
    }
  }

  return $Default
}

function Get-TechDeskProjectName {
  return Get-TechDeskEnvValue -Name "TECHDESK_PROJECT_NAME" -Default "techdesk-prod"
}

function Get-TechDeskPort {
  return Get-TechDeskEnvValue -Name "TECHDESK_PORT" -Default "8080"
}

function Invoke-TechDeskCompose {
  if (-not (Test-Path -LiteralPath $Script:EnvPath)) {
    throw "Arquivo .env nao encontrado em $Script:EnvPath. Execute install.ps1 primeiro."
  }

  $baseArgs = @(
    "compose",
    "-p", (Get-TechDeskProjectName),
    "--env-file", $Script:EnvPath,
    "-f", $Script:ComposeFile
  )

  & docker @baseArgs @args
}

function Assert-DockerAvailable {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker nao encontrado. Instale o Docker Desktop e tente novamente."
  }

  & docker compose version | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose nao encontrado ou indisponivel."
  }

  & docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker daemon nao esta rodando. Abra o Docker Desktop e aguarde iniciar."
  }
}

function Get-AccessBaseUrl {
  $port = Get-TechDeskPort
  if ($port -eq "80") {
    return "http://127.0.0.1"
  }

  return "http://127.0.0.1:$port"
}

function Show-AccessUrls {
  $port = Get-TechDeskPort
  $suffix = if ($port -eq "80") { "" } else { ":$port" }
  $urls = New-Object System.Collections.Generic.List[string]
  $urls.Add("http://localhost$suffix")
  $urls.Add("http://$env:COMPUTERNAME$suffix")

  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.PrefixOrigin -ne "WellKnown"
    } |
    ForEach-Object {
      $urls.Add("http://$($_.IPAddress)$suffix")
    }

  Write-Host "Possiveis URLs de acesso:"
  $urls | Select-Object -Unique | ForEach-Object { Write-Host "  $_" }
}

function Wait-TechDeskReady {
  param(
    [int]$TimeoutSeconds = 120
  )

  $baseUrl = Get-AccessBaseUrl
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing -TimeoutSec 5
      $ready = Invoke-WebRequest -Uri "$baseUrl/api/ready" -UseBasicParsing -TimeoutSec 5

      if ($health.StatusCode -eq 200 -and $ready.StatusCode -eq 200) {
        Write-Host "TechDesk Pro esta healthy/ready."
        return
      }
    } catch {
      Start-Sleep -Seconds 5
    }
  }

  Write-Host "Timeout aguardando healthchecks. Ultimos containers:"
  Invoke-TechDeskCompose ps
  Write-Host "Logs recentes da API:"
  Invoke-TechDeskCompose logs --tail 80 api
  throw "TechDesk Pro nao ficou ready dentro do tempo esperado."
}

function New-HexSecret {
  param(
    [int]$ByteCount = 32
  )

  $bytes = [byte[]]::new($ByteCount)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return (($bytes | ForEach-Object { $_.ToString("x2") }) -join "")
}
