. "$PSScriptRoot\stage-2-common.ps1"

$root = Get-RepoRoot
Set-Location $root

function New-WebhookTriggerNode {
    param([string] $Id, [string] $Name, [string] $Path, [int] $X, [int] $Y)
    return @{
        parameters = @{
            httpMethod = "POST"
            path = $Path
            responseMode = "lastNode"
            responseData = "allEntries"
            options = @{ responseContentType = "application/json" }
        }
        id = $Id
        name = $Name
        type = "n8n-nodes-base.webhook"
        typeVersion = 2.1
        position = @($X, $Y)
        webhookId = $Id
    }
}

function Invoke-JsonWebhookWithRetry {
    param(
        [Parameter(Mandatory)] [string] $Url,
        [string] $Method = "POST"
    )

    $deadline = (Get-Date).AddSeconds(60)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -TimeoutSec 120
            if (-not $response.Content) {
                return $null
            }
            return $response.Content | ConvertFrom-Json
        } catch {
            if ((Get-Date) -ge $deadline) {
                throw
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

function Invoke-FormUrlWithRetry {
    $url = "http://localhost:5678/form/roster-upload"
    $deadline = (Get-Date).AddSeconds(60)
    do {
        try {
            $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -TimeoutSec 30
            if ($response.StatusCode -eq 200) {
                return
            }
        } catch {
            if ((Get-Date) -ge $deadline) {
                throw
            }
            Start-Sleep -Seconds 3
        }
    } while ($true)
}

function Get-Stage3TableIds {
    $path = Join-Path $root "tmp\stage3-data-table-ids.json"
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing $path. Run scripts/import-wf1-ingest.ps1 first."
    }
    return Get-Content -Raw $path | ConvertFrom-Json
}

function Clear-LeasesTable {
    param([Parameter(Mandatory)] [string] $LeasesTableId)

    $workflow = @{
        id = "stage3-clear-leases"
        name = "Stage 3 Clear Leases"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "stage3-clear-leases-trigger" -Name "Stage 3 Clear Leases Trigger" -Path "stage3-clear-leases" -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "row"
                    operation = "deleteRows"
                    dataTableId = @{ __rl = $true; mode = "id"; value = $LeasesTableId }
                    matchType = "allConditions"
                    filters = @{ conditions = @(@{ keyName = "lease_id"; condition = "isNotEmpty" }) }
                }
                id = "stage3-delete-lease-rows"
                name = "Delete Lease Rows"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(280, 0)
            }
        )
        connections = @{ "Stage 3 Clear Leases Trigger" = New-N8nMainConnection -Node "Delete Lease Rows" }
        settings = @{}
    }

    $path = Join-Path $root "tmp\stage3-clear-leases.json"
    Write-Utf8NoBomJson -Path $path -Value $workflow
    Invoke-N8nWebhookWorkflowFile -WorkflowPath $path -WorkflowId "stage3-clear-leases" -WebhookPath "stage3-clear-leases" | Out-Null
}

function Read-LeasesTable {
    param([Parameter(Mandatory)] [string] $LeasesTableId)

    $workflow = @{
        id = "stage3-read-leases"
        name = "Stage 3 Read Leases"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "stage3-read-leases-trigger" -Name "Stage 3 Read Leases Trigger" -Path "stage3-read-leases" -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "row"
                    operation = "get"
                    dataTableId = @{ __rl = $true; mode = "id"; value = $LeasesTableId }
                    returnAll = $true
                }
                id = "stage3-read-lease-rows"
                name = "Read Lease Rows"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(280, 0)
                alwaysOutputData = $true
            }
        )
        connections = @{ "Stage 3 Read Leases Trigger" = New-N8nMainConnection -Node "Read Lease Rows" }
        settings = @{}
    }

    $path = Join-Path $root "tmp\stage3-read-leases.json"
    Write-Utf8NoBomJson -Path $path -Value $workflow
    $rawRows = Invoke-N8nWebhookWorkflowFile -WorkflowPath $path -WorkflowId "stage3-read-leases" -WebhookPath "stage3-read-leases"
    $rows = @()
    foreach ($entry in @($rawRows)) {
        if ($entry -is [array]) {
            foreach ($child in $entry) {
                $rows += $child
            }
        } else {
            $rows += $entry
        }
    }
    return @($rows | Where-Object { $_.lease_id })
}

