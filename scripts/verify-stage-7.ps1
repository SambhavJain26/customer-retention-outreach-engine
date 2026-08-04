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

function ConvertTo-FlatArray {
    param($Value)
    $items = @()
    foreach ($item in @($Value)) {
        if ($item -is [array]) {
            foreach ($child in $item) { $items += $child }
        } else {
            $items += $item
        }
    }
    return $items
}

function Test-Truthy {
    param($Value)
    if ($Value -eq $true) { return $true }
    if ($Value -eq $false -or $null -eq $Value) { return $false }
    return @("true", "1", "yes", "y") -contains ([string] $Value).Trim().ToLowerInvariant()
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

function Get-Stage7TableIds {
    $path = Join-Path $root "tmp\stage7-data-table-ids.json"
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing $path. Run scripts/import-wf5-daily-sweep-reset.ps1 first."
    }
    return Get-Content -Raw $path | ConvertFrom-Json
}

function Read-DataTableRows {
    param(
        [Parameter(Mandatory)] [string] $TableName,
        [Parameter(Mandatory)] [string] $TableId,
        [Parameter(Mandatory)] [string] $KeyColumn
    )

    $workflowId = "stage7-read-$TableName"
    $webhookPath = "stage7-read-$TableName"
    $workflow = @{
        id = $workflowId
        name = "Stage 7 Read $TableName"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "$workflowId-trigger" -Name "Stage 7 Read $TableName Trigger" -Path $webhookPath -X 0 -Y 0),
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
        connections = @{ "Stage 7 Read $TableName Trigger" = New-N8nMainConnection -Node "Read $TableName Rows" }
        settings = @{}
    }

    $path = Join-Path $root "tmp\$workflowId.json"
    Write-Utf8NoBomJson -Path $path -Value $workflow
    $rawRows = Invoke-N8nWebhookWorkflowFile -WorkflowPath $path -WorkflowId $workflowId -WebhookPath $webhookPath
    $rows = ConvertTo-FlatArray $rawRows
    return @($rows | Where-Object {
        $property = $_.PSObject.Properties[$KeyColumn]
        $property -and $property.Value
    })
}

function Convert-LeaseRowToHashtable {
    param([Parameter(Mandatory)] $Row)
    return @{
        lease_id = [string] $Row.lease_id
        tenant_name = [string] $Row.tenant_name
        tenant_first_name = [string] $Row.tenant_first_name
        unit = [string] $Row.unit
        email = [string] $Row.email
        email_valid = Test-Truthy $Row.email_valid
        move_in_date = $Row.move_in_date
        lease_end_date = $Row.lease_end_date
        days_to_expiry = if ($null -eq $Row.days_to_expiry -or [string] $Row.days_to_expiry -eq "") { $null } else { [double] $Row.days_to_expiry }
        cohort = [string] $Row.cohort
        tenure_months = if ($null -eq $Row.tenure_months -or [string] $Row.tenure_months -eq "") { $null } else { [double] $Row.tenure_months }
        status = [string] $Row.status
        draft_subject = [string] $Row.draft_subject
        draft_body = [string] $Row.draft_body
        ref_token = [string] $Row.ref_token
        sent_at = $Row.sent_at
        opted_out = Test-Truthy $Row.opted_out
        ingest_notes = [string] $Row.ingest_notes
    }
}

function Invoke-JsonPost {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] $Body,
        [int] $TimeoutSec = 180,
        [switch] $AllowFailure
    )

    $json = $Body | ConvertTo-Json -Depth 30 -Compress
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

