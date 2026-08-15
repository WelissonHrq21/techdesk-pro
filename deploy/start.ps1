. "$PSScriptRoot\_lib.ps1"

Assert-DockerAvailable
Invoke-TechDeskCompose up -d
Wait-TechDeskReady -TimeoutSeconds 120
Show-AccessUrls
