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

function Get-Stage8TableIds {
    foreach ($path in @(
        "tmp\stage7-data-table-ids.json",
        "tmp\stage6-data-table-ids.json",
        "tmp\stage5-data-table-ids.json",
        "tmp\stage2-data-table-ids.json"
    )) {
        if (Test-Path -LiteralPath $path) {
            return Get-Content -Raw $path | ConvertFrom-Json
        }
    }
    throw "No Data Table ID cache found. Run scripts/setup-stage-2-data-tables.ps1 and import workflows first."
}

function Install-Stage8ReadWorkflows {
    param([Parameter(Mandatory)] $TableIds)

    $workflow = @{
        id = "stage8-read-data-tables"
        name = "Stage 8 Read Data Tables"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "stage8-read-leases-trigger" -Name "Stage 8 Read Leases Trigger" -Path "stage8-read-leases" -X 0 -Y 0),
            @{
                parameters = @{
                    resource = "row"
                    operation = "get"
                    dataTableId = @{ __rl = $true; mode = "id"; value = [string] $TableIds.leases }
                    returnAll = $true
                }
                id = "stage8-read-leases"
                name = "Read Leases Rows"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(280, 0)
                alwaysOutputData = $true
            },
            (New-WebhookTriggerNode -Id "stage8-read-log-trigger" -Name "Stage 8 Read Outreach Log Trigger" -Path "stage8-read-outreach-log" -X 0 -Y 220),
            @{
                parameters = @{
                    resource = "row"
                    operation = "get"
                    dataTableId = @{ __rl = $true; mode = "id"; value = [string] $TableIds.outreach_log }
                    returnAll = $true
                }
                id = "stage8-read-log"
                name = "Read Outreach Log Rows"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(280, 220)
                alwaysOutputData = $true
            },
            (New-WebhookTriggerNode -Id "stage8-read-config-trigger" -Name "Stage 8 Read Config Trigger" -Path "stage8-read-config" -X 0 -Y 440),
            @{
                parameters = @{
                    resource = "row"
                    operation = "get"
                    dataTableId = @{ __rl = $true; mode = "id"; value = [string] $TableIds.config }
                    returnAll = $true
                }
                id = "stage8-read-config"
                name = "Read Config Rows"
                type = "n8n-nodes-base.dataTable"
                typeVersion = 1.1
                position = @(280, 440)
                alwaysOutputData = $true
            }
        )
        connections = @{
            "Stage 8 Read Leases Trigger" = New-N8nMainConnection -Node "Read Leases Rows"
            "Stage 8 Read Outreach Log Trigger" = New-N8nMainConnection -Node "Read Outreach Log Rows"
            "Stage 8 Read Config Trigger" = New-N8nMainConnection -Node "Read Config Rows"
        }
        settings = @{}
    }

    $path = Join-Path $root "tmp\stage8-read-data-tables.json"
    Write-Utf8NoBomJson -Path $path -Value $workflow
    Import-N8nWorkflowFile -WorkflowPath $path
    Enable-N8nWorkflow -WorkflowId "stage8-read-data-tables"
}

function Invoke-JsonPost {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] $Body,
        [int] $TimeoutSec = 180
    )

    $json = $Body | ConvertTo-Json -Depth 30 -Compress
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $lastError = $null
    do {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:5678/webhook/$Path" -Method Post -Body $json -ContentType "application/json" -TimeoutSec $TimeoutSec
            $flat = @(ConvertTo-FlatArray $response)
            if ($flat.Count -eq 1) { return $flat[0] }
            return $response
        } catch {
            $lastError = $_
            if ((Get-Date) -ge $deadline) { throw $lastError }
            Start-Sleep -Seconds 3
        }
    } while ($true)
}

function Read-WebhookRows {
    param([Parameter(Mandatory)] [string] $Path)

    $response = Invoke-WebRequest -Uri "http://localhost:5678/webhook/$Path" -Method Post -UseBasicParsing -TimeoutSec 120
    if (-not $response.Content) { return @() }
    return @(ConvertTo-FlatArray ($response.Content | ConvertFrom-Json))
}

function Read-Leases {
    return @(Read-WebhookRows -Path "stage8-read-leases" | Where-Object {
        $property = $_.PSObject.Properties["lease_id"]
        $property -and [string] $property.Value
    })
}

