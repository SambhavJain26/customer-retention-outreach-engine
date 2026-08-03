. "$PSScriptRoot\stage-2-common.ps1"

$root = Get-RepoRoot
Set-Location $root

$schema = Get-Content -Raw .\fixtures\data-table-schema.json | ConvertFrom-Json
$envValues = Read-DotEnv -Path (Join-Path $root ".env")

$requiredLocal = @("STAGE1_TEST_EMAIL", "TELEGRAM_MANAGER_CHAT_ID")
foreach ($key in $requiredLocal) {
    if (-not $envValues.ContainsKey($key) -or -not $envValues[$key]) {
        throw "Missing $key in ignored local .env. Stage 2 config seeding needs it."
    }
}

New-Item -ItemType Directory -Force .\tmp | Out-Null

function New-ManualTriggerNode {
    param([string] $Id, [string] $Name, [int] $X, [int] $Y)
    return @{
        parameters = @{}
        id = $Id
        name = $Name
        type = "n8n-nodes-base.manualTrigger"
        typeVersion = 1
        position = @($X, $Y)
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

function New-DataTableCreateNode {
    param($Table, [string] $Id, [string] $Name, [int] $X, [int] $Y)
    return @{
        parameters = @{
            resource = "table"
            operation = "create"
            tableName = $Table.name
            columns = @{
                column = @($Table.columns | ForEach-Object { @{ name = $_.name; type = $_.type } })
            }
            options = @{ createIfNotExists = $true }
        }
        id = $Id
        name = $Name
        type = "n8n-nodes-base.dataTable"
        typeVersion = 1.1
        position = @($X, $Y)
    }
}

$createNodes = @(
    (New-WebhookTriggerNode -Id "stage2-create-trigger" -Name "Stage 2 Create Trigger" -Path "stage2-create-data-tables" -X 0 -Y 0)
)
$connections = @{
    "Stage 2 Create Trigger" = New-N8nMainConnection -Node "Create leases Table"
    "Create leases Table" = New-N8nMainConnection -Node "Create outreach_log Table"
    "Create outreach_log Table" = New-N8nMainConnection -Node "Create config Table"
}

$createNodes += New-DataTableCreateNode -Table ($schema.tables | Where-Object name -eq "leases") -Id "stage2-create-leases" -Name "Create leases Table" -X 240 -Y 0
$createNodes += New-DataTableCreateNode -Table ($schema.tables | Where-Object name -eq "outreach_log") -Id "stage2-create-outreach" -Name "Create outreach_log Table" -X 520 -Y 0
$createNodes += New-DataTableCreateNode -Table ($schema.tables | Where-Object name -eq "config") -Id "stage2-create-config" -Name "Create config Table" -X 800 -Y 0

$createWorkflow = @{
    id = "stage2-create-data-tables"
    name = "Stage 2 Create Data Tables"
    active = $true
    nodes = $createNodes
    connections = $connections
    settings = @{}
}
$createPath = Join-Path $root "tmp\stage2-create-data-tables.json"
Write-Utf8NoBomJson -Path $createPath -Value $createWorkflow
Invoke-N8nWebhookWorkflowFile -WorkflowPath $createPath -WorkflowId "stage2-create-data-tables" -WebhookPath "stage2-create-data-tables" | Out-Null

$listWorkflow = @{
    id = "stage2-list-data-tables"
    name = "Stage 2 List Data Tables"
    active = $true
    nodes = @(
        (New-WebhookTriggerNode -Id "stage2-list-trigger" -Name "Stage 2 List Trigger" -Path "stage2-list-data-tables" -X 0 -Y 0),
        @{
            parameters = @{
                resource = "table"
                operation = "list"
                returnAll = $true
                options = @{ sortField = "name"; sortDirection = "asc" }
            }
            id = "stage2-list-tables"
            name = "List Data Tables"
            type = "n8n-nodes-base.dataTable"
            typeVersion = 1.1
            position = @(240, 0)
        }
    )
    connections = @{ "Stage 2 List Trigger" = New-N8nMainConnection -Node "List Data Tables" }
    settings = @{}
}
$listPath = Join-Path $root "tmp\stage2-list-data-tables.json"
Write-Utf8NoBomJson -Path $listPath -Value $listWorkflow
$tables = @(Invoke-N8nWebhookWorkflowFile -WorkflowPath $listPath -WorkflowId "stage2-list-data-tables" -WebhookPath "stage2-list-data-tables")
$tableIds = Resolve-Stage2DataTableIds -Tables $tables -Schema $schema

$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$configRows = @(
    @{ key = "manager_name"; value = "Maya Chen"; value_type = "string"; description = "Demo property manager persona"; updated_at = $now },
    @{ key = "company_name"; value = "Harborview Property Management"; value_type = "string"; description = "Demo company name"; updated_at = $now },
    @{ key = "timezone"; value = "America/New_York"; value_type = "string"; description = "Demo timezone for cohort math"; updated_at = $now },
    @{ key = "total_units"; value = "168"; value_type = "number"; description = "Portfolio unit count shown in board header"; updated_at = $now },
    @{ key = "send_delay_seconds"; value = "2"; value_type = "number"; description = "Demo send delay between non-priority emails"; updated_at = $now },
    @{ key = "model_draft"; value = "gpt-5.6-luna"; value_type = "string"; description = "Default draft model verified in Stage 1"; updated_at = $now },
    @{ key = "model_classify"; value = "gpt-5.6-luna"; value_type = "string"; description = "Default classifier model verified in Stage 1"; updated_at = $now },
    @{ key = "manager_email"; value = $envValues["STAGE1_TEST_EMAIL"]; value_type = "secret-local"; description = "Local demo manager email from ignored .env"; updated_at = $now },
    @{ key = "demo_recipient_email"; value = $envValues["STAGE1_TEST_EMAIL"]; value_type = "secret-local"; description = "Local priority recipient from ignored .env"; updated_at = $now },
    @{ key = "telegram_chat_id"; value = $envValues["TELEGRAM_MANAGER_CHAT_ID"]; value_type = "secret-local"; description = "Local Telegram manager chat ID from ignored .env"; updated_at = $now }
)

$configCode = @"
return $(($configRows | ConvertTo-Json -Depth 10));
"@

$seedWorkflow = @{
    id = "stage2-seed-config"
    name = "Stage 2 Seed Config"
    active = $true
    nodes = @(
        (New-WebhookTriggerNode -Id "stage2-seed-trigger" -Name "Stage 2 Seed Trigger" -Path "stage2-seed-config" -X 0 -Y 0),
        @{
            parameters = @{ jsCode = $configCode }
            id = "stage2-config-rows"
            name = "Build Config Rows"
            type = "n8n-nodes-base.code"
            typeVersion = 2
            position = @(240, 0)
        },
        @{
            parameters = @{
                resource = "row"
                operation = "upsert"
                dataTableId = @{ __rl = $true; mode = "id"; value = $tableIds["config"] }
                matchType = "allConditions"
                filters = @{ conditions = @(@{ keyName = "key"; condition = "eq"; keyValue = "={{ `$json.key }}" }) }
                columns = @{
                    mappingMode = "defineBelow"
                    value = @{
                        key = "={{ `$json.key }}"
                        value = "={{ `$json.value }}"
                        value_type = "={{ `$json.value_type }}"
                        description = "={{ `$json.description }}"
                        updated_at = "={{ `$json.updated_at }}"
                    }
                }
            }
            id = "stage2-upsert-config"
            name = "Upsert Config Rows"
            type = "n8n-nodes-base.dataTable"
            typeVersion = 1.1
            position = @(520, 0)
        }
    )
    connections = @{
        "Stage 2 Seed Trigger" = New-N8nMainConnection -Node "Build Config Rows"
        "Build Config Rows" = New-N8nMainConnection -Node "Upsert Config Rows"
    }
    settings = @{}
}
$seedPath = Join-Path $root "tmp\stage2-seed-config.json"
Write-Utf8NoBomJson -Path $seedPath -Value $seedWorkflow
Invoke-N8nWebhookWorkflowFile -WorkflowPath $seedPath -WorkflowId "stage2-seed-config" -WebhookPath "stage2-seed-config" | Out-Null

$tableIdsPath = Join-Path $root "tmp\stage2-data-table-ids.json"
Write-Utf8NoBomJson -Path $tableIdsPath -Value $tableIds

Write-Host "Stage 2 Data Tables created/reused and config seeded."
foreach ($name in $tableIds.Keys) {
    Write-Host "$name=$($tableIds[$name])"
}
