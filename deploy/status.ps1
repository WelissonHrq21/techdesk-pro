. "$PSScriptRoot\_lib.ps1"

Write-Host "TechDesk Pro v$Script:Version"
Assert-DockerAvailable
Invoke-TechDeskCompose ps

$baseUrl = Get-AccessBaseUrl
try {
  $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing -TimeoutSec 5
  Write-Host "Health: $($health.StatusCode)"
} catch {
  Write-Host "Health: error"
}

try {
  $ready = Invoke-WebRequest -Uri "$baseUrl/api/ready" -UseBasicParsing -TimeoutSec 5
  Write-Host "Ready: $($ready.StatusCode)"
} catch {
  Write-Host "Ready: error"
}

Show-AccessUrls
