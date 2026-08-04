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
        id = "stage6-list-data-tables"
        name = "Stage 6 List Data Tables"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "stage6-list-trigger" -Name "Stage 6 List Trigger" -Path "stage6-list-data-tables" -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "table"
                    operation = "list"
                    returnAll = $true
                    options = @{ sortField = "name"; sortDirection = "asc" }
                }
                id = "stage6-list-tables"
                name = "List Data Tables"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(240, 0)
            }
        )
        connections = @{ "Stage 6 List Trigger" = New-N8nMainConnection -Node "List Data Tables" }
        settings = @{}
    }

    $listPath = Join-Path $root "tmp\stage6-list-data-tables.json"
    Write-Utf8NoBomJson -Path $listPath -Value $listWorkflow
    $tables = @(Invoke-N8nWebhookWorkflowFile -WorkflowPath $listPath -WorkflowId "stage6-list-data-tables" -WebhookPath "stage6-list-data-tables")
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

function Resolve-GmailProcessedLabelId {
    param([Parameter(Mandatory)] [string] $GmailCredentialId)

    $cachedPath = Join-Path $root "tmp\stage6-gmail-processed-label.json"
    if (Test-Path -LiteralPath $cachedPath) {
        $cached = Get-Content -Raw $cachedPath | ConvertFrom-Json
        if ([string] $cached.id) {
            return [string] $cached.id
        }
    }

    $listWorkflow = @{
        id = "stage6-list-gmail-labels"
        name = "Stage 6 List Gmail Labels"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "stage6-list-labels-trigger" -Name "Stage 6 List Labels Trigger" -Path "stage6-list-gmail-labels" -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "label"
                    operation = "getAll"
                    returnAll = $true
                }
                id = "stage6-list-labels-node"
                name = "Gmail List Labels"
                type = "n8n-nodes-base.gmail"
                typeVersion = 2.2
                position = @(240, 0)
                credentials = @{
                    gmailOAuth2 = @{ id = $GmailCredentialId; name = "Gmail account" }
                }
            }
        )
        connections = @{ "Stage 6 List Labels Trigger" = New-N8nMainConnection -Node "Gmail List Labels" }
        settings = @{}
    }

    $listPath = Join-Path $root "tmp\stage6-list-gmail-labels.json"
    Write-Utf8NoBomJson -Path $listPath -Value $listWorkflow
    $rawLabels = @(Invoke-N8nWebhookWorkflowFile -WorkflowPath $listPath -WorkflowId "stage6-list-gmail-labels" -WebhookPath "stage6-list-gmail-labels")
    $labels = @()
    foreach ($label in @($rawLabels)) {
        if ($label -is [array]) {
            $labels += $label
        } else {
            $labels += $label
        }
    }
    $match = @($labels | Where-Object { [string] $_.name -eq "processed" } | Select-Object -First 1)
    if ($match.Count -eq 1 -and [string] $match[0].id) {
        return [string] $match[0].id
    }

    $createWorkflow = @{
        id = "stage6-create-gmail-processed-label"
        name = "Stage 6 Create Gmail Processed Label"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "stage6-create-label-trigger" -Name "Stage 6 Create Label Trigger" -Path "stage6-create-gmail-processed-label" -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "label"
                    operation = "create"
                    name = "processed"
                    options = @{
                        labelListVisibility = "labelHide"
                        messageListVisibility = "hide"
                    }
                }
                id = "stage6-create-label-node"
                name = "Gmail Create Processed Label"
                type = "n8n-nodes-base.gmail"
                typeVersion = 2.2
                position = @(240, 0)
                credentials = @{
                    gmailOAuth2 = @{ id = $GmailCredentialId; name = "Gmail account" }
                }
            }
        )
        connections = @{ "Stage 6 Create Label Trigger" = New-N8nMainConnection -Node "Gmail Create Processed Label" }
        settings = @{}
    }

    $createPath = Join-Path $root "tmp\stage6-create-gmail-processed-label.json"
    Write-Utf8NoBomJson -Path $createPath -Value $createWorkflow
    $created = @(Invoke-N8nWebhookWorkflowFile -WorkflowPath $createPath -WorkflowId "stage6-create-gmail-processed-label" -WebhookPath "stage6-create-gmail-processed-label")
    $createdLabel = @($created | Select-Object -First 1)
    if ($createdLabel.Count -ne 1 -or -not [string] $createdLabel[0].id) {
        throw "Could not create or resolve Gmail label 'processed'."
    }
    return [string] $createdLabel[0].id
}

