. "$PSScriptRoot\_lib.ps1"

Assert-DockerAvailable
Invoke-TechDeskCompose stop
Write-Host "TechDesk Pro parado com seguranca. Volumes e dados foram preservados."