function Read-OutreachLog {
    return @(Read-WebhookRows -Path "stage8-read-outreach-log" | Where-Object {
        $property = $_.PSObject.Properties["event_id"]
        $property -and [string] $property.Value
    })
}

function Read-Config {
    return @(Read-WebhookRows -Path "stage8-read-config" | Where-Object {
        $property = $_.PSObject.Properties["key"]
        $property -and [string] $property.Value
    })
}

function Invoke-Board {
    $deadline = (Get-Date).AddSeconds(60)
    $lastError = $null
    do {
        try {
            return Invoke-WebRequest -Uri "http://localhost:5678/webhook/board" -Method Get -UseBasicParsing -TimeoutSec 30
        } catch {
            $lastError = $_
            if ((Get-Date) -ge $deadline) { throw $lastError }
            Start-Sleep -Seconds 3
        }
    } while ($true)
}

function Restart-N8nCold {
    docker compose restart n8n | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose restart n8n failed."
    }
    Wait-N8nHttp
    Start-Sleep -Seconds 8
}

function Assert-WorkflowStaticSafety {
    $workflowFiles = @(Get-ChildItem -LiteralPath .\n8n-workflows -Filter "*.json")
    foreach ($file in $workflowFiles) {
        $workflow = Get-Content -Raw $file.FullName | ConvertFrom-Json
        $gmailTriggers = @($workflow.nodes | Where-Object { [string] $_.type -eq "n8n-nodes-base.gmailTrigger" })
        Assert-True ($gmailTriggers.Count -eq 0) "$($file.Name) must not contain a Gmail Trigger for the manual demo path."
    }
}

function Import-Stage8Workflows {
    Write-Host "==> Creating Data Tables and importing WF1-WF5"
    docker compose up -d n8n | Out-Host
    Wait-N8nHttp
    .\scripts\setup-stage-2-data-tables.ps1 | Out-Host
    .\scripts\import-wf1-ingest.ps1 | Out-Host
    .\scripts\import-wf3-draft-approve-send.ps1 | Out-Host
    .\scripts\import-wf4-reply-classify-route.ps1 | Out-Host
    .\scripts\import-wf5-daily-sweep-reset.ps1 | Out-Host
    .\scripts\import-wf2-dashboard.ps1 | Out-Host
}

function Get-FixtureById {
    param(
        [Parameter(Mandatory)] $Fixtures,
        [Parameter(Mandatory)] [int] $Id
    )
    $match = @($Fixtures | Where-Object { [int] $_.id -eq $Id } | Select-Object -First 1)
    Assert-True ($match.Count -eq 1) "Expected one reply fixture with id=$Id."
    return $match[0]
}