$workflowPath = Join-Path $root "n8n-workflows\wf4-reply-classify-route.json"
$workflow = Get-Content -Raw $workflowPath | ConvertFrom-Json
$tableIds = Get-LocalDataTableIds
$openAiCredentialId = Get-LocalCredentialIdFromFile -Path ".\tmp\stage1-openai-smoke.import.json" -CredentialType "openAiApi" -CredentialName "OpenAI account"
$gmailCredentialId = Get-LocalCredentialIdFromFile -Path ".\tmp\stage1-gmail-smoke.json" -CredentialType "gmailOAuth2" -CredentialName "Gmail account"
$telegramCredentialId = Get-LocalCredentialIdFromFile -Path ".\tmp\stage1-telegram-smoke.json" -CredentialType "telegramApi" -CredentialName "Telegram account"
$processedLabelId = Resolve-GmailProcessedLabelId -GmailCredentialId $gmailCredentialId

$library = Get-Content -Raw .\scripts\stage-6-reply-lib.js

$prepareReplySourceCode = @"
$library

const trigger = `$items("Check Replies Webhook")[0]?.json || {};
const requestBody = trigger.body || trigger;
const configRows = `$items("Read Config for Replies").map((item) => item.json).filter((row) => row && row.key);
const leases = `$items("Read Leases for Replies").map((item) => item.json).filter((row) => row && row.lease_id);
const logRows = `$items("Read Outreach Log for Replies").map((item) => item.json).filter((row) => row && row.event_id);
const config = buildConfig(configRows);
config.gmail_processed_label_id = "$processedLabelId";

return [{
  json: {
    requestBody,
    config,
    leases,
    logRows,
    _use_gmail: !hasManualReplyPayload(requestBody),
  },
}];
"@

$buildGmailWorkItemCode = @"
$library

const ctx = `$items("Prepare Reply Source")[0].json;
const messages = `$input.all().map((item) => item.json).filter((row) => row && (row.id || row.messageId || row.subject || row.textPlain || row.text || row.snippet));
if (!messages.length) {
  return [{ json: noReplyResult(ctx.config, "gmail") }];
}
const reply = normalizeGmailMessage(messages[0]);
reply.processed_label_id = ctx.config.gmail_processed_label_id;
const result = prepareReplyWorkItem(reply, ctx.config, ctx.leases, ctx.logRows);
return [{ json: result }];
"@

$buildManualWorkItemCode = @"
$library

