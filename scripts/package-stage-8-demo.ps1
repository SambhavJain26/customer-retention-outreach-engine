. "$PSScriptRoot\stage-2-common.ps1"

$root = Get-RepoRoot
Set-Location $root

function Assert-True {
    param(
        [Parameter(Mandatory)] [bool] $Condition,
        [Parameter(Mandatory)] [string] $Message
    )
    if (-not $Condition) {
        throw $Message
    }
}

function Copy-RepoFile {
    param(
        [Parameter(Mandatory)] [string] $Source,
        [Parameter(Mandatory)] [string] $DestinationRoot
    )

    $sourcePath = Resolve-Path -LiteralPath $Source
    $destinationPath = Join-Path $DestinationRoot $Source
    $destinationDir = Split-Path -Parent $destinationPath
    New-Item -ItemType Directory -Force $destinationDir | Out-Null
    Copy-Item -LiteralPath $sourcePath.Path -Destination $destinationPath -Force
}

$workflowFiles = @(
    "n8n-workflows\wf1-ingest.json",
    "n8n-workflows\wf2-dashboard.json",
    "n8n-workflows\wf3-draft-approve-send.json",
    "n8n-workflows\wf4-reply-classify-route.json",
    "n8n-workflows\wf5-daily-sweep-reset.json"
)

$fixtureFiles = @(
    "fixtures\roster-demo.csv",
    "fixtures\roster-demo-expected.json",
    "fixtures\reply-fixtures.md",
    "fixtures\reply-fixtures-expected.json",
    "fixtures\data-table-schema.json"
)

$docFiles = @(
    "docs\stage-1-local-environment.md",
    "docs\stage-8-demo-runbook.md",
    "build-plan.md",
    "progress-notes.md"
)

$helperFiles = @(
    "scripts\setup-stage-2-data-tables.ps1",
    "scripts\import-wf1-ingest.ps1",
    "scripts\import-wf2-dashboard.ps1",
    "scripts\import-wf3-draft-approve-send.ps1",
    "scripts\import-wf4-reply-classify-route.ps1",
    "scripts\import-wf5-daily-sweep-reset.ps1",
    "scripts\verify-stage-8.ps1"
)

Write-Host "Validating workflow JSON..."
foreach ($workflow in $workflowFiles) {
    Get-Content -Raw $workflow | ConvertFrom-Json | Out-Null
}

Write-Host "Validating helper syntax..."
foreach ($script in @(
    "scripts\stage-3-ingest-lib.js",
    "scripts\stage-4-dashboard-lib.js",
    "scripts\stage-5-outbound-lib.js",
    "scripts\stage-6-reply-lib.js",
    "scripts\stage-7-ops-lib.js"
)) {
    node --check $script | Out-Null
    Assert-True ($LASTEXITCODE -eq 0) "JavaScript syntax check failed for $script."
}

foreach ($script in @(
    "scripts\package-stage-8-demo.ps1",
    "scripts\verify-stage-8.ps1"
)) {
    $errors = $null
    [System.Management.Automation.PSParser]::Tokenize((Get-Content -Raw $script), [ref] $errors) | Out-Null
    Assert-True (-not $errors) "PowerShell parser errors in $script."
}

$packageRoot = Join-Path $root "tmp\stage-8-demo-package"
if (Test-Path -LiteralPath $packageRoot) {
    Remove-Item -LiteralPath $packageRoot -Recurse -Force
}
New-Item -ItemType Directory -Force $packageRoot | Out-Null

foreach ($file in @($workflowFiles + $fixtureFiles + $docFiles + $helperFiles)) {
    Copy-RepoFile -Source $file -DestinationRoot $packageRoot
}

$manifest = @{
    generated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    local_board_url = "http://localhost:5678/webhook/board"
    local_endpoints = @{
        reset_demo = "http://localhost:5678/webhook/reset-demo"
        generate = "http://localhost:5678/webhook/generate"
        approve = "http://localhost:5678/webhook/approve"
        send = "http://localhost:5678/webhook/send"
        check_replies = "http://localhost:5678/webhook/check-replies"
        daily_sweep = "http://localhost:5678/webhook/daily-sweep"
    }
    workflows = $workflowFiles
    fixtures = $fixtureFiles
    docs = $docFiles
    helpers = $helperFiles
    fallback = "Docs-only fallback. No video file is generated in Stage 8."
}
Write-Utf8NoBomJson -Path (Join-Path $packageRoot "manifest.json") -Value $manifest

$readme = @"
# Stage 8 Demo Package

Generated locally from the committed renewal-retention demo repository.

Open the runbook first:

`docs\stage-8-demo-runbook.md`

Primary local board:

`http://localhost:5678/webhook/board`

This package intentionally contains no credentials, no real tenant data, no local `.env`, and no n8n credential exports.
"@
[System.IO.File]::WriteAllText((Join-Path $packageRoot "README.md"), $readme, [System.Text.UTF8Encoding]::new($false))

Write-Host "Stage 8 demo package written to $packageRoot"