function Invoke-Rehearsal {
    param(
        [Parameter(Mandatory)] [int] $RunNumber,
        [Parameter(Mandatory)] $Fixtures
    )

    Write-Host "==> Rehearsal ${RunNumber}: cold restart"
    $totalTimer = [System.Diagnostics.Stopwatch]::StartNew()
    Restart-N8nCold

    Write-Host "==> Rehearsal ${RunNumber}: reset and board preflight"
    $reset = Invoke-JsonPost -Path "reset-demo" -Body @{} -TimeoutSec 180
    Assert-True ([int] $reset.loaded_count -eq 40) "Run $RunNumber reset loaded_count should be 40."
    Assert-True ([int] $reset.inserted_count -eq 40) "Run $RunNumber reset inserted_count should be 40."

    $leases = @(Read-Leases)
    $logs = @(Read-OutreachLog)
    Assert-True ($leases.Count -eq 40) "Run $RunNumber expected 40 leases after reset, got $($leases.Count)."
    Assert-True ($logs.Count -eq 0) "Run $RunNumber expected empty outreach_log after reset, got $($logs.Count)."

    $config = @(Read-Config)
    $demoEmail = [string] (@($config | Where-Object { [string] $_.key -eq "demo_recipient_email" } | Select-Object -First 1).value)
    $initialDemoRow = @($leases | Where-Object { [string] $_.tenant_name -eq "Avery Brooks" } | Select-Object -First 1)
    Assert-True ($initialDemoRow.Count -eq 1) "Run $RunNumber expected Avery Brooks demo row."
    if ($demoEmail) {
        Assert-True ([string] $initialDemoRow[0].email -eq $demoEmail) "Run $RunNumber demo-priority email substitution failed."
    }
    Assert-True ([string] $initialDemoRow[0].status -eq "PENDING") "Run $RunNumber demo row should start PENDING."

    $board = Invoke-Board
    $html = [string] $board.Content
    Assert-True ($board.StatusCode -eq 200) "Run $RunNumber board should return HTTP 200."
    Assert-True ($html.Contains('data-action="generate"')) "Run $RunNumber board missing generate action."
    Assert-True ($html.Contains('data-action="approve-all"')) "Run $RunNumber board missing approve-all action."
    Assert-True ($html.Contains('data-action="send"')) "Run $RunNumber board missing send action."
    Assert-True ($html.Contains('data-action="check-replies"')) "Run $RunNumber board missing check-replies action."
    Assert-True (-not $html.Contains("reset-demo")) "Run $RunNumber board must not expose reset-demo."
    Assert-True (-not $html.Contains("will wire")) "Run $RunNumber board still contains stub messaging."

    Write-Host "==> Rehearsal ${RunNumber}: generate, approve, send"
    $generateTimer = [System.Diagnostics.Stopwatch]::StartNew()
    $generate = Invoke-JsonPost -Path "generate" -Body @{ cohort = "90" } -TimeoutSec 240
    $generateTimer.Stop()
    Assert-True ($generateTimer.ElapsedMilliseconds -lt 45000) "Run $RunNumber draft generation took $($generateTimer.ElapsedMilliseconds)ms, above Stage 8 POC threshold."
    Assert-True (([int] $generate.generated_count + [int] $generate.review_failed_count) -eq 14) "Run $RunNumber expected 14 handled 90-day rows."
    Assert-True ([int] $generate.generated_count -ge 13) "Run $RunNumber expected at least 13 draft-ready rows."

    $leasesAfterGenerate = @(Read-Leases)
    $draftRows = @($leasesAfterGenerate | Where-Object { [string] $_.status -eq "DRAFT" })
    $demoRow = @($draftRows | Where-Object { [string] $_.tenant_name -eq "Avery Brooks" } | Select-Object -First 1)
    Assert-True ($demoRow.Count -eq 1) "Run $RunNumber demo row must have a generated draft."
    Assert-True ([string] $demoRow[0].ref_token -match '^R-[0-9A-F]{4}$') "Run $RunNumber demo row ref_token invalid."

    $approve = Invoke-JsonPost -Path "approve" -Body @{ action = "approve_all" } -TimeoutSec 120
    Assert-True ([int] $approve.updated_count -ge 13) "Run $RunNumber approve_all should approve at least 13 drafts."

    $leasesAfterApprove = @(Read-Leases)
    $demoRow = @($leasesAfterApprove | Where-Object { [string] $_.tenant_name -eq "Avery Brooks" } | Select-Object -First 1)
    Assert-True ($demoRow.Count -eq 1) "Run $RunNumber demo row missing after approve."
    Assert-True ([string] $demoRow[0].status -eq "APPROVED") "Run $RunNumber demo row should be APPROVED before send."

    $send = Invoke-JsonPost -Path "send" -Body @{ lease_ids = @([string] $demoRow[0].lease_id) } -TimeoutSec 120
    Assert-True ([int] $send.sent_count -eq 1) "Run $RunNumber first send should send exactly one priority email."
    $sendAgain = Invoke-JsonPost -Path "send" -Body @{ lease_ids = @([string] $demoRow[0].lease_id) } -TimeoutSec 120
    Assert-True ([int] $sendAgain.sent_count -eq 0) "Run $RunNumber second send should be idempotent."

    $leasesAfterSend = @(Read-Leases)
    $sentRows = @($leasesAfterSend | Where-Object { [string] $_.status -eq "SENT" })
    Assert-True ($sentRows.Count -eq 1) "Run $RunNumber expected exactly one SENT row after priority send."
    Assert-True ([string] $sentRows[0].lease_id -eq [string] $demoRow[0].lease_id) "Run $RunNumber SENT row should be the demo-priority row."

    $sentBoard = Invoke-Board
    $sentHtml = [string] $sentBoard.Content
    Assert-True ($sentHtml.Contains("SENT") -or $sentHtml.Contains("Sent")) "Run $RunNumber board should reflect SENT state after send."

    Write-Host "==> Rehearsal ${RunNumber}: reply fixtures"
    $runId = "stage8-r$RunNumber-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
    $fixture2 = Get-FixtureById -Fixtures $Fixtures -Id 2
    $fixture7 = Get-FixtureById -Fixtures $Fixtures -Id 7

    $fixture2Timer = [System.Diagnostics.Stopwatch]::StartNew()
    $fixture2Response = Invoke-JsonPost -Path "check-replies" -Body @{
        reply_text = [string] $fixture2.reply
        from_email = [string] $demoRow[0].email
        subject = "Re: Quick check-in [$($demoRow[0].ref_token)]"
        message_id = "$runId-fixture-2"
    } -TimeoutSec 120
    $fixture2Timer.Stop()
    Assert-True ([string] $fixture2Response.classification.intent -eq "GRIEVANCE") "Run $RunNumber fixture 2 intent should be GRIEVANCE."
    Assert-True ([string] $fixture2Response.classification.grievance_category -eq "MAINTENANCE") "Run $RunNumber fixture 2 category should be MAINTENANCE."
    Assert-True ([string] $fixture2Response.classification.urgency -eq "HIGH") "Run $RunNumber fixture 2 urgency should be HIGH."
    Assert-True ([int] $fixture2Response.processed_count -eq 1) "Run $RunNumber fixture 2 should process one reply."

    $fixture7Timer = [System.Diagnostics.Stopwatch]::StartNew()
    $fixture7Response = Invoke-JsonPost -Path "check-replies" -Body @{
        reply_text = [string] $fixture7.reply
        from_email = [string] $demoRow[0].email
        subject = "Re: Quick check-in [$($demoRow[0].ref_token)]"
        message_id = "$runId-fixture-7"
    } -TimeoutSec 120
    $fixture7Timer.Stop()
    Assert-True ([string] $fixture7Response.classification.compliance_flag -eq "ACCOMMODATION_REQUEST") "Run $RunNumber fixture 7 should flag ACCOMMODATION_REQUEST."
    Assert-True ([int] $fixture7Response.processed_count -eq 1) "Run $RunNumber fixture 7 should process one reply."

    $leasesAfterReplies = @(Read-Leases)
    $demoAfterReplies = @($leasesAfterReplies | Where-Object { [string] $_.tenant_name -eq "Avery Brooks" } | Select-Object -First 1)
    Assert-True ([string] $demoAfterReplies[0].status -eq "AT_RISK") "Run $RunNumber demo row should be AT_RISK after alertable replies."

    $logsAfterReplies = @(Read-OutreachLog)
    $sentLogs = @($logsAfterReplies | Where-Object { [string] $_.event_type -eq "SENT" -and [string] $_.lease_id -eq [string] $demoRow[0].lease_id })
    $fixture2Logs = @($logsAfterReplies | Where-Object { [string] $_.event_id -eq "reply-$runId-fixture-2" })
    $fixture7Logs = @($logsAfterReplies | Where-Object { [string] $_.event_id -eq "reply-$runId-fixture-7" })
    Assert-True ($sentLogs.Count -eq 1) "Run $RunNumber expected one SENT log row."
    Assert-True ($fixture2Logs.Count -eq 1) "Run $RunNumber fixture 2 log row missing."
    Assert-True ($fixture7Logs.Count -eq 1) "Run $RunNumber fixture 7 log row missing."

    $replyBoard = Invoke-Board
    $replyHtml = [string] $replyBoard.Content
    Assert-True ($replyHtml.Contains("extractor fan") -or $replyHtml.Contains("risk-entry")) "Run $RunNumber board should reflect the at-risk reply feed."
    Assert-True ($replyHtml.Contains("ACCOMMODATION_REQUEST")) "Run $RunNumber board should show accommodation compliance flag."
    Assert-True ($replyHtml.Contains("Routed to you. No response was drafted.")) "Run $RunNumber board should show no-draft compliance copy."

    $totalTimer.Stop()
    return @{
        run = $RunNumber
        ok = $true
        total_elapsed_ms = [int] $totalTimer.ElapsedMilliseconds
        generate_elapsed_ms = [int] $generateTimer.ElapsedMilliseconds
        fixture2_elapsed_ms = [int] $fixture2Timer.ElapsedMilliseconds
        fixture7_elapsed_ms = [int] $fixture7Timer.ElapsedMilliseconds
        generated_count = [int] $generate.generated_count
        review_failed_count = [int] $generate.review_failed_count
        sent_count = [int] $send.sent_count
        duplicate_sent_count = [int] $sendAgain.sent_count
        fixture2_alerted_count = [int] $fixture2Response.alerted_count
        fixture7_alerted_count = [int] $fixture7Response.alerted_count
    }
}

