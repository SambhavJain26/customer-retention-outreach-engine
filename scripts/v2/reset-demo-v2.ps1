[CmdletBinding()]
param()

# Restores the v2 Airtable demo to its clean 40-resident state.
# This is the v2 equivalent of scripts/reset-demo.ps1 and the only helper the
# v2 operating guide uses. It touches the four demo tables in the base named by
# AIRTABLE_BASE_ID and nothing else.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$seedScript = Join-Path $PSScriptRoot "seed-airtable-demo.js"

if (-not (Test-Path $seedScript)) {
    Write-Error "Cannot find $seedScript"
    exit 1
}

Push-Location $repoRoot
try {
    node $seedScript
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Demo reset failed. Confirm AIRTABLE_PAT and AIRTABLE_BASE_ID are set in .env."
        exit 1
    }
    Write-Host ""
    Write-Host "Demo reset completed."
}
finally {
    Pop-Location
}