function Upsert-LeaseRows {
    param(
        [Parameter(Mandatory)] [string] $TableId,
        [Parameter(Mandatory)] $Rows
    )

    $rowsLiteral = ConvertTo-Json -InputObject @($Rows) -Depth 30 -Compress
    $workflowId = "stage7-upsert-leases"
    $webhookPath = "stage7-upsert-leases"
    $code = "return $rowsLiteral.map((row) => ({ json: row }));"
    $workflow = @{
        id = $workflowId
        name = "Stage 7 Upsert Leases"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "$workflowId-trigger" -Name "Stage 7 Upsert Leases Trigger" -Path $webhookPath -X 0 -Y 0),
            @{
                parameters = @{ jsCode = $code }
                id = "$workflowId-emit"
                name = "Emit Lease Rows"
                type = "n8n-nodes-base.code"
                typeVersion = 2
                position = @(280, 0)
            },
            @{
                parameters = @{
                    resource = "row"
                    operation = "upsert"
                    dataTableId = @{ __rl = $true; mode = "id"; value = $TableId }
                    matchType = "allConditions"
                    filters = @{ conditions = @(@{ keyName = "lease_id"; condition = "eq"; keyValue = "={{ `$json.lease_id }}" }) }
                    columns = @{
                        mappingMode = "defineBelow"
                        value = @{
                            lease_id = "={{ `$json.lease_id }}"
                            tenant_name = "={{ `$json.tenant_name }}"
                            tenant_first_name = "={{ `$json.tenant_first_name }}"
                            unit = "={{ `$json.unit }}"
                            email = "={{ `$json.email }}"
                            email_valid = "={{ `$json.email_valid }}"
                            move_in_date = "={{ `$json.move_in_date }}"
                            lease_end_date = "={{ `$json.lease_end_date }}"
                            days_to_expiry = "={{ `$json.days_to_expiry }}"
                            cohort = "={{ `$json.cohort }}"
                            tenure_months = "={{ `$json.tenure_months }}"
                            status = "={{ `$json.status }}"
                            draft_subject = "={{ `$json.draft_subject }}"
                            draft_body = "={{ `$json.draft_body }}"
                            ref_token = "={{ `$json.ref_token }}"
                            sent_at = "={{ `$json.sent_at }}"
                            opted_out = "={{ `$json.opted_out }}"
                            ingest_notes = "={{ `$json.ingest_notes }}"
                        }
                    }
                }
                id = "$workflowId-upsert"
                name = "Upsert Lease Rows"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(560, 0)
            }
        )
        connections = @{
            "Stage 7 Upsert Leases Trigger" = New-N8nMainConnection -Node "Emit Lease Rows"
            "Emit Lease Rows" = New-N8nMainConnection -Node "Upsert Lease Rows"
        }
        settings = @{}
    }

    $path = Join-Path $root "tmp\$workflowId.json"
    Write-Utf8NoBomJson -Path $path -Value $workflow
    Invoke-N8nWebhookWorkflowFile -WorkflowPath $path -WorkflowId $workflowId -WebhookPath $webhookPath | Out-Null
}

function Insert-LogRows {
    param(
        [Parameter(Mandatory)] [string] $TableId,
        [Parameter(Mandatory)] $Rows
    )

    $rowsLiteral = ConvertTo-Json -InputObject @($Rows) -Depth 30 -Compress
    $workflowId = "stage7-insert-log"
    $webhookPath = "stage7-insert-log"
    $code = "return $rowsLiteral.map((row) => ({ json: row }));"
    $workflow = @{
        id = $workflowId
        name = "Stage 7 Insert Log"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "$workflowId-trigger" -Name "Stage 7 Insert Log Trigger" -Path $webhookPath -X 0 -Y 0),
            @{
                parameters = @{ jsCode = $code }
                id = "$workflowId-emit"
                name = "Emit Log Rows"
                type = "n8n-nodes-base.code"
                typeVersion = 2
                position = @(280, 0)
            },
            @{
                parameters = @{
                    resource = "row"
                    operation = "insert"
                    dataTableId = @{ __rl = $true; mode = "id"; value = $TableId }
                    columns = @{
                        mappingMode = "defineBelow"
                        value = @{
                            event_id = "={{ `$json.event_id }}"
                            lease_id = "={{ `$json.lease_id }}"
                            event_type = "={{ `$json.event_type }}"
                            reply_text = "={{ `$json.reply_text }}"
                            intent = "={{ `$json.intent }}"
                            grievance_category = "={{ `$json.grievance_category }}"
                            grievance_summary = "={{ `$json.grievance_summary }}"
                            urgency = "={{ `$json.urgency }}"
                            compliance_flag = "={{ `$json.compliance_flag }}"
                            confidence = "={{ `$json.confidence }}"
                            requires_human = "={{ `$json.requires_human }}"
                            created_at = "={{ `$json.created_at }}"
                        }
                    }
                }
                id = "$workflowId-insert"
                name = "Insert Log Rows"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(560, 0)
            }
        )
        connections = @{
            "Stage 7 Insert Log Trigger" = New-N8nMainConnection -Node "Emit Log Rows"
            "Emit Log Rows" = New-N8nMainConnection -Node "Insert Log Rows"
        }
        settings = @{}
    }

    $path = Join-Path $root "tmp\$workflowId.json"
    Write-Utf8NoBomJson -Path $path -Value $workflow
    Invoke-N8nWebhookWorkflowFile -WorkflowPath $path -WorkflowId $workflowId -WebhookPath $webhookPath | Out-Null
}

