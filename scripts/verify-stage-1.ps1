Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step {
    param([string] $Message)
    Write-Host ""
    Write-Host "==> $Message"
}

Write-Step "Docker versions"
docker --version
docker compose version

Write-Step "Compose configuration"
docker compose config | Out-Null
Write-Host "docker compose config: ok"

Write-Step "n8n container status"
docker compose ps

Write-Step "n8n HTTP readiness"
$url = "http://localhost:5678"
$deadline = (Get-Date).AddSeconds(90)
$ok = $false
do {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            $ok = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 3
    }
} while ((Get-Date) -lt $deadline)

if (-not $ok) {
    throw "n8n did not respond at $url within 90 seconds. Check: docker compose logs n8n"
}
Write-Host "n8n reachable: $url"

Write-Step "n8n version"
docker compose exec -T n8n n8n --version

Write-Step "Credential checks"
Write-Host "This script does not test private credentials."
Write-Host "Credential smoke tests are tracked in progress-notes.md after they are run through n8n."