const ctx = `$items("Prepare Reply Source")[0].json;
const reply = normalizeManualReply(ctx.requestBody);
reply.processed_label_id = ctx.config.gmail_processed_label_id;
const result = prepareReplyWorkItem(reply, ctx.config, ctx.leases, ctx.logRows);
return [{ json: result }];
"@

$finalizeAiRouteCode = @"
$library

const workItem = `$items("If Needs AI Classification")[0].json;
const openAiOutput = (`$input.all()[0] || {}).json || {};
return [{ json: finalizeAiRoute(workItem, openAiOutput, new Date().toISOString()) }];
"@

$finalizeTerminalRouteCode = @"
return `$input.all().map((item) => ({ json: item.json }));
"@

$emitLeaseUpdateCode = @"
const route = (`$input.all()[0] || {}).json || {};
const leaseUpdate = route._lease_update;
if (!leaseUpdate) {
  return [{ json: { _has_lease_update: false, _route_result: route } }];
}
return [{ json: { ...leaseUpdate, _has_lease_update: true, _route_result: route } }];
"@

$emitLogRowCode = @"
const emitted = `$items("Emit Lease Update")[0]?.json || {};
const route = emitted._route_result || (`$input.all()[0] || {}).json._route_result || (`$input.all()[0] || {}).json || {};
const logRow = route._log_row;
if (!logRow || route._skip_log) {
  return [{ json: { _has_log_row: false, _route_result: route } }];
}
return [{ json: { ...logRow, _has_log_row: true, _route_result: route } }];
"@

$prepareAlertCode = @"
const emitted = `$items("Emit Reply Log Row")[0]?.json || {};
const route = emitted._route_result || {};
const chatId = route._telegram_chat_id || "";
return [{
  json: {
    _route_result: route,
    _send_alert: Boolean(route._should_alert && chatId),
    _telegram_chat_id: chatId,
    _telegram_text: route._telegram_text || "",
    _has_gmail_message: Boolean(route._gmail_message_id),
    _gmail_message_id: route._gmail_message_id || "",
    _processed_label_id: route._processed_label_id || "",
    _has_processed_label: Boolean(route._processed_label_id),
  },
}];
"@

$buildCheckRepliesResponseCode = @"
const emitted = `$items("Emit Reply Log Row")[0]?.json || {};
const route = emitted._route_result || {};
return [{
  json: {
    ok: route.ok !== false,
    action: "check_replies",
    source: route.source || "manual",
    processed_count: route.processed_count || 0,
    alerted_count: route.alerted_count || 0,
    duplicate_count: route.duplicate_count || 0,
    no_signal_count: route.no_signal_count || 0,
    unmatched_count: route.unmatched_count || 0,
    event_id: route.event_id || "",
    lease_id: route.lease_id || "",
    match_method: route.match_method || "",
    classification: route.classification || null,
    duplicate: Boolean(route.duplicate),
    message: route.message || "",
    board_url: route.board_url || "http://localhost:5678/webhook/board",
  },
}];
"@

Set-WorkflowCodeNode -Workflow $workflow -NodeName "Prepare Reply Source" -Code $prepareReplySourceCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Gmail Work Item" -Code $buildGmailWorkItemCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Manual Work Item" -Code $buildManualWorkItemCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Finalize AI Route" -Code $finalizeAiRouteCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Finalize Terminal Route" -Code $finalizeTerminalRouteCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Emit Lease Update" -Code $emitLeaseUpdateCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Emit Reply Log Row" -Code $emitLogRowCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Prepare Telegram Alert" -Code $prepareAlertCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Check Replies Response" -Code $buildCheckRepliesResponseCode

foreach ($nodeName in @("Read Config for Replies")) {
    Set-WorkflowDataTableId -Workflow $workflow -NodeName $nodeName -DataTableId $tableIds["config"]
}

foreach ($nodeName in @("Read Leases for Replies", "Upsert Lease Route")) {
    Set-WorkflowDataTableId -Workflow $workflow -NodeName $nodeName -DataTableId $tableIds["leases"]
}

foreach ($nodeName in @("Read Outreach Log for Replies", "Insert Reply Log Row")) {
    Set-WorkflowDataTableId -Workflow $workflow -NodeName $nodeName -DataTableId $tableIds["outreach_log"]
}

Set-CredentialId -Workflow $workflow -CredentialType "openAiApi" -CredentialName "OpenAI account" -CredentialId $openAiCredentialId
Set-CredentialId -Workflow $workflow -CredentialType "gmailOAuth2" -CredentialName "Gmail account" -CredentialId $gmailCredentialId
Set-CredentialId -Workflow $workflow -CredentialType "telegramApi" -CredentialName "Telegram account" -CredentialId $telegramCredentialId

$localWorkflowPath = Join-Path $root "tmp\wf4-reply-classify-route.local.json"
Write-Utf8NoBomJson -Path $localWorkflowPath -Value $workflow
Write-Utf8NoBomJson -Path (Join-Path $root "tmp\stage6-data-table-ids.json") -Value $tableIds
Write-Utf8NoBomJson -Path (Join-Path $root "tmp\stage6-gmail-processed-label.json") -Value @{ id = $processedLabelId; name = "processed" }

Import-N8nWorkflowFile -WorkflowPath $localWorkflowPath
Enable-N8nWorkflow -WorkflowId "wf4-reply-classify-route"

Write-Host "WF4 Reply Matching, Classification, and Routing imported and activated."
Write-Host "Check replies URL: http://localhost:5678/webhook/check-replies"
