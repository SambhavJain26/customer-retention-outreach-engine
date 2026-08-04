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

function Get-Stage5TableIds {
    $path = Join-Path $root "tmp\stage5-data-table-ids.json"
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing $path. Run scripts/import-wf3-draft-approve-send.ps1 first."
    }
    return Get-Content -Raw $path | ConvertFrom-Json
}

function Clear-DataTableRows {
    param(
        [Parameter(Mandatory)] [string] $TableName,
        [Parameter(Mandatory)] [string] $TableId,
        [Parameter(Mandatory)] [string] $KeyColumn
    )

    $workflowId = "stage5-clear-$TableName"
    $webhookPath = "stage5-clear-$TableName"
    $workflow = @{
        id = $workflowId
        name = "Stage 5 Clear $TableName"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "$workflowId-trigger" -Name "Stage 5 Clear $TableName Trigger" -Path $webhookPath -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "row"
                    operation = "deleteRows"
                    dataTableId = @{ __rl = $true; mode = "id"; value = $TableId }
                    matchType = "allConditions"
                    filters = @{ conditions = @(@{ keyName = $KeyColumn; condition = "isNotEmpty" }) }
                }
                id = "$workflowId-delete-rows"
                name = "Delete $TableName Rows"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(280, 0)
            }
        )
        connections = @{ "Stage 5 Clear $TableName Trigger" = New-N8nMainConnection -Node "Delete $TableName Rows" }
        settings = @{}
    }

    $path = Join-Path $root "tmp\$workflowId.json"
    Write-Utf8NoBomJson -Path $path -Value $workflow

    for ($attempt = 1; $attempt -le 10; $attempt++) {
        Invoke-N8nWebhookWorkflowFile -WorkflowPath $path -WorkflowId $workflowId -WebhookPath $webhookPath | Out-Null
        $remaining = @(Read-DataTableRows -TableName $TableName -TableId $TableId -KeyColumn $KeyColumn)
        if ($remaining.Count -eq 0) { return }
        Write-Host "Still clearing $TableName rows: $($remaining.Count) remaining after attempt $attempt"
    }

    throw "Failed to clear $TableName after 10 attempts."
}

function Read-DataTableRows {
    param(
        [Parameter(Mandatory)] [string] $TableName,
        [Parameter(Mandatory)] [string] $TableId,
        [Parameter(Mandatory)] [string] $KeyColumn
    )

    $workflowId = "stage5-read-$TableName"
    $webhookPath = "stage5-read-$TableName"
    $workflow = @{
        id = $workflowId
        name = "Stage 5 Read $TableName"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "$workflowId-trigger" -Name "Stage 5 Read $TableName Trigger" -Path $webhookPath -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "row"
                    operation = "get"
                    dataTableId = @{ __rl = $true; mode = "id"; value = $TableId }
                    returnAll = $true
                }
                id = "$workflowId-read-rows"
                name = "Read $TableName Rows"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(280, 0)
                alwaysOutputData = $true
            }
        )
        connections = @{ "Stage 5 Read $TableName Trigger" = New-N8nMainConnection -Node "Read $TableName Rows" }
        settings = @{}
    }

    $path = Join-Path $root "tmp\$workflowId.json"
    Write-Utf8NoBomJson -Path $path -Value $workflow
    $rawRows = Invoke-N8nWebhookWorkflowFile -WorkflowPath $path -WorkflowId $workflowId -WebhookPath $webhookPath
    $rows = @()
    foreach ($entry in @($rawRows)) {
        if ($entry -is [array]) {
            foreach ($child in $entry) { $rows += $child }
        } else {
            $rows += $entry
        }
    }
    return @($rows | Where-Object {
        $property = $_.PSObject.Properties[$KeyColumn]
        $property -and $property.Value
    })
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

