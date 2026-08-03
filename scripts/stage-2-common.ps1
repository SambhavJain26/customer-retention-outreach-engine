Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Read-DotEnv {
    param([string] $Path)

    $values = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $values
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }
        $parts = $trimmed.Split("=", 2)
        if ($parts.Count -eq 2) {
            $values[$parts[0]] = $parts[1]
        }
    }
    return $values
}

function Write-Utf8NoBomJson {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] $Value
    )

    $json = $Value | ConvertTo-Json -Depth 100
    [System.IO.File]::WriteAllText($Path, $json, [System.Text.UTF8Encoding]::new($false))
}

function New-N8nMainConnection {
    param([Parameter(Mandatory)] [string] $Node)

    return @{ main = @(, @(@{ node = $Node; type = "main"; index = 0 })) }
}

function Wait-N8nHttp {
    param([string] $Url = "http://localhost:5678/healthz")

    $deadline = (Get-Date).AddSeconds(90)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        } catch {
            Start-Sleep -Seconds 3
        }
    } while ((Get-Date) -lt $deadline)

    throw "n8n did not become reachable at $Url within 90 seconds."
}

function Import-N8nWorkflowFile {
    param(
        [Parameter(Mandatory)] [string] $WorkflowPath,
        [switch] $RespectActiveState
    )

    $containerPath = "/tmp/$([System.IO.Path]::GetFileName($WorkflowPath))"
    docker cp $WorkflowPath "renewal-retention-n8n:$containerPath" | Out-Null
    $args = @("compose", "exec", "-T", "n8n", "n8n", "import:workflow", "--input=$containerPath")
    if ($RespectActiveState) {
        $args += "--activeState=fromJson"
    }
    $importOutput = docker @args 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        throw $importOutput
    }
}

function Enable-N8nWorkflow {
    param([Parameter(Mandatory)] [string] $WorkflowId)

    docker compose exec -T n8n n8n update:workflow "--id=$WorkflowId" --active=true | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to activate workflow $WorkflowId."
    }
    docker compose exec -T n8n n8n publish:workflow "--id=$WorkflowId" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to publish workflow $WorkflowId."
    }
    docker compose restart n8n | Out-Null
    Wait-N8nHttp
    Start-Sleep -Seconds 5
}

function Invoke-N8nWebhookWorkflowFile {
    param(
        [Parameter(Mandatory)] [string] $WorkflowPath,
        [Parameter(Mandatory)] [string] $WorkflowId,
        [Parameter(Mandatory)] [string] $WebhookPath
    )

    Import-N8nWorkflowFile -WorkflowPath $WorkflowPath
    Enable-N8nWorkflow -WorkflowId $WorkflowId
    $url = "http://localhost:5678/webhook/$WebhookPath"
    $deadline = (Get-Date).AddSeconds(60)
    $lastError = $null
    do {
        try {
            $response = Invoke-WebRequest -Uri $url -Method Post -UseBasicParsing -TimeoutSec 120
            break
        } catch {
            $lastError = $_
            if ((Get-Date) -ge $deadline) {
                throw $lastError
            }
            Start-Sleep -Seconds 3
        }
    } while ($true)

    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
        throw "Webhook $url returned status $($response.StatusCode)."
    }
    if (-not $response.Content) {
        return $null
    }
    return $response.Content | ConvertFrom-Json
}

function Get-N8nExecutionJson {
    param([Parameter(Mandatory)] [string] $Output)

    $marker = $Output.IndexOf("{`n  `"data`"")
    if ($marker -lt 0) {
        $marker = $Output.IndexOf("{`r`n  `"data`"")
    }
    if ($marker -lt 0) {
        throw "Could not locate n8n raw execution JSON in output."
    }
    $json = $Output.Substring($marker)
    return $json | ConvertFrom-Json
}

function Invoke-N8nWorkflowFile {
    param(
        [Parameter(Mandatory)] [string] $WorkflowPath,
        [Parameter(Mandatory)] [string] $WorkflowId
    )

    $containerPath = "/tmp/$([System.IO.Path]::GetFileName($WorkflowPath))"
    Import-N8nWorkflowFile -WorkflowPath $WorkflowPath

    $stopped = $false
    try {
        docker compose stop n8n | Out-Null
        $stopped = $true
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $output = docker compose run --rm --no-deps n8n execute "--id=$WorkflowId" --rawOutput 2>&1 | Out-String
            $exitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        if ($exitCode -ne 0) {
            throw $output
        }
        return Get-N8nExecutionJson -Output $output
    } finally {
        if ($stopped) {
            docker compose up -d n8n | Out-Null
        }
    }
}

function Get-NodeOutputItems {
    param(
        [Parameter(Mandatory)] $Execution,
        [Parameter(Mandatory)] [string] $NodeName
    )

    $runs = $Execution.data.resultData.runData.$NodeName
    if (-not $runs) {
        throw "No run data found for node '$NodeName'."
    }

    $items = @()
    foreach ($run in $runs) {
        foreach ($branch in $run.data.main) {
            foreach ($item in $branch) {
                $items += $item.json
            }
        }
    }
    return $items
}

function Resolve-Stage2DataTableIds {
    param(
        [Parameter(Mandatory)] $Tables,
        [Parameter(Mandatory)] $Schema
    )

    $flatTables = @()
    foreach ($table in @($Tables)) {
        if ($table -is [array]) {
            $flatTables += $table
        } else {
            $flatTables += $table
        }
    }

    $tableIds = @{}
    foreach ($expectedTable in $Schema.tables) {
        $expectedName = [string] $expectedTable.name
        $match = @($flatTables | Where-Object { [string] $_.name -eq $expectedName })
        if ($match.Count -ne 1) {
            throw "Expected exactly one Data Table named '$expectedName', found $($match.Count)."
        }

        $ids = @($match | Select-Object -First 1 -ExpandProperty id)
        if ($ids.Count -ne 1 -or -not $ids[0]) {
            throw "Expected one scalar ID for Data Table '$expectedName', found $($ids.Count)."
        }
        $tableIds[$expectedName] = [string] $ids[0]
    }

    return $tableIds
}
