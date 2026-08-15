. "$PSScriptRoot\_lib.ps1"

Assert-DockerAvailable
Invoke-TechDeskCompose restart
Wait-TechDeskReady -TimeoutSeconds 120
Show-AccessUrls
