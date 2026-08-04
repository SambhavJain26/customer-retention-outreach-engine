. "$PSScriptRoot\stage-2-common.ps1"

$root = Get-RepoRoot
Set-Location $root

New-Item -ItemType Directory -Force .\tmp | Out-Null

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

function Get-LocalDataTableIds {
    $schema = Get-Content -Raw .\fixtures\data-table-schema.json | ConvertFrom-Json
    $listWorkflow = @{
        id = "stage7-list-data-tables"
        name = "Stage 7 List Data Tables"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "stage7-list-trigger" -Name "Stage 7 List Trigger" -Path "stage7-list-data-tables" -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "table"
                    operation = "list"
                    returnAll = $true
                    options = @{ sortField = "name"; sortDirection = "asc" }
                }
                id = "stage7-list-tables"
                name = "List Data Tables"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(240, 0)
            }
        )
        connections = @{ "Stage 7 List Trigger" = New-N8nMainConnection -Node "List Data Tables" }
        settings = @{}
    }

    $listPath = Join-Path $root "tmp\stage7-list-data-tables.json"
    Write-Utf8NoBomJson -Path $listPath -Value $listWorkflow
    $tables = @(Invoke-N8nWebhookWorkflowFile -WorkflowPath $listPath -WorkflowId "stage7-list-data-tables" -WebhookPath "stage7-list-data-tables")
    return Resolve-Stage2DataTableIds -Tables $tables -Schema $schema
}

function Get-LocalCredentialIdFromFile {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] [string] $CredentialType,
        [Parameter(Mandatory)] [string] $CredentialName
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing local credential smoke artifact $Path. Re-run Stage 1 credential smoke tests or update this importer to resolve credential '$CredentialName'."
    }

    $workflow = Get-Content -Raw $Path | ConvertFrom-Json
    foreach ($node in @($workflow.nodes)) {
        $credentialProperty = $node.PSObject.Properties["credentials"]
        if (-not $credentialProperty) { continue }
        $credentials = $credentialProperty.Value
        $typedCredentialProperty = $credentials.PSObject.Properties[$CredentialType]
        if ($typedCredentialProperty -and [string] $typedCredentialProperty.Value.name -eq $CredentialName) {
            $id = [string] $typedCredentialProperty.Value.id
            if ($id) { return $id }
        }
    }

    throw "Could not find credential '$CredentialName' of type '$CredentialType' in $Path."
}

function Set-WorkflowCodeNode {
    param(
        [Parameter(Mandatory)] $Workflow,
        [Parameter(Mandatory)] [string] $NodeName,
        [Parameter(Mandatory)] [string] $Code
    )

    $node = $Workflow.nodes | Where-Object { $_.name -eq $NodeName } | Select-Object -First 1
    if (-not $node) {
        throw "Workflow node '$NodeName' was not found."
    }
    $node.parameters.jsCode = $Code
}

function Set-WorkflowDataTableId {
    param(
        [Parameter(Mandatory)] $Workflow,
        [Parameter(Mandatory)] [string] $NodeName,
        [Parameter(Mandatory)] [string] $DataTableId
    )

    $node = $Workflow.nodes | Where-Object { $_.name -eq $NodeName } | Select-Object -First 1
    if (-not $node) {
        throw "Workflow node '$NodeName' was not found."
    }
    $node.parameters.dataTableId.value = $DataTableId
}

function Set-CredentialId {
    param(
        [Parameter(Mandatory)] $Workflow,
        [Parameter(Mandatory)] [string] $CredentialType,
        [Parameter(Mandatory)] [string] $CredentialName,
        [Parameter(Mandatory)] [string] $CredentialId
    )

    foreach ($node in @($Workflow.nodes)) {
        $credentialProperty = $node.PSObject.Properties["credentials"]
        if (-not $credentialProperty) { continue }
        $credentials = $credentialProperty.Value
        $typedCredentialProperty = $credentials.PSObject.Properties[$CredentialType]
        if ($typedCredentialProperty -and [string] $typedCredentialProperty.Value.name -eq $CredentialName) {
            $typedCredentialProperty.Value.id = $CredentialId
        }
    }
}

