[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$resetUrl = "http://localhost:5678/webhook/reset-demo"

try {
    $result = Invoke-RestMethod -Uri $resetUrl -Method Post -ContentType "application/json" -Body "{}" -TimeoutSec 180
    Write-Host "Demo reset completed."
    $result | ConvertTo-Json -Depth 8
}
catch {
    Write-Error "Demo reset failed. Confirm n8n is running and WF5 is active. $($_.Exception.Message)"
    exit 1
}