function Invoke-JsonPost {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] $Body,
        [int] $TimeoutSec = 180,
        [switch] $AllowFailure
    )

    $json = $Body | ConvertTo-Json -Depth 20 -Compress
    try {
        return Invoke-RestMethod -Uri "http://localhost:5678/webhook/$Path" -Method Post -Body $json -ContentType "application/json" -TimeoutSec $TimeoutSec
    } catch {
        if ($AllowFailure) { return $_ }
        throw
    }
}

function Invoke-Board {
    return Invoke-WebRequest -Uri "http://localhost:5678/webhook/board" -Method Get -UseBasicParsing -TimeoutSec 30
}

Write-Host "==> Validating Stage 5 workflow template JSON"
Get-Content -Raw .\n8n-workflows\wf3-draft-approve-send.json | ConvertFrom-Json | Out-Null

Write-Host "==> Validating Stage 5 JavaScript syntax"
node --check .\scripts\stage-5-outbound-lib.js
Assert-True ($LASTEXITCODE -eq 0) "Stage 5 outbound library syntax check failed."
node --check .\scripts\stage-4-dashboard-lib.js
Assert-True ($LASTEXITCODE -eq 0) "Stage 4 dashboard library syntax check failed after Stage 5 wiring."

Write-Host "==> Running guardrail unit checks"
@'
const { guardDraft } = require("./scripts/stage-5-outbound-lib.js");
const lease = { tenant_first_name: "Avery" };
const safe = guardDraft(lease, "Quick check-in", "Hi Avery, I was looking over Cedar Row 9 and thought of you. You have been with us for a little over three years, and I wanted to check in personally. Is there anything around the home that still has not been sorted out? Maya");
if (!safe.ok) throw new Error(`Expected safe draft to pass: ${safe.violations.join("; ")}`);
for (const body of [
  "Hi Avery, your renewal offer expires tomorrow. Can you sign by Friday? Maya",
  "Hi Resident, rent will increase by $50. Is that okay? Maya",
  "Hi Avery, checking in. Is anything unresolved? Can we help? Maya",
]) {
  const result = guardDraft(lease, "Renewal notice", body);
  if (result.ok) throw new Error(`Expected guardrail to block: ${body}`);
}
'@ | node -
Assert-True ($LASTEXITCODE -eq 0) "Guardrail unit checks failed."

Write-Host "==> Importing WF1, WF3, and WF2"
.\scripts\import-wf1-ingest.ps1 | Out-Host
.\scripts\import-wf3-draft-approve-send.ps1 | Out-Host
.\scripts\import-wf2-dashboard.ps1 | Out-Host

$tableIds = Get-Stage5TableIds

Write-Host "==> Resetting demo Data Tables"
Clear-DataTableRows -TableName "outreach-log" -TableId $tableIds.outreach_log -KeyColumn "event_id"
Clear-DataTableRows -TableName "leases" -TableId $tableIds.leases -KeyColumn "lease_id"

Write-Host "==> Uploading demo roster"
node .\scripts\generate-stage-2-fixtures.js
$upload = Invoke-Wf1Upload -CsvPath ".\fixtures\roster-demo.csv"
Assert-True ($upload.loaded_count -eq 40) "Expected upload loaded_count=40, got $($upload.loaded_count)."
Assert-True ($upload.flagged_count -eq 8) "Expected upload flagged_count=8, got $($upload.flagged_count)."

Write-Host "==> Generating 90-day drafts"
$timer = [System.Diagnostics.Stopwatch]::StartNew()
$generate = Invoke-JsonPost -Path "generate" -Body @{ cohort = "90" } -TimeoutSec 240
$timer.Stop()
Assert-True ($timer.ElapsedMilliseconds -lt 30000) "Draft generation took $($timer.ElapsedMilliseconds)ms, expected under 30000ms."
Assert-True (($generate.generated_count + $generate.review_failed_count) -eq 14) "Expected generation to handle 14 rows, got generated=$($generate.generated_count), review_failed=$($generate.review_failed_count)."
Assert-True ($generate.generated_count -ge 13) "Expected at least 13 usable generated drafts for the POC, got $($generate.generated_count)."
Assert-True ($generate.review_failed_count -le 1) "Expected no more than one visible needs-wording row for the POC, got $($generate.review_failed_count)."

