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
        id = "stage4-list-data-tables"
        name = "Stage 4 List Data Tables"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "stage4-list-trigger" -Name "Stage 4 List Trigger" -Path "stage4-list-data-tables" -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "table"
                    operation = "list"
                    returnAll = $true
                    options = @{ sortField = "name"; sortDirection = "asc" }
                }
                id = "stage4-list-tables"
                name = "List Data Tables"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(240, 0)
            }
        )
        connections = @{ "Stage 4 List Trigger" = New-N8nMainConnection -Node "List Data Tables" }
        settings = @{}
    }

    $listPath = Join-Path $root "tmp\stage4-list-data-tables.json"
    Write-Utf8NoBomJson -Path $listPath -Value $listWorkflow
    $tables = @(Invoke-N8nWebhookWorkflowFile -WorkflowPath $listPath -WorkflowId "stage4-list-data-tables" -WebhookPath "stage4-list-data-tables")
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

$workflowPath = Join-Path $root "n8n-workflows\wf2-dashboard.json"
$workflow = Get-Content -Raw $workflowPath | ConvertFrom-Json
$tableIds = Get-LocalDataTableIds

$library = Get-Content -Raw .\scripts\stage-4-dashboard-lib.js
$buildBoardCode = @"
$library

const leases = `$items("Read Lease Rows").map((item) => item.json).filter((row) => row && row.lease_id);
const outreachLog = `$items("Read Outreach Log Rows").map((item) => item.json).filter((row) => row && (row.event_id || row.lease_id));
const configRows = `$items("Read Config Rows").map((item) => item.json).filter((row) => row && row.key);

const html = buildDashboardHtml({
  leases,
  outreachLog,
  configRows,
  generatedAt: new Date().toISOString(),
});

return [{ json: { html } }];
"@

Set-WorkflowCodeNode -Workflow $workflow -NodeName "Build Board HTML" -Code $buildBoardCode
Set-WorkflowDataTableId -Workflow $workflow -NodeName "Read Lease Rows" -DataTableId $tableIds["leases"]
Set-WorkflowDataTableId -Workflow $workflow -NodeName "Read Outreach Log Rows" -DataTableId $tableIds["outreach_log"]
Set-WorkflowDataTableId -Workflow $workflow -NodeName "Read Config Rows" -DataTableId $tableIds["config"]

$localWorkflowPath = Join-Path $root "tmp\wf2-dashboard.local.json"
Write-Utf8NoBomJson -Path $localWorkflowPath -Value $workflow
Write-Utf8NoBomJson -Path (Join-Path $root "tmp\stage4-data-table-ids.json") -Value $tableIds

Import-N8nWorkflowFile -WorkflowPath $localWorkflowPath
Enable-N8nWorkflow -WorkflowId "wf2-dashboard"

Write-Host "WF2 Dashboard imported and activated."
Write-Host "Board URL: http://localhost:5678/webhook/board"