$workflowPath = Join-Path $root "n8n-workflows\wf5-daily-sweep-reset.json"
$workflow = Get-Content -Raw $workflowPath | ConvertFrom-Json
$tableIds = Get-LocalDataTableIds
$telegramCredentialId = Get-LocalCredentialIdFromFile -Path ".\tmp\stage1-telegram-smoke.json" -CredentialType "telegramApi" -CredentialName "Telegram account"

$stage3Library = Get-Content -Raw .\scripts\stage-3-ingest-lib.js
$stage7Library = Get-Content -Raw .\scripts\stage-7-ops-lib.js
$rosterCsvText = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath .\fixtures\roster-demo.csv).Path)
$rosterCsvLiteral = ConvertTo-Json -InputObject $rosterCsvText -Compress

$prepareSweepUpdatesCode = @"
$stage7Library

let requestBody = {};
try {
  const trigger = `$items("Daily Sweep Webhook")[0]?.json || {};
  requestBody = trigger.body || trigger || {};
} catch (_) {
  requestBody = {};
}
const configRows = `$items("Read Config for Sweep").map((item) => item.json).filter((row) => row && row.key);
const leases = `$items("Read Leases for Sweep").map((item) => item.json).filter((row) => row && row.lease_id);
const logRows = `$items("Read Outreach Log for Sweep").map((item) => item.json).filter((row) => row && row.event_id);
const config = opsConfig(configRows);
const result = prepareSweepUpdates(leases, logRows, config, requestBody);

if (!result.updates.length) {
  return [{ json: { _has_updates: false, _sweep_summary: result.summary, _config: config } }];
}

return result.updates.map((row) => ({
  json: { ...row, _has_updates: true, _sweep_summary: result.summary, _config: config },
}));
"@

$prepareSweepDigestCode = @"
$stage7Library

const prepared = `$items("Prepare Sweep Updates").map((item) => item.json);
const first = prepared[0] || {};
const summary = first._sweep_summary || {};
const config = first._config || {};
const chatId = opsText(config.telegram_chat_id);

return [{
  json: {
    ...summary,
    _sweep_summary: summary,
    _telegram_chat_id: chatId,
    _digest_text: buildSweepDigest(summary, config),
    _send_digest: Boolean(chatId && !summary.digest_suppressed),
  },
}];
"@

$buildSweepResponseCode = @"
const digest = `$items("Prepare Sweep Digest")[0]?.json || {};
const summary = digest._sweep_summary || digest;

return [{
  json: {
    ...summary,
    digest_sent: Boolean(digest._send_digest),
    digest_text: digest._digest_text || "",
  },
}];
"@

$buildResetRowsCode = @"
$stage3Library

$stage7Library

let requestBody = {};
try {
  const trigger = `$items("Reset Demo Webhook")[0]?.json || {};
  requestBody = trigger.body || trigger || {};
} catch (_) {
  requestBody = {};
}

const configRows = `$items("Read Config for Reset").map((item) => item.json).filter((row) => row && row.key);
const config = opsConfig(configRows);
const reset = buildResetRows($rosterCsvLiteral, config);
reset.summary.gmail_processed_clear_requested = opsBool(requestBody.clear_gmail_processed);

return [{
  json: {
    _reset_rows: reset.rows,
    _reset_summary: reset.summary,
  },
}];
"@

$emitResetLeaseRowsCode = @"
const context = `$items("Build Reset Rows")[0]?.json || {};
const rows = Array.isArray(context._reset_rows) ? context._reset_rows : [];
const summary = context._reset_summary || {};
return rows.map((row) => ({ json: { ...row, _reset_summary: summary } }));
"@

$buildResetResponseCode = @"
const context = `$items("Build Reset Rows")[0]?.json || {};
const summary = context._reset_summary || {};
const rows = `$items("Emit Reset Lease Rows").map((item) => item.json);

return [{
  json: {
    ...summary,
    inserted_count: rows.length,
  },
}];
"@

$buildErrorAlertCode = @"
$stage7Library

const configRows = `$items("Read Config for Error Alert").map((item) => item.json).filter((row) => row && row.key);
const config = opsConfig(configRows);
let errorInput = {};
try {
  errorInput = `$items("Workflow Error Trigger")[0]?.json || {};
} catch (_) {
  errorInput = {};
}

return [{
  json: {
    _telegram_chat_id: opsText(config.telegram_chat_id),
    _error_text: buildErrorAlertText(errorInput),
  },
}];
"@

$buildTestErrorAlertCode = @"
$stage7Library

const configRows = `$items("Read Config for Test Error").map((item) => item.json).filter((row) => row && row.key);
const config = opsConfig(configRows);
const text = buildErrorAlertText({
  workflow_name: "WF5 Daily Sweep, Error Alerts, and Reset",
  node_name: "Stage 7 Test Error Webhook",
  message: "Stage 7 verifier intentional error after Telegram alert.",
});

return [{
  json: {
    _telegram_chat_id: opsText(config.telegram_chat_id),
    _error_text: text,
  },
}];
"@

Set-WorkflowCodeNode -Workflow $workflow -NodeName "Prepare Sweep Updates" -Code $prepareSweepUpdatesCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Prepare Sweep Digest" -Code $prepareSweepDigestCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Sweep Response" -Code $buildSweepResponseCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Reset Rows" -Code $buildResetRowsCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Emit Reset Lease Rows" -Code $emitResetLeaseRowsCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Reset Response" -Code $buildResetResponseCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Error Alert" -Code $buildErrorAlertCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Test Error Alert" -Code $buildTestErrorAlertCode

foreach ($nodeName in @(
    "Read Config for Sweep",
    "Read Config for Reset",
    "Read Config for Error Alert",
    "Read Config for Test Error"
)) {
    Set-WorkflowDataTableId -Workflow $workflow -NodeName $nodeName -DataTableId $tableIds["config"]
}

foreach ($nodeName in @(
    "Read Leases for Sweep",
    "Upsert Sweep Lease Rows",
    "Delete Leases for Reset",
    "Insert Reset Lease Rows"
)) {
    Set-WorkflowDataTableId -Workflow $workflow -NodeName $nodeName -DataTableId $tableIds["leases"]
}

foreach ($nodeName in @(
    "Read Outreach Log for Sweep",
    "Delete Outreach Log for Reset"
)) {
    Set-WorkflowDataTableId -Workflow $workflow -NodeName $nodeName -DataTableId $tableIds["outreach_log"]
}

Set-CredentialId -Workflow $workflow -CredentialType "telegramApi" -CredentialName "Telegram account" -CredentialId $telegramCredentialId

$localWorkflowPath = Join-Path $root "tmp\wf5-daily-sweep-reset.local.json"
Write-Utf8NoBomJson -Path $localWorkflowPath -Value $workflow
Write-Utf8NoBomJson -Path (Join-Path $root "tmp\stage7-data-table-ids.json") -Value $tableIds

Import-N8nWorkflowFile -WorkflowPath $localWorkflowPath
Enable-N8nWorkflow -WorkflowId "wf5-daily-sweep-reset"

Write-Host "WF5 Daily Sweep, Error Alerts, and Reset imported and activated."
Write-Host "Daily sweep URL: http://localhost:5678/webhook/daily-sweep"
Write-Host "Reset demo URL: http://localhost:5678/webhook/reset-demo"
Write-Host "Stage 7 test error URL: http://localhost:5678/webhook/stage7-test-error"
