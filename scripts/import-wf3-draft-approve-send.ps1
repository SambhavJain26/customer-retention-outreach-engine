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
        id = "stage5-list-data-tables"
        name = "Stage 5 List Data Tables"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "stage5-list-trigger" -Name "Stage 5 List Trigger" -Path "stage5-list-data-tables" -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "table"
                    operation = "list"
                    returnAll = $true
                    options = @{ sortField = "name"; sortDirection = "asc" }
                }
                id = "stage5-list-tables"
                name = "List Data Tables"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(240, 0)
            }
        )
        connections = @{ "Stage 5 List Trigger" = New-N8nMainConnection -Node "List Data Tables" }
        settings = @{}
    }

    $listPath = Join-Path $root "tmp\stage5-list-data-tables.json"
    Write-Utf8NoBomJson -Path $listPath -Value $listWorkflow
    $tables = @(Invoke-N8nWebhookWorkflowFile -WorkflowPath $listPath -WorkflowId "stage5-list-data-tables" -WebhookPath "stage5-list-data-tables")
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

$workflowPath = Join-Path $root "n8n-workflows\wf3-draft-approve-send.json"
$workflow = Get-Content -Raw $workflowPath | ConvertFrom-Json
$tableIds = Get-LocalDataTableIds
$openAiCredentialId = Get-LocalCredentialIdFromFile -Path ".\tmp\stage1-openai-smoke.import.json" -CredentialType "openAiApi" -CredentialName "OpenAI account"
$gmailCredentialId = Get-LocalCredentialIdFromFile -Path ".\tmp\stage1-gmail-smoke.json" -CredentialType "gmailOAuth2" -CredentialName "Gmail account"

$library = Get-Content -Raw .\scripts\stage-5-outbound-lib.js

$prepareDraftBatchCode = @"
$library

