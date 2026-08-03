. "$PSScriptRoot\stage-2-common.ps1"

$root = Get-RepoRoot
Set-Location $root

Write-Host "==> Regenerating and validating fixtures"
node .\scripts\generate-stage-2-fixtures.js

$expected = Get-Content -Raw .\fixtures\roster-demo-expected.json | ConvertFrom-Json
if ($expected.visible_row_count -ne 40) { throw "Expected 40 visible rows." }
if ($expected.expected_90_day_generation_candidates -ne 14) { throw "Expected 14 90-day generation candidates." }

$schema = Get-Content -Raw .\fixtures\data-table-schema.json | ConvertFrom-Json

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

New-Item -ItemType Directory -Force .\tmp | Out-Null

$listWorkflow = @{
    id = "stage2-verify-list-data-tables"
    name = "Stage 2 Verify List Data Tables"
    active = $true
    nodes = @(
        (New-WebhookTriggerNode -Id "stage2-verify-list-trigger" -Name "Stage 2 Verify List Trigger" -Path "stage2-verify-list-data-tables" -X 0 -Y 0),
        @{
            parameters = @{
                resource = "table"
                operation = "list"
                returnAll = $true
                options = @{ sortField = "name"; sortDirection = "asc" }
            }
            id = "stage2-verify-list-node"
            name = "List Data Tables"
            type = "n8n-nodes-base.dataTable"
            typeVersion = 1.1
            position = @(240, 0)
        }
    )
    connections = @{ "Stage 2 Verify List Trigger" = New-N8nMainConnection -Node "List Data Tables" }
    settings = @{}
}
$listPath = Join-Path $root "tmp\stage2-verify-list-data-tables.json"
Write-Utf8NoBomJson -Path $listPath -Value $listWorkflow
$tables = @(Invoke-N8nWebhookWorkflowFile -WorkflowPath $listPath -WorkflowId "stage2-verify-list-data-tables" -WebhookPath "stage2-verify-list-data-tables")
$tableIds = Resolve-Stage2DataTableIds -Tables $tables -Schema $schema