$leases = Read-DataTableRows -TableName "leases" -TableId $tableIds.leases -KeyColumn "lease_id"
$draftRows = @($leases | Where-Object { [string] $_.status -eq "DRAFT" })
$reviewFailedRows = @($leases | Where-Object { [string] $_.status -eq "REVIEW_FAILED" })
Assert-True (($draftRows.Count + $reviewFailedRows.Count) -eq 14) "Expected 14 generated/review rows, got DRAFT=$($draftRows.Count), REVIEW_FAILED=$($reviewFailedRows.Count)."
Assert-True ($draftRows.Count -ge 13) "Expected at least 13 DRAFT rows, got $($draftRows.Count)."

$tokenSet = @{}
foreach ($row in $draftRows) {
    Assert-True ([string] $row.ref_token -match '^R-[0-9A-F]{4}$') "Invalid ref_token for $($row.lease_id): $($row.ref_token)"
    Assert-True ([string] $row.draft_subject -match "\[$($row.ref_token)\]$") "Subject missing token for $($row.lease_id)."
    Assert-True ([string] $row.draft_body -match [regex]::Escape([string] $row.tenant_first_name)) "Draft body missing first name for $($row.lease_id)."
    $tokenSet[[string] $row.ref_token] = $true
}
Assert-True ($tokenSet.Count -eq 14) "Expected 14 unique ref_tokens, got $($tokenSet.Count)."

$variationKeys = @{}
foreach ($row in $draftRows) {
    $body = ([string] $row.draft_body).ToLowerInvariant()
    $body = $body -replace [regex]::Escape(([string] $row.tenant_first_name).ToLowerInvariant()), ""
    $body = $body -replace '\b\d+\b', ''
    $body = $body -replace '\s+', ' '
    $variationKeys[$body.Trim()] = $true
}
Assert-True ($variationKeys.Count -gt 1) "Generated drafts did not show meaningful variation."

$demoRow = $draftRows | Where-Object { [string] $_.tenant_name -eq "Avery Brooks" } | Select-Object -First 1
Assert-True ([bool] $demoRow) "Could not find demo-priority Avery Brooks row after generation."
$unsafeTarget = $draftRows | Where-Object { [string] $_.lease_id -ne [string] $demoRow.lease_id } | Select-Object -First 1
$skipTarget = $draftRows | Where-Object { [string] $_.lease_id -ne [string] $demoRow.lease_id -and [string] $_.lease_id -ne [string] $unsafeTarget.lease_id } | Select-Object -First 1

Write-Host "==> Verifying unsafe edit rejection"
$unsafe = Invoke-JsonPost -Path "approve" -Body @{
    action = "edit"
    lease_id = [string] $unsafeTarget.lease_id
    edited_subject = "Renewal notice"
    edited_body = 'Hi Resident, your renewal offer expires tomorrow and rent will increase by $50. Can you sign by Friday? Maya'
} -AllowFailure
Assert-True ($unsafe -is [System.Management.Automation.ErrorRecord]) "Expected unsafe edit to fail."

Write-Host "==> Verifying inline edit persistence"
$editedSubject = "Quick check-in [$($demoRow.ref_token)]"
$editedBody = "Hi Avery, I was looking over Cedar Row 9 and thought of you. You have been with us for a little over three years, and I wanted to check in personally. Is there anything around the home that still has not been sorted out? Maya"
$edit = Invoke-JsonPost -Path "approve" -Body @{
    action = "edit"
    lease_id = [string] $demoRow.lease_id
    edited_subject = $editedSubject
    edited_body = $editedBody
}
Assert-True ($edit.updated_count -eq 1) "Expected edit updated_count=1, got $($edit.updated_count)."

