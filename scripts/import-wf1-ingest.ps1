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
        id = "stage3-list-data-tables"
        name = "Stage 3 List Data Tables"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "stage3-list-trigger" -Name "Stage 3 List Trigger" -Path "stage3-list-data-tables" -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "table"
                    operation = "list"
                    returnAll = $true
                    options = @{ sortField = "name"; sortDirection = "asc" }
                }
                id = "stage3-list-tables"
                name = "List Data Tables"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(240, 0)
            }
        )
        connections = @{ "Stage 3 List Trigger" = New-N8nMainConnection -Node "List Data Tables" }
        settings = @{}
    }

    $listPath = Join-Path $root "tmp\stage3-list-data-tables.json"
    Write-Utf8NoBomJson -Path $listPath -Value $listWorkflow
    $tables = @(Invoke-N8nWebhookWorkflowFile -WorkflowPath $listPath -WorkflowId "stage3-list-data-tables" -WebhookPath "stage3-list-data-tables")
    return Resolve-Stage2DataTableIds -Tables $tables -Schema $schema
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

$workflowPath = Join-Path $root "n8n-workflows\wf1-ingest.json"
$workflow = Get-Content -Raw $workflowPath | ConvertFrom-Json
$tableIds = Get-LocalDataTableIds

$library = Get-Content -Raw .\scripts\stage-3-ingest-lib.js

$extractCode = @'
const item = $input.first();
const binary = item.binary || {};
const preferredKeys = ["lease_roster", "data"];
const binaryKey = preferredKeys.find((key) => binary[key]) || Object.keys(binary)[0];

if (!binaryKey) {
  const body = item.json?.body || item.json || {};
  const csvText = body.lease_roster || body.csv || body.data;
  if (typeof csvText === "string" && csvText.trim()) {
    return [{ json: { csv_text: csvText, uploaded_at: new Date().toISOString(), binary_property: "json-body" } }];
  }
  throw new Error("No uploaded CSV file found. Submit multipart/form-data with file field 'lease_roster'.");
}

const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);
return [{
  json: {
    csv_text: buffer.toString("utf8"),
    uploaded_at: new Date().toISOString(),
    binary_property: binaryKey,
  },
}];
'@

$collectConfigCode = @'
const config = {};
for (const item of $input.all()) {
  if (item.json && item.json.key) config[item.json.key] = item.json.value;
}
return [{ json: { config } }];
'@

$buildRowsCode = @"
$library

const uploadItem = `$items("Extract Upload CSV Text")[0];
if (!uploadItem || !uploadItem.json || !uploadItem.json.csv_text) {
  throw new Error("Upload CSV text was not available to the ingest normalizer.");
}

const configItem = `$items("Collect Config Rows")[0] || { json: { config: {} } };
const config = configItem.json.config || {};
const existingRows = `$items("Read Existing Leases")
  .map((item) => item.json)
  .filter((row) => row && row.lease_id);

const result = normalizeRoster(uploadItem.json.csv_text, {
  timezone: config.timezone || "America/New_York",
  demoRecipientEmail: config.demo_recipient_email || "",
  existingRows,
  boardUrl: "http://localhost:5678/webhook/board",
  uploadedAt: uploadItem.json.uploaded_at,
});

return result.rows.map((row) => {
  row._summary = result.summary;
  return { json: row };
});
"@

$responseCode = @'
const rows = $items("Build Lease Rows").map((item) => item.json);
const summary = rows[0]?._summary || {};
return [{
  json: {
    ok: true,
    message: `${summary.loaded_count || 0} rows loaded, ${summary.flagged_count || 0} need attention.`,
    loaded_count: summary.loaded_count || 0,
    visible_row_count: summary.visible_row_count || 0,
    blank_row_count: summary.blank_row_count || 0,
    flagged_count: summary.flagged_count || 0,
    cohort_counts: summary.cohort_counts || {},
    board_url: summary.board_url || "http://localhost:5678/webhook/board",
    form_url: "http://localhost:5678/form/roster-upload",
    api_url: "http://localhost:5678/webhook/roster-upload-api",
    warnings: summary.warnings || [],
  },
}];
'@

Set-WorkflowCodeNode -Workflow $workflow -NodeName "Extract Upload CSV Text" -Code $extractCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Collect Config Rows" -Code $collectConfigCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Lease Rows" -Code $buildRowsCode
Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Upload Response" -Code $responseCode
Set-WorkflowDataTableId -Workflow $workflow -NodeName "Read Config Rows" -DataTableId $tableIds["config"]
Set-WorkflowDataTableId -Workflow $workflow -NodeName "Read Existing Leases" -DataTableId $tableIds["leases"]
Set-WorkflowDataTableId -Workflow $workflow -NodeName "Upsert Lease Rows" -DataTableId $tableIds["leases"]

$localWorkflowPath = Join-Path $root "tmp\wf1-ingest.local.json"
Write-Utf8NoBomJson -Path $localWorkflowPath -Value $workflow
Write-Utf8NoBomJson -Path (Join-Path $root "tmp\stage3-data-table-ids.json") -Value $tableIds

Import-N8nWorkflowFile -WorkflowPath $localWorkflowPath
Enable-N8nWorkflow -WorkflowId "wf1-ingest"

Write-Host "WF1 Roster Ingestion imported and activated."
Write-Host "Form URL: http://localhost:5678/form/roster-upload"
Write-Host "API URL: http://localhost:5678/webhook/roster-upload-api"