$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$verifyWorkflow = @{
    id = "stage2-verify-data-tables"
    name = "Stage 2 Verify Data Tables"
    active = $true
    nodes = @(
        (New-WebhookTriggerNode -Id "stage2-verify-trigger" -Name "Stage 2 Verify Trigger" -Path "stage2-verify-data-tables" -X 0 -Y 0),
        @{
            parameters = @{
                resource = "row"
                operation = "insert"
                dataTableId = @{ __rl = $true; mode = "id"; value = $tableIds["leases"] }
                columns = @{
                    mappingMode = "defineBelow"
                    value = @{
                        lease_id = "stage2-verify-lease"
                        tenant_name = "Stage Two Verify"
                        tenant_first_name = "Stage"
                        unit = "Verify 1"
                        email = "stage2.verify@example.com"
                        email_valid = $true
                        move_in_date = $now
                        lease_end_date = $now
                        days_to_expiry = 90
                        cohort = "90"
                        tenure_months = 12
                        status = "PENDING"
                        draft_subject = ""
                        draft_body = ""
                        ref_token = ""
                        sent_at = $null
                        opted_out = $false
                        ingest_notes = ""
                    }
                }
            }
            id = "stage2-insert-lease-test"
            name = "Insert Lease Test Row"
            type = "n8n-nodes-base.dataTable"
            typeVersion = 1.1
            position = @(240, 0)
        },
        @{
            parameters = @{
                resource = "row"
                operation = "get"
                dataTableId = @{ __rl = $true; mode = "id"; value = $tableIds["leases"] }
                matchType = "allConditions"
                filters = @{ conditions = @(@{ keyName = "lease_id"; condition = "eq"; keyValue = "stage2-verify-lease" }) }
                returnAll = $true
            }
            id = "stage2-read-lease-test"
            name = "Read Lease Test Row"
            type = "n8n-nodes-base.dataTable"
            typeVersion = 1.1
            position = @(520, 0)
        },
        @{
            parameters = @{
                resource = "row"
                operation = "deleteRows"
                dataTableId = @{ __rl = $true; mode = "id"; value = $tableIds["leases"] }
                matchType = "allConditions"
                filters = @{ conditions = @(@{ keyName = "lease_id"; condition = "eq"; keyValue = "stage2-verify-lease" }) }
            }
            id = "stage2-delete-lease-test"
            name = "Delete Lease Test Row"
            type = "n8n-nodes-base.dataTable"
            typeVersion = 1.1
            position = @(800, 0)
        },
        @{
            parameters = @{
                resource = "row"
                operation = "insert"
                dataTableId = @{ __rl = $true; mode = "id"; value = $tableIds["outreach_log"] }
                columns = @{
                    mappingMode = "defineBelow"
                    value = @{
                        event_id = "stage2-verify-event"
                        lease_id = "stage2-verify-lease"
                        event_type = "CLASSIFIED"
                        reply_text = "stage 2 verification"
                        intent = "UNCLEAR"
                        grievance_category = "NONE"
                        grievance_summary = ""
                        urgency = "LOW"
                        compliance_flag = "NONE"
                        confidence = "LOW"
                        requires_human = $true
                        created_at = $now
                    }
                }
            }
            id = "stage2-insert-log-test"
            name = "Insert Outreach Log Test Row"
            type = "n8n-nodes-base.dataTable"
            typeVersion = 1.1
            position = @(1080, 0)
        },
        @{
            parameters = @{
                resource = "row"
                operation = "get"
                dataTableId = @{ __rl = $true; mode = "id"; value = $tableIds["outreach_log"] }
                matchType = "allConditions"
                filters = @{ conditions = @(@{ keyName = "event_id"; condition = "eq"; keyValue = "stage2-verify-event" }) }
                returnAll = $true
            }
            id = "stage2-read-log-test"
            name = "Read Outreach Log Test Row"
            type = "n8n-nodes-base.dataTable"
            typeVersion = 1.1
            position = @(1360, 0)
        },
        @{
            parameters = @{
                resource = "row"
                operation = "deleteRows"
                dataTableId = @{ __rl = $true; mode = "id"; value = $tableIds["outreach_log"] }
                matchType = "allConditions"
                filters = @{ conditions = @(@{ keyName = "event_id"; condition = "eq"; keyValue = "stage2-verify-event" }) }
            }
            id = "stage2-delete-log-test"
            name = "Delete Outreach Log Test Row"
            type = "n8n-nodes-base.dataTable"
            typeVersion = 1.1
            position = @(1640, 0)
        },
        @{
            parameters = @{
                resource = "row"
                operation = "get"
                dataTableId = @{ __rl = $true; mode = "id"; value = $tableIds["config"] }
                matchType = "anyCondition"
                filters = @{ conditions = @(@{ keyName = "key"; condition = "eq"; keyValue = "manager_name" }) }
                returnAll = $true
            }
            id = "stage2-read-config"
            name = "Read Config"
            type = "n8n-nodes-base.dataTable"
            typeVersion = 1.1
            position = @(1920, 0)
        }
    )
    connections = @{
        "Stage 2 Verify Trigger" = New-N8nMainConnection -Node "Insert Lease Test Row"
        "Insert Lease Test Row" = New-N8nMainConnection -Node "Read Lease Test Row"
        "Read Lease Test Row" = New-N8nMainConnection -Node "Delete Lease Test Row"
        "Delete Lease Test Row" = New-N8nMainConnection -Node "Insert Outreach Log Test Row"
        "Insert Outreach Log Test Row" = New-N8nMainConnection -Node "Read Outreach Log Test Row"
        "Read Outreach Log Test Row" = New-N8nMainConnection -Node "Delete Outreach Log Test Row"
        "Delete Outreach Log Test Row" = New-N8nMainConnection -Node "Read Config"
    }
    settings = @{}
}

$verifyPath = Join-Path $root "tmp\stage2-verify-data-tables.json"
Write-Utf8NoBomJson -Path $verifyPath -Value $verifyWorkflow
$configRows = @(Invoke-N8nWebhookWorkflowFile -WorkflowPath $verifyPath -WorkflowId "stage2-verify-data-tables" -WebhookPath "stage2-verify-data-tables")
if ($configRows.Count -lt 1 -or $configRows[0].value -ne "Maya Chen") {
    throw "Config manager_name verification failed."
}

Write-Host "Stage 2 verification passed."
Write-Host "Data Tables: leases=$($tableIds['leases']), outreach_log=$($tableIds['outreach_log']), config=$($tableIds['config'])"
Write-Host "Fixture visible rows: $($expected.visible_row_count)"
Write-Host "90-day generation candidates: $($expected.expected_90_day_generation_candidates)"