Write-Host "==> Validating Stage 7 workflow and source files"
Get-Content -Raw .\n8n-workflows\wf5-daily-sweep-reset.json | ConvertFrom-Json | Out-Null
node --check .\scripts\stage-7-ops-lib.js | Out-Null
node --check .\scripts\stage-3-ingest-lib.js | Out-Null
$null = [System.Management.Automation.PSParser]::Tokenize((Get-Content -Raw .\scripts\import-wf5-daily-sweep-reset.ps1), [ref] $null)
$null = [System.Management.Automation.PSParser]::Tokenize((Get-Content -Raw .\scripts\verify-stage-7.ps1), [ref] $null)

$workflow = Get-Content -Raw .\n8n-workflows\wf5-daily-sweep-reset.json | ConvertFrom-Json
$gmailTenantNodes = @($workflow.nodes | Where-Object {
    [string] $_.type -eq "n8n-nodes-base.gmail" -and @("send", "reply") -contains [string] $_.parameters.operation
})
Assert-True ($gmailTenantNodes.Count -eq 0) "WF5 must not contain Gmail send/reply nodes."

Write-Host "==> Running Stage 7 helper unit checks"
@'
const lib = require("./scripts/stage-7-ops-lib.js");
const base = { lease_id: "l1", status: "SENT", sent_at: "2026-07-18", lease_end_date: "2026-10-23", cohort: "NONE", days_to_expiry: 999 };
const replyLogs = [{ lease_id: "l1", event_type: "REPLY_CLASSIFIED", intent: "STAYING", reply_text: "Thanks", requires_human: false }];
let result = lib.prepareSweepUpdates([base], [], {}, { base_date: "2026-08-04" });
if (result.summary.escalated_count !== 1) throw new Error("Expected old sent row without reply to escalate.");
result = lib.prepareSweepUpdates([base], replyLogs, {}, { base_date: "2026-08-04" });
if (result.summary.escalated_count !== 0) throw new Error("Expected meaningful reply to block escalation.");
result = lib.prepareSweepUpdates([base], [{ lease_id: "l1", event_type: "NO_SIGNAL", intent: "NO_SIGNAL" }], {}, { base_date: "2026-08-04" });
if (result.summary.escalated_count !== 1) throw new Error("Expected NO_SIGNAL to not count as meaningful reply.");
if (!lib.buildErrorAlertText({ workflow_name: "WF5", node_name: "Test", message: "Boom" }).includes("Boom")) throw new Error("Error alert text missing message.");
'@ | node -
Assert-True ($LASTEXITCODE -eq 0) "Stage 7 helper unit checks failed."

Write-Host "==> Importing WF5 and dashboard"
.\scripts\import-wf5-daily-sweep-reset.ps1 | Out-Host
.\scripts\import-wf2-dashboard.ps1 | Out-Host

$tableIds = Get-Stage7TableIds
$expected = Get-Content -Raw .\fixtures\roster-demo-expected.json | ConvertFrom-Json

Write-Host "==> Resetting demo through /reset-demo"
$reset = Invoke-JsonPost -Path "reset-demo" -Body @{} -TimeoutSec 180
Assert-True ([int] $reset.loaded_count -eq 40) "Expected reset loaded_count=40, got $($reset.loaded_count)."
Assert-True ([int] $reset.inserted_count -eq 40) "Expected reset inserted_count=40, got $($reset.inserted_count)."
Assert-True ([bool] $reset.cleared_outreach_log) "Reset response should report cleared_outreach_log=true."
Assert-True ([bool] $reset.cleared_leases) "Reset response should report cleared_leases=true."
Assert-True (-not [bool] $reset.gmail_processed_clear_requested) "Default reset should not request Gmail processed-label clearing."

$leases = @(Read-DataTableRows -TableName "leases" -TableId $tableIds.leases -KeyColumn "lease_id")
$logs = @(Read-DataTableRows -TableName "outreach-log" -TableId $tableIds.outreach_log -KeyColumn "event_id")
Assert-True ($leases.Count -eq 40) "Expected 40 lease rows after reset, got $($leases.Count)."
Assert-True ($logs.Count -eq 0) "Expected outreach_log to be empty after reset, got $($logs.Count)."

