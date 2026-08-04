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

function Invoke-BoardWithRetry {
    $url = "http://localhost:5678/webhook/board"
    $deadline = (Get-Date).AddSeconds(60)
    $lastError = $null
    do {
        try {
            $timer = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -TimeoutSec 30
            $timer.Stop()
            return @{ Response = $response; ElapsedMs = $timer.ElapsedMilliseconds }
        } catch {
            $lastError = $_
            if ((Get-Date) -ge $deadline) {
                throw $lastError
            }
            Start-Sleep -Seconds 3
        }
    } while ($true)
}

function Invoke-Wf1Upload {
    param([Parameter(Mandatory)] [string] $CsvPath)

    $url = "http://localhost:5678/webhook/roster-upload-api"
    $resolvedCsv = (Resolve-Path -LiteralPath $CsvPath).Path
    $deadline = (Get-Date).AddSeconds(60)
    do {
        $output = & curl.exe -sS -w "`n%{http_code}" -X POST -F "lease_roster=@$resolvedCsv;type=text/csv" $url
        $exitCode = $LASTEXITCODE
        $lines = @($output)
        $statusLine = $lines[-1]
        $body = if ($lines.Count -gt 1) { ($lines[0..($lines.Count - 2)] -join "`n") } else { "" }
        if ($exitCode -eq 0 -and [int]$statusLine -ge 200 -and [int]$statusLine -lt 300) {
            return $body | ConvertFrom-Json
        }
        if ((Get-Date) -ge $deadline) {
            throw "WF1 upload failed with curl exit $exitCode, HTTP $statusLine, body: $body"
        }
        Start-Sleep -Seconds 3
    } while ($true)
}

function Ensure-RosterData {
    Write-Host "==> Ensuring WF1 ingest is active and roster data exists"
    .\scripts\import-wf1-ingest.ps1 | Out-Host
    $upload = Invoke-Wf1Upload -CsvPath ".\fixtures\roster-demo.csv"
    Assert-True ($upload.loaded_count -eq 40) "Expected WF1 upload loaded_count=40, got $($upload.loaded_count)."
    Assert-True ($upload.flagged_count -eq 8) "Expected WF1 upload flagged_count=8, got $($upload.flagged_count)."
}

Write-Host "==> Validating WF2 workflow template JSON"
Get-Content -Raw .\n8n-workflows\wf2-dashboard.json | ConvertFrom-Json | Out-Null

Write-Host "==> Validating Stage 4 dashboard library syntax"
node --check .\scripts\stage-4-dashboard-lib.js
Assert-True ($LASTEXITCODE -eq 0) "Dashboard library JavaScript syntax check failed."

Ensure-RosterData

Write-Host "==> Importing WF2 dashboard workflow"
.\scripts\import-wf2-dashboard.ps1 | Out-Host

Write-Host "==> Fetching board HTML"
$result = Invoke-BoardWithRetry
$response = $result.Response
$html = [string] $response.Content

Assert-True ($response.StatusCode -eq 200) "Expected board HTTP 200, got $($response.StatusCode)."
$contentType = [string] $response.Headers["Content-Type"]
Assert-True ($contentType -like "text/html*") "Expected board Content-Type text/html, got '$contentType'."
Assert-True ($result.ElapsedMs -lt 1000) "Expected board response under 1000ms, got $($result.ElapsedMs)ms."

foreach ($heading in @("120 days", "90 days", "60 days", "30 days")) {
    Assert-True ($html.Contains($heading)) "Board HTML did not contain cohort heading '$heading'."
}

Assert-True ($html.Contains("40</strong> of 168 units")) "Board HTML did not show 40 of 168 units."
Assert-True ($html.Contains("8 need attention")) "Board HTML did not show 8 need attention."
Assert-True ($html.Contains("14</strong> in the 90-day window")) "Board HTML did not show 14 in the 90-day window."

foreach ($unit in @("Spruce 10", "Meadow 6", "Hillcrest 2", "Sunset 7", "Orchard 21", "Vista 16")) {
    Assert-True ($html.Contains($unit)) "Board HTML did not contain flagged unit '$unit'."
}

$expectedCounts = @{
    "120" = 6
    "90" = 14
    "60" = 11
    "30" = 6
}
foreach ($cohort in $expectedCounts.Keys) {
    $needle = "data-cohort-count=`"$cohort`">$($expectedCounts[$cohort])</span>"
    Assert-True ($html.Contains($needle)) "Board HTML did not contain expected cohort $cohort count $($expectedCounts[$cohort])."
}

Assert-True (-not ($html -match "https?://")) "Board HTML should not contain external URL dependencies."
Assert-True ($html.Contains('data-stub="generate"')) "Board HTML did not include the Stage 5 generate stub control."
Assert-True ($html.Contains('data-stub="check-replies"')) "Board HTML did not include the Stage 6 check-replies stub control."
Assert-True ($html.Contains("'Stage 5'")) "Board HTML did not include Stage 5 stub messaging."
Assert-True ($html.Contains("'Stage 6'")) "Board HTML did not include Stage 6 stub messaging."

Write-Host "Stage 4 verification passed."
Write-Host "Board response: $($result.ElapsedMs)ms"
Write-Host "Board URL: http://localhost:5678/webhook/board"