$leases = Read-DataTableRows -TableName "leases" -TableId $tableIds.leases -KeyColumn "lease_id"
$demoRow = $leases | Where-Object { [string] $_.tenant_name -eq "Avery Brooks" } | Select-Object -First 1
Assert-True ([string] $demoRow.draft_body -eq $editedBody) "Inline edit did not persist."

Write-Host "==> Verifying skip and approve all"
$skip = Invoke-JsonPost -Path "approve" -Body @{ action = "skip"; lease_id = [string] $skipTarget.lease_id }
Assert-True ($skip.updated_count -eq 1) "Expected skip updated_count=1, got $($skip.updated_count)."
$approveAll = Invoke-JsonPost -Path "approve" -Body @{ action = "approve_all" }
$expectedApprovedAfterSkip = $draftRows.Count - 1
Assert-True ($approveAll.updated_count -eq $expectedApprovedAfterSkip) "Expected approve_all to approve $expectedApprovedAfterSkip rows after one skip, got $($approveAll.updated_count)."

Write-Host "==> Sending only the demo-priority row and checking idempotency"
$sendOne = Invoke-JsonPost -Path "send" -Body @{ lease_ids = @([string] $demoRow.lease_id) } -TimeoutSec 120
Assert-True ($sendOne.sent_count -eq 1) "Expected first send sent_count=1, got $($sendOne.sent_count)."
$sendAgain = Invoke-JsonPost -Path "send" -Body @{ lease_ids = @([string] $demoRow.lease_id) } -TimeoutSec 120
Assert-True ($sendAgain.sent_count -eq 0) "Expected second send sent_count=0, got $($sendAgain.sent_count)."

$leases = Read-DataTableRows -TableName "leases" -TableId $tableIds.leases -KeyColumn "lease_id"
$sentRows = @($leases | Where-Object { [string] $_.status -eq "SENT" })
$skippedRows = @($leases | Where-Object { [string] $_.status -eq "SKIPPED" })
Assert-True ($sentRows.Count -eq 1) "Expected exactly one SENT row after priority-only verification send, got $($sentRows.Count)."
Assert-True ([string] $sentRows[0].lease_id -eq [string] $demoRow.lease_id) "The SENT row was not the demo-priority row."
Assert-True ($skippedRows.Count -eq 1) "Expected exactly one SKIPPED row, got $($skippedRows.Count)."

$logs = Read-DataTableRows -TableName "outreach-log" -TableId $tableIds.outreach_log -KeyColumn "event_id"
$sentLogs = @($logs | Where-Object { [string] $_.event_type -eq "SENT" -and [string] $_.lease_id -eq [string] $demoRow.lease_id })
Assert-True ($sentLogs.Count -eq 1) "Expected exactly one SENT outreach_log row for the demo row, got $($sentLogs.Count)."

Write-Host "==> Verifying dashboard Stage 5 wiring"
$board = Invoke-Board
$html = [string] $board.Content
Assert-True ($board.StatusCode -eq 200) "Expected board HTTP 200, got $($board.StatusCode)."
Assert-True ($html.Contains('data-action="generate"')) "Board did not include real generate action."
Assert-True ($html.Contains('data-action="approve-all"')) "Board did not include real approve-all action."
Assert-True ($html.Contains('data-action="send"')) "Board did not include real send action."
Assert-True (-not $html.Contains("Stage 5 will wire")) "Board still contained Stage 5 stub messaging."
Assert-True ($html.Contains($editedBody)) "Board did not show the persisted inline edit."
$expectedRemainingApproved = $expectedApprovedAfterSkip - 1
$expectedQueueTotal = $draftRows.Count - 1 + $reviewFailedRows.Count
$expectedFooter = "Send approved ($expectedRemainingApproved of $expectedQueueTotal)"
Assert-True ($html.Contains($expectedFooter)) "Board did not show the expected approved count after one send and one skip. Expected '$expectedFooter'."

Write-Host "Stage 5 verification passed."
Write-Host "Draft generation: $($timer.ElapsedMilliseconds)ms"
Write-Host "Board URL: http://localhost:5678/webhook/board"