$actualCohorts = @{}
foreach ($lease in $leases) {
    $cohort = [string] $lease.cohort
    $actualCohorts[$cohort] = 1 + [int] ($actualCohorts[$cohort])
    Assert-True ([string] $lease.status -eq "PENDING") "Reset should set $($lease.lease_id) status=PENDING."
    Assert-True (-not [string] $lease.draft_subject) "Reset should clear draft_subject for $($lease.lease_id)."
    Assert-True (-not [string] $lease.draft_body) "Reset should clear draft_body for $($lease.lease_id)."
    Assert-True (-not [string] $lease.ref_token) "Reset should clear ref_token for $($lease.lease_id)."
    Assert-True (-not [string] $lease.sent_at) "Reset should clear sent_at for $($lease.lease_id)."
    Assert-True (-not (Test-Truthy $lease.opted_out)) "Reset should set opted_out=false for $($lease.lease_id)."
}
foreach ($property in $expected.cohort_counts.PSObject.Properties) {
    Assert-True ([int] $actualCohorts[$property.Name] -eq [int] $property.Value) "Expected cohort $($property.Name) count $($property.Value), got $($actualCohorts[$property.Name])."
}

$config = @(Read-DataTableRows -TableName "config" -TableId $tableIds.config -KeyColumn "key")
$demoEmail = [string] (@($config | Where-Object { [string] $_.key -eq "demo_recipient_email" } | Select-Object -First 1).value)
$demoRow = @($leases | Where-Object { [string] $_.tenant_name -eq "Avery Brooks" } | Select-Object -First 1)
Assert-True ($demoRow.Count -eq 1) "Expected Avery Brooks demo-priority row after reset."
if ($demoEmail) {
    Assert-True ([string] $demoRow[0].email -eq $demoEmail) "Demo-priority row email should be substituted from config.demo_recipient_email."
}

$board = Invoke-Board
Assert-True ($board.StatusCode -eq 200) "Board should return HTTP 200 after reset."
Assert-True (-not ([string] $board.Content).Contains("reset-demo")) "Board must not expose the reset-demo endpoint."

Write-Host "==> Seeding verifier-owned states for /daily-sweep"
$byName = @{}
foreach ($lease in $leases) { $byName[[string] $lease.tenant_name] = $lease }

$oldNoReply = Convert-LeaseRowToHashtable $byName["Avery Brooks"]
$oldNoReply.status = "SENT"
$oldNoReply.sent_at = "2026-07-18"
$oldNoReply.days_to_expiry = 999
$oldNoReply.cohort = "NONE"

$withReply = Convert-LeaseRowToHashtable $byName["Maria Santos"]
$withReply.status = "SENT"
$withReply.sent_at = "2026-07-18"
$withReply.days_to_expiry = 999
$withReply.cohort = "NONE"

$atRisk = Convert-LeaseRowToHashtable $byName["Darius King"]
$atRisk.status = "AT_RISK"

$staying = Convert-LeaseRowToHashtable $byName["Hannah Patel"]
$staying.status = "STAYING"

$draft = Convert-LeaseRowToHashtable $byName["Ben Okafor"]
$draft.status = "DRAFT"
$draft.draft_subject = "Saved draft [R-ABCD]"
$draft.draft_body = "Hi Ben, checking in personally. Is there anything around the home that still has not been sorted out? Maya"
$draft.ref_token = "R-ABCD"

$approved = Convert-LeaseRowToHashtable $byName["Grace Lee"]
$approved.status = "APPROVED"
$approved.draft_subject = "Approved draft [R-BCDE]"
$approved.draft_body = "Hi Grace, checking in personally. Is there anything around the home that still has not been sorted out? Maya"
$approved.ref_token = "R-BCDE"

$recentSent = Convert-LeaseRowToHashtable $byName["Isaac Moreno"]
$recentSent.status = "SENT"
$recentSent.sent_at = "2026-07-22"

$optedOut = Convert-LeaseRowToHashtable $byName["Lila Anderson"]
$optedOut.opted_out = $true

$noSignal = Convert-LeaseRowToHashtable $byName["Noah Kim"]
$noSignal.status = "SENT"
$noSignal.sent_at = "2026-07-18"
$noSignal.days_to_expiry = 999
$noSignal.cohort = "NONE"

Upsert-LeaseRows -TableId $tableIds.leases -Rows @($oldNoReply, $withReply, $atRisk, $staying, $draft, $approved, $recentSent, $optedOut, $noSignal)
Insert-LogRows -TableId $tableIds.outreach_log -Rows @(
    @{
        event_id = "stage7-meaningful-reply"
        lease_id = [string] $withReply.lease_id
        event_type = "REPLY_CLASSIFIED"
        reply_text = "Thanks, I am staying."
        intent = "STAYING"
        grievance_category = "NONE"
        grievance_summary = ""
        urgency = "LOW"
        compliance_flag = ""
        confidence = "HIGH"
        requires_human = $false
        created_at = "2026-07-25T12:00:00.000Z"
    },
    @{
        event_id = "stage7-no-signal-reply"
        lease_id = [string] $noSignal.lease_id
        event_type = "NO_SIGNAL"
        reply_text = "Out of office."
        intent = "NO_SIGNAL"
        grievance_category = "NONE"
        grievance_summary = ""
        urgency = "LOW"
        compliance_flag = ""
        confidence = "HIGH"
        requires_human = $false
        created_at = "2026-07-25T12:00:00.000Z"
    }
)

