param(
    [string]$JsonPath = "demo\sentracore-admin-realtime-demo.json",
    [string]$ApiBase = "http://localhost:8787"
)

$ErrorActionPreference = "Stop"

Write-Host "=== SENTRACORE REALTIME DEMO PUSHER ===" -ForegroundColor Cyan
Write-Host "JSON   : $JsonPath"
Write-Host "API    : $ApiBase"

if (!(Test-Path $JsonPath)) {
    throw "JSON file not found: $JsonPath"
}

# ------------------------------------------------------------
# 1. Check backend health
# ------------------------------------------------------------

try {
    $health = Invoke-RestMethod "$ApiBase/health"
    Write-Host "Backend status: $($health.status) / $($health.service)" -ForegroundColor Green
} catch {
    Write-Host "Backend is not reachable at $ApiBase" -ForegroundColor Red
    Write-Host "Start it with: npm run backend:dev"
    throw
}

# ------------------------------------------------------------
# 2. Read and validate JSON lightly
# ------------------------------------------------------------

$raw = Get-Content $JsonPath -Raw -Encoding UTF8
$payload = $raw | ConvertFrom-Json

$errors = New-Object System.Collections.Generic.List[string]

if ([string]::IsNullOrWhiteSpace($payload.scenario)) {
    $errors.Add("scenario is required")
}

if ($null -eq $payload.intervalMs -or [int]$payload.intervalMs -lt 300) {
    $errors.Add("intervalMs must be >= 300")
}

if ($null -eq $payload.autoProcess) {
    $errors.Add("autoProcess is required")
}

if ($null -eq $payload.events -or $payload.events.Count -lt 1) {
    $errors.Add("events must contain at least 1 item")
}

$allowedChains = @("ethereum", "solana", "polygon", "bsc")
$allowedSourceTypes = @("solidity", "rust", "vyper", "bytecode", "program")
$allowedPriorities = @("low", "normal", "high", "critical")

for ($i = 0; $i -lt $payload.events.Count; $i++) {
    $event = $payload.events[$i]

    if ($allowedChains -notcontains $event.chain) {
        $errors.Add("events[$i].chain is invalid: $($event.chain)")
    }

    if ([string]::IsNullOrWhiteSpace($event.target)) {
        $errors.Add("events[$i].target is required")
    }

    if ($allowedSourceTypes -notcontains $event.sourceType) {
        $errors.Add("events[$i].sourceType is invalid: $($event.sourceType)")
    }

    if ($allowedPriorities -notcontains $event.priority) {
        $errors.Add("events[$i].priority is invalid: $($event.priority)")
    }
}

if ($errors.Count -gt 0) {
    Write-Host "JSON validation failed:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
    throw "Invalid realtime demo JSON"
}

Write-Host "JSON validation: PASS" -ForegroundColor Green
Write-Host "Scenario       : $($payload.scenario)"
Write-Host "Events         : $($payload.events.Count)"
Write-Host "Auto process   : $($payload.autoProcess)"
Write-Host "Interval       : $($payload.intervalMs)ms"

# ------------------------------------------------------------
# 3. Push events to backend
# ------------------------------------------------------------

$createdJobs = @()

foreach ($event in $payload.events) {
    $bodyObject = @{
        chain = $event.chain
        target = $event.target
        sourceType = $event.sourceType
        priority = $event.priority
        note = $event.note
    }

    $body = $bodyObject | ConvertTo-Json -Depth 10

    Write-Host ""
    Write-Host "INSERT -> $($event.chain) / $($event.target) / $($event.priority)" -ForegroundColor Cyan

    $created = Invoke-RestMethod `
        -Method Post `
        -Uri "$ApiBase/audit/jobs" `
        -ContentType "application/json" `
        -Body $body

    $createdJobs += $created.job

    Write-Host "Created job: $($created.job.id)" -ForegroundColor Green

    if ($payload.autoProcess -eq $true) {
        Start-Sleep -Milliseconds 500

        $processed = Invoke-RestMethod `
            -Method Post `
            -Uri "$ApiBase/audit/jobs/$($created.job.id)/process"

        Write-Host "Processed job: $($processed.result.id) / findings: $($processed.result.findings.Count)" -ForegroundColor Yellow
    }

    $metrics = Invoke-RestMethod "$ApiBase/audit/metrics"

    Write-Host "Metrics -> totalJobs=$($metrics.totalJobs), completed=$($metrics.completedJobs), findings=$($metrics.totalFindings)" -ForegroundColor Magenta

    Start-Sleep -Milliseconds ([int]$payload.intervalMs)
}

# ------------------------------------------------------------
# 4. Final state
# ------------------------------------------------------------

Write-Host ""
Write-Host "=== FINAL BACKEND STATE ===" -ForegroundColor Cyan
Invoke-RestMethod "$ApiBase/audit/metrics"

Write-Host ""
Write-Host "Latest jobs:"
$jobs = Invoke-RestMethod "$ApiBase/audit/jobs"
$jobs.jobs | Select-Object -First 10 id,status,chain,target,priority,createdAt | Format-Table -AutoSize

Write-Host ""
Write-Host "Realtime demo completed. Dashboard should update via polling." -ForegroundColor Green
Read-Host "Press ENTER to close"