function Wait-ForLeasesCount {
    param(
        [Parameter(Mandatory)] [string] $LeasesTableId,
        [Parameter(Mandatory)] [int] $ExpectedCount,
        [string] $Context = "leases table"
    )

    $deadline = (Get-Date).AddSeconds(45)
    $lastRows = @()
    do {
        $lastRows = @(Read-LeasesTable -LeasesTableId $LeasesTableId)
        if ($lastRows.Count -eq $ExpectedCount) {
            return $lastRows
        }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)

    throw "Expected $ExpectedCount rows in $Context, got $($lastRows.Count)."
}

function Set-LeaseStateForPreservationTest {
    param(
        [Parameter(Mandatory)] [string] $LeasesTableId,
        [Parameter(Mandatory)] [string] $LeaseId
    )

    $sentAt = "2026-08-04T12:34:56.000Z"
    $workflow = @{
        id = "stage3-set-preserve-state"
        name = "Stage 3 Set Preserve State"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "stage3-set-state-trigger" -Name "Stage 3 Set State Trigger" -Path "stage3-set-preserve-state" -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "row"
                    operation = "update"
                    dataTableId = @{ __rl = $true; mode = "id"; value = $LeasesTableId }
                    matchType = "allConditions"
                    filters = @{ conditions = @(@{ keyName = "lease_id"; condition = "eq"; keyValue = $LeaseId }) }
                    columns = @{
                        mappingMode = "defineBelow"
                        value = @{
                            status = "SENT"
                            draft_subject = "Stage 3 Preserve Subject"
                            draft_body = "Stage 3 preserve body"
                            ref_token = "R-STAGE3"
                            sent_at = $sentAt
                            opted_out = $true
                        }
                    }
                }
                id = "stage3-update-preserve-row"
                name = "Update Preserve Row"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(280, 0)
            }
        )
        connections = @{ "Stage 3 Set State Trigger" = New-N8nMainConnection -Node "Update Preserve Row" }
        settings = @{}
    }

    $path = Join-Path $root "tmp\stage3-set-preserve-state.json"
    Write-Utf8NoBomJson -Path $path -Value $workflow
    Invoke-N8nWebhookWorkflowFile -WorkflowPath $path -WorkflowId "stage3-set-preserve-state" -WebhookPath "stage3-set-preserve-state" | Out-Null
    return $sentAt
}

function Assert-True {
    param(
        [Parameter(Mandatory)] [bool] $Condition,
        [Parameter(Mandatory)] [string] $Message
    )
    if (-not $Condition) {
        throw $Message
    }
}

function Split-IngestNotes {
    param($Value)
    if (-not $Value) {
        return @()
    }
    return @([string]$Value -split ";" | Where-Object { $_ })
}

Write-Host "==> Regenerating Stage 2 fixtures"
node .\scripts\generate-stage-2-fixtures.js

Write-Host "==> Validating WF1 workflow template JSON"
Get-Content -Raw .\n8n-workflows\wf1-ingest.json | ConvertFrom-Json | Out-Null

Write-Host "==> Importing WF1 ingest workflow"
.\scripts\import-wf1-ingest.ps1
$tableIds = Get-Stage3TableIds

Write-Host "==> Verifying form URL registration"
Invoke-FormUrlWithRetry

Write-Host "==> Clearing local demo leases table"
Clear-LeasesTable -LeasesTableId $tableIds.leases

Write-Host "==> Uploading roster fixture through WF1 API"
$firstUpload = Invoke-Wf1Upload -CsvPath ".\fixtures\roster-demo.csv"
Assert-True ($firstUpload.loaded_count -eq 40) "Expected upload loaded_count=40, got $($firstUpload.loaded_count)."
Assert-True ($firstUpload.flagged_count -eq 8) "Expected upload flagged_count=8, got $($firstUpload.flagged_count)."

$expected = Get-Content -Raw .\fixtures\roster-demo-expected.json | ConvertFrom-Json
$leases = @(Wait-ForLeasesCount -LeasesTableId $tableIds.leases -ExpectedCount 40 -Context "leases after first upload")

$actualCohorts = @{}
foreach ($lease in $leases) {
    $actualCohorts[[string]$lease.cohort] = ($actualCohorts[[string]$lease.cohort] + 1)
}
foreach ($name in @("120", "90", "60", "30", "NONE", "EXPIRED")) {
    $expectedCount = [int]$expected.cohort_counts.$name
    $actualCount = [int]$actualCohorts[$name]
    Assert-True ($actualCount -eq $expectedCount) "Expected cohort $name count $expectedCount, got $actualCount."
}