Write-Host "==> Running /daily-sweep"
$sweep = Invoke-JsonPost -Path "daily-sweep" -Body @{ base_date = "2026-08-04" } -TimeoutSec 180
Assert-True ([int] $sweep.recomputed_count -eq 40) "Expected sweep recomputed_count=40, got $($sweep.recomputed_count)."
Assert-True ([int] $sweep.escalated_count -eq 2) "Expected two new non-response escalations, got $($sweep.escalated_count)."
Assert-True ([int] $sweep.at_risk_count -eq 1) "Expected at_risk_count=1, got $($sweep.at_risk_count)."
Assert-True ([int] $sweep.staying_count -eq 1) "Expected staying_count=1, got $($sweep.staying_count)."
Assert-True ([bool] $sweep.digest_sent) "Verifier sweep should exercise the Telegram digest path."

$afterSweep = @(Read-DataTableRows -TableName "leases" -TableId $tableIds.leases -KeyColumn "lease_id")
$afterByName = @{}
foreach ($lease in $afterSweep) { $afterByName[[string] $lease.tenant_name] = $lease }

Assert-True ([string] $afterByName["Avery Brooks"].status -eq "ESCALATE") "Old SENT row with no meaningful reply should become ESCALATE."
Assert-True ([int] $afterByName["Avery Brooks"].days_to_expiry -eq 80) "Sweep should recompute Avery days_to_expiry to 80."
Assert-True ([string] $afterByName["Avery Brooks"].cohort -eq "90") "Sweep should recompute Avery cohort to 90."
Assert-True ([string] $afterByName["Maria Santos"].status -eq "SENT") "Old SENT row with meaningful reply should not escalate."
Assert-True ([int] $afterByName["Maria Santos"].days_to_expiry -eq 82) "Sweep should recompute Maria days_to_expiry to 82."
Assert-True ([string] $afterByName["Darius King"].status -eq "AT_RISK") "Sweep should preserve AT_RISK rows."
Assert-True ([string] $afterByName["Hannah Patel"].status -eq "STAYING") "Sweep should preserve STAYING rows."
Assert-True ([string] $afterByName["Ben Okafor"].status -eq "DRAFT") "Sweep should preserve DRAFT rows."
Assert-True ([string] $afterByName["Grace Lee"].status -eq "APPROVED") "Sweep should preserve APPROVED rows."
Assert-True ([string] $afterByName["Isaac Moreno"].status -eq "SENT") "Recent SENT row should not escalate."
Assert-True (Test-Truthy $afterByName["Lila Anderson"].opted_out) "Sweep should preserve opted_out=true."
Assert-True ([string] $afterByName["Noah Kim"].status -eq "ESCALATE") "NO_SIGNAL should not block non-response escalation."

$board = Invoke-Board
$html = [string] $board.Content
Assert-True ($board.StatusCode -eq 200) "Board should return HTTP 200 after sweep."
Assert-True ($html.Contains("ESCALATE")) "Board should render ESCALATE state after sweep."
Assert-True (-not $html.Contains("Stage 7 will wire")) "Board should not show Stage 7 stub messaging."

Write-Host "==> Exercising verifier-only error path"
$errorResult = Invoke-JsonPost -Path "stage7-test-error" -Body @{} -TimeoutSec 60 -AllowFailure
Assert-True ($errorResult -is [System.Management.Automation.ErrorRecord]) "stage7-test-error should intentionally fail after alert path."
$errorText = [string] $errorResult.ErrorDetails.Message
Assert-True ($errorText.Contains("Stage 7 verifier intentional error") -or [string] $errorResult.Exception.Message -match "500|error") "Expected intentional Stage 7 error response."

Write-Host "==> Final rehearsal reset"
$finalReset = Invoke-JsonPost -Path "reset-demo" -Body @{} -TimeoutSec 180
Assert-True ([int] $finalReset.inserted_count -eq 40) "Final reset should leave 40 demo rows."
$finalLogs = @(Read-DataTableRows -TableName "outreach-log" -TableId $tableIds.outreach_log -KeyColumn "event_id")
Assert-True ($finalLogs.Count -eq 0) "Final reset should leave outreach_log empty."

Write-Host "Stage 7 verification passed."
Write-Host "Board URL: http://localhost:5678/webhook/board"