const trigger = `$items("Generate Drafts Webhook")[0]?.json || {};
const requestBody = trigger.body || trigger;
const configRows = `$items("Read Config for Generate").map((item) => item.json).filter((row) => row && row.key);
const leases = `$items("Read Leases for Generate").map((item) => item.json).filter((row) => row && row.lease_id);
const config = buildConfig(configRows);
const cohort = requestBody.cohort || "90";
const candidates = eligibleDraftRows(leases, cohort);

return [{
  json: {
    cohort,
    config,
    candidates,
    requested_count: candidates.length,
    model_draft: config.model_draft || "gpt-5.6-luna",
    instructions: promptSystemInstructions(),
    prompt: buildDraftBatchPrompt(candidates, config),
    board_url: "http://localhost:5678/webhook/board",
  },
}];
"@

$assessFirstDraftBatchCode = @"
$library

const original = `$items("Prepare Draft Batch")[0].json;
const firstOpenAiOutput = (`$input.all()[0] || {}).json || {};
const firstDrafts = extractDraftBatch(firstOpenAiOutput);
const firstByLease = new Map(firstDrafts.map((draft) => [draft.lease_id, draft]));
const failures = [];

for (const lease of original.candidates) {
  const draft = firstByLease.get(lease.lease_id);
  if (!draft) {
    failures.push({ lease, violations: ["missing draft from model output"] });
    continue;
  }
  const guard = guardDraft(lease, draft.subject, draft.body);
  if (!guard.ok) failures.push({ lease, violations: guard.violations });
}

return [{
  json: {
    ...original,
    first_drafts: firstDrafts,
    first_failures: failures,
    _has_failures: failures.length > 0,
    retry_prompt: buildRetryPrompt(failures, original.config),
  },
}];
"@

$finalizeDraftBatchCode = @"
$library

const assessed = `$items("Assess First Draft Batch")[0].json;
const retryOpenAiOutput = (`$input.all()[0] || {}).json || {};
const retryDrafts = extractDraftBatch(retryOpenAiOutput);
const result = finalizeDraftsFromBatch(assessed.candidates, assessed.first_drafts, retryDrafts, assessed.config);

return result.rows.map((row) => ({
  json: {
    ...row,
    _draft_summary: {
      cohort: assessed.cohort,
      requested_count: assessed.requested_count,
      updated_count: result.rows.length,
      generated_count: result.generated_count,
      review_failed_count: result.review_failed_count,
      first_failure_count: assessed.first_failures.length,
      model: result.model,
      board_url: assessed.board_url,
    },
  },
}));
"@

$buildGenerateResponseCode = @"
const draftRows = `$items("Finalize Draft Batch").map((item) => item.json);
const summary = draftRows[0]?._draft_summary || {};
return [{
  json: {
    ok: true,
    action: "generate",
    cohort: summary.cohort || "90",
    requested_count: summary.requested_count || 0,
    updated_count: summary.updated_count || draftRows.length,
    generated_count: summary.generated_count || draftRows.filter((row) => row.status === "DRAFT").length,
    review_failed_count: summary.review_failed_count || draftRows.filter((row) => row.status === "REVIEW_FAILED").length,
    first_failure_count: summary.first_failure_count || 0,
    model: summary.model || "",
    board_url: summary.board_url || "http://localhost:5678/webhook/board",
    rows: draftRows.map((row) => ({
      lease_id: row.lease_id,
      tenant_name: row.tenant_name,
      status: row.status,
      ref_token: row.ref_token,
      guardrail: row._guardrail,
    })),
  },
}];
"@

$prepareApprovalChangesCode = @"
$library

const trigger = `$items("Approve Drafts Webhook")[0]?.json || {};
const requestBody = trigger.body || trigger;
const leases = `$items("Read Leases for Approve").map((item) => item.json).filter((row) => row && row.lease_id);
const changes = prepareApprovalChanges(requestBody.action, requestBody, leases);
if (!changes.length) throw new Error("Approval action did not produce any row changes.");
return changes.map((row) => ({ json: row }));
"@

$buildApprovalResponseCode = @"
const rows = `$items("Prepare Approval Changes").map((item) => item.json);
const byStatus = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});
return [{
  json: {
    ok: true,
    action: "approve",
    updated_count: rows.length,
    by_status: byStatus,
    rows: rows.map((row) => ({ lease_id: row.lease_id, status: row.status })),
    board_url: "http://localhost:5678/webhook/board",
  },
}];
"@

$prepareSendCandidatesCode = @"
$library

const trigger = `$items("Send Approved Webhook")[0]?.json || {};
const requestBody = trigger.body || trigger;
const configRows = `$items("Read Config for Send").map((item) => item.json).filter((row) => row && row.key);
const leases = `$items("Read Leases for Send").map((item) => item.json).filter((row) => row && row.lease_id);
const config = buildConfig(configRows);
const candidates = prepareSendCandidates(requestBody, leases, config);
if (!candidates.length) {
  return [{ json: { ok: true, _no_send: true, action: "send", sent_count: 0, message: "No approved rows were eligible to send.", board_url: "http://localhost:5678/webhook/board" } }];
}
return candidates.map((row) => ({ json: row }));
"@

$buildNoSendResponseCode = @"
return [{ json: (`$input.all()[0] || {}).json || {} }];
"@

$attachSendPayloadCode = @"
const prepared = `$items("Prepare Send Candidates").map((item) => item.json).filter((row) => row && row.lease_id);
const preparedByLease = new Map(prepared.map((row) => [row.lease_id, row]));
const locked = `$input.all().map((item) => item.json).filter((row) => row && row.lease_id);
return locked.map((row) => {
  const original = preparedByLease.get(row.lease_id) || {};
  return { json: { ...row, ...original, status: "SENDING" } };
});
"@

$finalizeSendResultsCode = @"
$library

const sentAt = new Date().toISOString();
const sendInputs = `$items("Attach Send Payload").map((item) => item.json);
const gmailOutputs = `$input.all().map((item) => item.json);

return sendInputs.map((row, index) => {
  const gmail = gmailOutputs[index] || {};
  const failed = Boolean(gmail.error || gmail.message?.error || gmail.errorMessage);
  const status = failed ? "SEND_FAILED" : "SENT";
  return {
    json: {
      ...row,
      status,
      sent_at: failed ? row.sent_at : sentAt,
      _gmail_result: gmail,
      _sent_at: sentAt,
      _send_failed: failed,
      _sent_event: failed ? null : sentEventForLease(row, sentAt),
    },
  };
});
"@

$prepareSentLogRowsCode = @"
const finalized = `$items("Finalize Send Results").map((item) => item.json);
const events = finalized.map((row) => row._sent_event).filter(Boolean);
return events.map((event) => ({ json: event }));
"@

$buildSendResponseCode = @"
const finalized = `$items("Finalize Send Results").map((item) => item.json);
const sentRows = finalized.filter((row) => row.status === "SENT");
const failedRows = finalized.filter((row) => row.status === "SEND_FAILED");
return [{
  json: {
    ok: failedRows.length === 0,
    action: "send",
    attempted_count: finalized.length,
    sent_count: sentRows.length,
    failed_count: failedRows.length,
    sent_lease_ids: sentRows.map((row) => row.lease_id),
    failed_lease_ids: failedRows.map((row) => row.lease_id),
    board_url: "http://localhost:5678/webhook/board",
  },
}];
"@

Set-WorkflowCodeNode -Workflow $workflow -NodeName "Prepare Draft Batch" -Code $prepareDraftBatchCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Assess First Draft Batch" -Code $assessFirstDraftBatchCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Finalize Draft Batch" -Code $finalizeDraftBatchCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Generate Response" -Code $buildGenerateResponseCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Prepare Approval Changes" -Code $prepareApprovalChangesCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Approval Response" -Code $buildApprovalResponseCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Prepare Send Candidates" -Code $prepareSendCandidatesCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build No Send Response" -Code $buildNoSendResponseCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Attach Send Payload" -Code $attachSendPayloadCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Finalize Send Results" -Code $finalizeSendResultsCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Prepare Sent Log Rows" -Code $prepareSentLogRowsCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Send Response" -Code $buildSendResponseCode

foreach ($nodeName in @(
    "Read Config for Generate",
    "Read Config for Send"
)) {
    Set-WorkflowDataTableId -Workflow $workflow -NodeName $nodeName -DataTableId $tableIds["config"]
}

foreach ($nodeName in @(
    "Read Leases for Generate",
    "Upsert Generated Drafts",
    "Read Leases for Approve",
    "Upsert Approval Changes",
    "Read Leases for Send",
    "Lock Approved Rows",
    "Upsert Send Results"
)) {
    Set-WorkflowDataTableId -Workflow $workflow -NodeName $nodeName -DataTableId $tableIds["leases"]
}

Set-WorkflowDataTableId -Workflow $workflow -NodeName "Insert Sent Log Rows" -DataTableId $tableIds["outreach_log"]
Set-CredentialId -Workflow $workflow -CredentialType "openAiApi" -CredentialName "OpenAI account" -CredentialId $openAiCredentialId
Set-CredentialId -Workflow $workflow -CredentialType "gmailOAuth2" -CredentialName "Gmail account" -CredentialId $gmailCredentialId

$localWorkflowPath = Join-Path $root "tmp\wf3-draft-approve-send.local.json"
Write-Utf8NoBomJson -Path $localWorkflowPath -Value $workflow
Write-Utf8NoBomJson -Path (Join-Path $root "tmp\stage5-data-table-ids.json") -Value $tableIds

Import-N8nWorkflowFile -WorkflowPath $localWorkflowPath
Enable-N8nWorkflow -WorkflowId "wf3-draft-approve-send"

Write-Host "WF3 Draft, Approval, and Send imported and activated."
Write-Host "Generate URL: http://localhost:5678/webhook/generate"
Write-Host "Approve URL: http://localhost:5678/webhook/approve"
Write-Host "Send URL: http://localhost:5678/webhook/send"
