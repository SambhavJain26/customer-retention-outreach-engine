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
            $items += $item
        } else {
            $items += $item
        }
    }
    return $items
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

function Get-Stage6TableIds {
    $path = Join-Path $root "tmp\stage6-data-table-ids.json"
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing $path. Run scripts/import-wf4-reply-classify-route.ps1 first."
    }
    return Get-Content -Raw $path | ConvertFrom-Json
}

function Read-DataTableRows {
    param(
        [Parameter(Mandatory)] [string] $TableName,
        [Parameter(Mandatory)] [string] $TableId
    )

    $workflowId = "stage6-read-$TableName"
    $webhookPath = "stage6-read-$TableName"
    $workflow = @{
        id = $workflowId
        name = "Stage 6 Read $TableName"
        active = $true
        nodes = @(
            (New-WebhookTriggerNode -Id "$workflowId-trigger" -Name "Stage 6 Read $TableName Trigger" -Path $webhookPath -X 0 -Y 0),
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
        connections = @{ "Stage 6 Read $TableName Trigger" = New-N8nMainConnection -Node "Read $TableName Rows" }
        settings = @{}
    }

    $path = Join-Path $root "tmp\$workflowId.json"
    Write-Utf8NoBomJson -Path $path -Value $workflow
    return ConvertTo-FlatArray (Invoke-N8nWebhookWorkflowFile -WorkflowPath $path -WorkflowId $workflowId -WebhookPath $webhookPath)
}

function Invoke-CheckReplies {
    param([Parameter(Mandatory)] $Payload)

    $json = $Payload | ConvertTo-Json -Depth 20
    $response = Invoke-RestMethod -Uri "http://localhost:5678/webhook/check-replies" -Method Post -ContentType "application/json" -Body $json -TimeoutSec 120
    $flat = @(ConvertTo-FlatArray $response)
    Assert-True ($flat.Count -ge 1) "Expected check-replies to return at least one response item."
    return $flat[0]
}

function Read-ExistingWebhookRows {
    param([Parameter(Mandatory)] [string] $WebhookPath)
    $response = Invoke-WebRequest -Uri "http://localhost:5678/webhook/$WebhookPath" -Method Post -UseBasicParsing -TimeoutSec 120
    if (-not $response.Content) { return @() }
    return ConvertTo-FlatArray ($response.Content | ConvertFrom-Json)
}

function Assert-Classification {
    param(
        [Parameter(Mandatory)] $Actual,
        [Parameter(Mandatory)] $Expected,
        [Parameter(Mandatory)] [string] $Label
    )

    foreach ($field in @("intent", "grievance_category", "urgency", "compliance_flag", "confidence", "requires_human")) {
        $expectedProperty = $Expected.PSObject.Properties[$field]
        if (-not $expectedProperty) { continue }
        $expectedValue = $expectedProperty.Value
        $actualValue = $Actual.classification.$field
        if ($field -eq "requires_human") {
            $actualValue = [bool] $actualValue
            $expectedValue = [bool] $expectedValue
        } else {
            $actualValue = [string] $actualValue
            $expectedValue = [string] $expectedValue
        }
        Assert-True ($actualValue -eq $expectedValue) "Fixture '$Label' expected $field=$expectedValue, got $actualValue."
    }

    $containsQuestionProperty = $Expected.PSObject.Properties["contains_question"]
    if ($containsQuestionProperty) {
        Assert-True ([bool] $Actual.classification.contains_question -eq [bool] $containsQuestionProperty.Value) "Fixture '$Label' contains_question mismatch."
    }
}

function Test-Truthy {
    param($Value)
    if ($Value -eq $true) { return $true }
    if ($Value -eq $false -or $null -eq $Value) { return $false }
    return @("true", "1", "yes", "y") -contains ([string] $Value).Trim().ToLowerInvariant()
}

Write-Host "Validating Stage 6 source files..."
Get-Content -Raw .\n8n-workflows\wf4-reply-classify-route.json | ConvertFrom-Json | Out-Null
node --check .\scripts\stage-6-reply-lib.js | Out-Null
node --check .\scripts\stage-4-dashboard-lib.js | Out-Null

$workflow = Get-Content -Raw .\n8n-workflows\wf4-reply-classify-route.json | ConvertFrom-Json
$tenantSendNodes = @($workflow.nodes | Where-Object {
    [string] $_.type -eq "n8n-nodes-base.gmail" -and @("send", "reply") -contains [string] $_.parameters.operation
})
Assert-True ($tenantSendNodes.Count -eq 0) "WF4 must not contain Gmail send/reply nodes."

Write-Host "Running local helper unit checks..."
@'
const lib = require("./scripts/stage-6-reply-lib.js");
const fixtures = require("./fixtures/reply-fixtures-expected.json");
for (const fixture of fixtures) {
  if (fixture.expected.intent === "NO_SIGNAL") {
    if (!lib.isAutoReply({ subject: "Re: check-in", reply_text: fixture.reply, headers: {} })) {
      throw new Error(`Expected ${fixture.label} to be detected as auto/no-signal`);
    }
    continue;
  }
  const c = lib.deterministicClassification(fixture.reply, {
    intent: "UNCLEAR",
    grievance_present: false,
    grievance_summary: "",
    grievance_category: "NONE",
    urgency: "LOW",
    compliance_flag: "NONE",
    suggested_human_action: "Read the reply and follow up personally.",
    confidence: "LOW",
  });
  for (const [key, value] of Object.entries(fixture.expected)) {
    if (["summary_must_include", "no_auto_reply", "no_alert", "no_token_spend", "opted_out"].includes(key)) continue;
    if (c[key] !== value) throw new Error(`${fixture.label}: expected ${key}=${value}, got ${c[key]}`);
  }
}
'@ | node -

Write-Host "Importing WF4 and dashboard..."
.\scripts\import-wf4-reply-classify-route.ps1 | Out-Host
.\scripts\import-wf2-dashboard.ps1 | Out-Host

$tableIds = Get-Stage6TableIds
$leases = Read-DataTableRows -TableName "leases" -TableId $tableIds.leases
$targetLease = @($leases | Where-Object { [string] $_.ref_token -and [string] $_.email } | Select-Object -First 1)
Assert-True ($targetLease.Count -eq 1) "Stage 6 verification needs one existing lease with ref_token and email. Run Stage 5 first."
$lease = $targetLease[0]
$targetLeaseId = [string] $lease.lease_id
$runId = "stage6-verify-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"

Write-Host "Using lease $($lease.lease_id) with token $($lease.ref_token) for fixture routing."

$fixtures = Get-Content -Raw .\fixtures\reply-fixtures-expected.json | ConvertFrom-Json
$fixture2Response = $null
$fixture2ElapsedMs = $null

foreach ($fixture in $fixtures) {
    $payload = @{
        reply_text = [string] $fixture.reply
        from_email = [string] $lease.email
        subject = "Re: Quick check-in [$($lease.ref_token)]"
        message_id = "$runId-fixture-$($fixture.id)"
        suppress_alerts = $true
    }

    if ([int] $fixture.id -eq 2) {
        $fixture2Start = Get-Date
        $response = Invoke-CheckReplies -Payload $payload
        $fixture2ElapsedMs = [int] ((Get-Date) - $fixture2Start).TotalMilliseconds
    } else {
        $response = Invoke-CheckReplies -Payload $payload
    }
    if ([int] $fixture.id -eq 2) {
        $fixture2Response = $response
    }

    $noAlertProperty = $fixture.expected.PSObject.Properties["no_alert"]
    $isNoAlert = $noAlertProperty -and [bool] $noAlertProperty.Value
    if ($isNoAlert) {
        Assert-True ([int] $response.no_signal_count -eq 1) "Fixture '$($fixture.label)' should be logged as no signal."
        Assert-True ([int] $response.alerted_count -eq 0) "Fixture '$($fixture.label)' should not alert."
    } else {
        Assert-True ([int] $response.processed_count -eq 1) "Fixture '$($fixture.label)' should process one reply."
        Assert-Classification -Actual $response -Expected $fixture.expected -Label $fixture.label
    }

    $optedOutProperty = $fixture.expected.PSObject.Properties["opted_out"]
    if ($optedOutProperty -and [bool] $optedOutProperty.Value) {
        Assert-True ([string] $response.classification.intent -eq "OPT_OUT") "Fixture '$($fixture.label)' should classify as OPT_OUT."
    }
}

Start-Sleep -Seconds 1
$leaseRowsAfterFixtures = @(Read-ExistingWebhookRows -WebhookPath "stage5-read-leases" | Where-Object { [string] $_.lease_id -eq $targetLeaseId })
$hasOptedOutRowAfterFixtures = @($leaseRowsAfterFixtures | Where-Object { Test-Truthy -Value ($_.opted_out) }).Count -gt 0
Assert-True ($leaseRowsAfterFixtures.Count -ge 1 -and $hasOptedOutRowAfterFixtures) "Fixture 9 should persist opted_out=true on $targetLeaseId."

Assert-True ($fixture2Response -ne $null) "Fixture 2 response missing."
Assert-True ([string] $fixture2Response.classification.intent -eq "GRIEVANCE") "Fixture 2 should classify as GRIEVANCE."
Assert-True ([string] $fixture2Response.classification.grievance_category -eq "MAINTENANCE") "Fixture 2 should classify as MAINTENANCE."
Assert-True ([string] $fixture2Response.classification.urgency -eq "HIGH") "Fixture 2 should classify as HIGH urgency."
Assert-True ($fixture2ElapsedMs -lt 30000) "Fixture 2 request took too long for POC verification: ${fixture2ElapsedMs}ms."

Write-Host "Checking duplicate idempotency..."
$dupePayload = @{
    reply_text = [string] $fixtures[1].reply
    from_email = [string] $lease.email
    subject = "Re: Quick check-in [$($lease.ref_token)]"
    message_id = "$runId-fixture-2"
    suppress_alerts = $true
}
$duplicateResponse = Invoke-CheckReplies -Payload $dupePayload
Assert-True ([int] $duplicateResponse.duplicate_count -eq 1) "Duplicate message should be skipped."
Assert-True ([int] $duplicateResponse.processed_count -eq 0) "Duplicate message should not process again."

Write-Host "Checking unmatched routing..."
$unmatchedResponse = Invoke-CheckReplies -Payload @{
    reply_text = "This is about the apartment but I am writing from a different email address."
    from_email = "unmatched.sender@example.com"
    subject = "Re: Quick check-in"
    message_id = "$runId-unmatched"
    suppress_alerts = $true
}
Assert-True ([int] $unmatchedResponse.unmatched_count -eq 1) "Unmatched reply should report unmatched_count=1."
Assert-True (-not [string] $unmatchedResponse.lease_id) "Unmatched reply must not assign a lease."

Write-Host "Checking Data Table log and board rendering..."
$logs = Read-DataTableRows -TableName "outreach_log" -TableId $tableIds.outreach_log
$fixture7Event = "reply-$runId-fixture-7"
$fixture7Log = @($logs | Where-Object { [string] $_.event_id -eq $fixture7Event } | Select-Object -First 1)
Assert-True ($fixture7Log.Count -eq 1) "Fixture 7 reply log row missing."
Assert-True ([string] $fixture7Log[0].compliance_flag -eq "ACCOMMODATION_REQUEST") "Fixture 7 log should carry ACCOMMODATION_REQUEST."

$fixture8Event = "reply-$runId-fixture-8"
$fixture8Log = @($logs | Where-Object { [string] $_.event_id -eq $fixture8Event } | Select-Object -First 1)
Assert-True ($fixture8Log.Count -eq 1) "Fixture 8 no-signal log row missing."
Assert-True ([string] $fixture8Log[0].intent -eq "NO_SIGNAL") "Fixture 8 log should carry NO_SIGNAL."
Assert-True (-not [bool] $fixture8Log[0].requires_human) "Fixture 8 should not require human."

$board = Invoke-WebRequest -Uri "http://localhost:5678/webhook/board" -UseBasicParsing -TimeoutSec 30
Assert-True ($board.StatusCode -eq 200) "Board should return HTTP 200."
Assert-True ($board.Content.Contains("data-action=`"check-replies`"")) "Board should include the real check-replies action."
Assert-True ($board.Content.Contains("/webhook/check-replies")) "Board should call /webhook/check-replies."
Assert-True (-not $board.Content.Contains("Stage 6 will wire reply checking")) "Board should not show Stage 6 stub messaging."
Assert-True ($board.Content.Contains("Routed to you. No response was drafted.")) "Board should show compliance no-draft copy."

Write-Host "Stage 6 verification passed."
Write-Host "Fixture 2 classification response time: ${fixture2ElapsedMs}ms."