foreach ($flagged in $expected.flagged_rows) {
    $matches = @($leases | Where-Object { $_.unit -eq $flagged.unit })
    Assert-True ($matches.Count -ge 1) "No lease row found for flagged unit '$($flagged.unit)'."
    $matched = $false
    foreach ($match in $matches) {
        $actualNotes = Split-IngestNotes $match.ingest_notes
        $missingNotes = @($flagged.expected_notes | Where-Object { $actualNotes -notcontains $_ })
        if ($missingNotes.Count -eq 0) {
            $matched = $true
            break
        }
    }
    Assert-True $matched "Flagged unit '$($flagged.unit)' did not include expected notes '$($flagged.expected_notes -join ';')'."
}

$missingEmail = $leases | Where-Object { $_.unit -eq "Hillcrest 2" } | Select-Object -First 1
Assert-True ($null -ne $missingEmail -and $missingEmail.email_valid -eq $false) "Missing email row was not visible with email_valid=false."
$typoEmail = $leases | Where-Object { $_.unit -eq "Meadow 6" } | Select-Object -First 1
Assert-True ($null -ne $typoEmail -and $typoEmail.email_valid -eq $false) "Typo-domain email row was not visible with email_valid=false."
$ambiguousDate = $leases | Where-Object { $_.unit -eq "Spruce 10" } | Select-Object -First 1
Assert-True ($null -ne $ambiguousDate -and $ambiguousDate.cohort -eq "NONE") "Ambiguous date row did not land in cohort=NONE."
$duplicateUnits = @($leases | Where-Object { $_.unit -eq "Oakridge 12" })
Assert-True ($duplicateUnits.Count -eq 2) "Expected duplicate unit Oakridge 12 to produce 2 rows, got $($duplicateUnits.Count)."
Assert-True (($duplicateUnits | Select-Object -ExpandProperty lease_id -Unique).Count -eq 2) "Duplicate unit rows did not have distinct lease IDs."

Write-Host "==> Re-uploading roster fixture to prove idempotency"
$secondUpload = Invoke-Wf1Upload -CsvPath ".\fixtures\roster-demo.csv"
Assert-True ($secondUpload.loaded_count -eq 40) "Expected second upload loaded_count=40, got $($secondUpload.loaded_count)."
$leasesAfterSecond = @(Wait-ForLeasesCount -LeasesTableId $tableIds.leases -ExpectedCount 40 -Context "leases after second upload")

Write-Host "==> Verifying workflow-owned state preservation"
$preserveLease = $leasesAfterSecond | Where-Object { $_.cohort -eq "90" -and $_.email_valid -eq $true } | Select-Object -First 1
Assert-True ($null -ne $preserveLease) "Could not find a preservation-test lease row."
$sentAt = Set-LeaseStateForPreservationTest -LeasesTableId $tableIds.leases -LeaseId $preserveLease.lease_id
Invoke-Wf1Upload -CsvPath ".\fixtures\roster-demo.csv" | Out-Null
$leasesAfterPreserve = @(Wait-ForLeasesCount -LeasesTableId $tableIds.leases -ExpectedCount 40 -Context "leases after preservation re-upload")
$preserved = $leasesAfterPreserve | Where-Object { $_.lease_id -eq $preserveLease.lease_id } | Select-Object -First 1
Assert-True ($preserved.status -eq "SENT") "Re-upload reset status; expected SENT, got $($preserved.status)."
Assert-True ($preserved.draft_subject -eq "Stage 3 Preserve Subject") "Re-upload reset draft_subject."
Assert-True ($preserved.draft_body -eq "Stage 3 preserve body") "Re-upload reset draft_body."
Assert-True ($preserved.ref_token -eq "R-STAGE3") "Re-upload reset ref_token."
Assert-True ($preserved.opted_out -eq $true) "Re-upload reset opted_out."
Assert-True (-not [string]::IsNullOrWhiteSpace([string]$preserved.sent_at)) "Re-upload cleared sent_at; expected value derived from $sentAt."

Write-Host "Stage 3 verification passed."
Write-Host "Loaded leases: $($leasesAfterPreserve.Count)"
Write-Host "Flagged rows: $($firstUpload.flagged_count)"
Write-Host "WF1 form: http://localhost:5678/form/roster-upload"
Write-Host "WF1 API: http://localhost:5678/webhook/roster-upload-api"