Write-Host "==> Stage 8 static checks"
foreach ($workflow in @(
    ".\n8n-workflows\wf1-ingest.json",
    ".\n8n-workflows\wf2-dashboard.json",
    ".\n8n-workflows\wf3-draft-approve-send.json",
    ".\n8n-workflows\wf4-reply-classify-route.json",
    ".\n8n-workflows\wf5-daily-sweep-reset.json"
)) {
    Get-Content -Raw $workflow | ConvertFrom-Json | Out-Null
}
foreach ($script in @(
    ".\scripts\stage-3-ingest-lib.js",
    ".\scripts\stage-4-dashboard-lib.js",
    ".\scripts\stage-5-outbound-lib.js",
    ".\scripts\stage-6-reply-lib.js",
    ".\scripts\stage-7-ops-lib.js"
)) {
    node --check $script | Out-Null
    Assert-True ($LASTEXITCODE -eq 0) "JavaScript syntax check failed for $script."
}
foreach ($script in @(
    ".\scripts\package-stage-8-demo.ps1",
    ".\scripts\verify-stage-8.ps1"
)) {
    $errors = $null
    [System.Management.Automation.PSParser]::Tokenize((Get-Content -Raw $script), [ref] $errors) | Out-Null
    Assert-True (-not $errors) "PowerShell parser errors in $script."
}
Assert-WorkflowStaticSafety

Import-Stage8Workflows
$tableIds = Get-Stage8TableIds
Install-Stage8ReadWorkflows -TableIds $tableIds

$fixtures = Get-Content -Raw .\fixtures\reply-fixtures-expected.json | ConvertFrom-Json
$results = @()
for ($run = 1; $run -le 3; $run++) {
    $results += Invoke-Rehearsal -RunNumber $run -Fixtures $fixtures
}

Write-Host "==> Building Stage 8 demo package"
.\scripts\package-stage-8-demo.ps1 | Out-Host

Write-Host "==> Final clean reset"
$finalReset = Invoke-JsonPost -Path "reset-demo" -Body @{} -TimeoutSec 180
Assert-True ([int] $finalReset.inserted_count -eq 40) "Final reset should leave 40 lease rows."
$finalLeases = @(Read-Leases)
$finalLogs = @(Read-OutreachLog)
Assert-True ($finalLeases.Count -eq 40) "Final reset should leave 40 lease rows in Data Table."
Assert-True ($finalLogs.Count -eq 0) "Final reset should leave outreach_log empty."

$summary = @{
    ok = $true
    generated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    rehearsal_count = $results.Count
    board_url = "http://localhost:5678/webhook/board"
    package_path = "tmp\stage-8-demo-package"
    results = $results
}
Write-Utf8NoBomJson -Path (Join-Path $root "tmp\stage8-rehearsal-results.json") -Value $summary

Write-Host "Stage 8 verification passed."
foreach ($result in $results) {
    Write-Host ("Run {0}: total={1}ms generate={2}ms fixture2={3}ms fixture7={4}ms sent={5} duplicate_send={6}" -f $result.run, $result.total_elapsed_ms, $result.generate_elapsed_ms, $result.fixture2_elapsed_ms, $result.fixture7_elapsed_ms, $result.sent_count, $result.duplicate_sent_count)
}
Write-Host "Board URL: http://localhost:5678/webhook/board"
Write-Host "Results: tmp\stage8-rehearsal-results.json"
