param(
  [string]$JsonPath = "demo\sentracore-full-realtime-demo.json",
  [string]$ApiBase = "http://localhost:8787"
)

$ErrorActionPreference = "Stop"

Write-Host "=== SENTRACORE FULL REALTIME DASHBOARD PUSHER ===" -ForegroundColor Cyan
Write-Host "JSON: $JsonPath"
Write-Host "API : $ApiBase"

if (!(Test-Path $JsonPath)) {
  throw "JSON file not found: $JsonPath"
}

try {
  $health = Invoke-RestMethod "$ApiBase/health"
  Write-Host "Backend: $($health.status) / $($health.service)" -ForegroundColor Green
} catch {
  Write-Host "Backend not reachable. Start with: npm run backend:dev" -ForegroundColor Red
  throw
}

$payload = Get-Content $JsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

if ($null -eq $payload.frames -or $payload.frames.Count -lt 1) {
  throw "frames[] is required in $JsonPath"
}

Write-Host "Scenario : $($payload.scenario)"
Write-Host "Frames   : $($payload.frames.Count)"
Write-Host "Interval : $($payload.intervalMs)ms"

$interval = if ($payload.intervalMs) { [int]$payload.intervalMs } else { 1800 }

foreach ($frame in $payload.frames) {
  $body = @{
    frame = $frame
  } | ConvertTo-Json -Depth 50

  Write-Host ""
  Write-Host "PUSH FRAME -> /admin/realtime-demo/tick" -ForegroundColor Cyan

  $response = Invoke-RestMethod `
    -Method Post `
    -Uri "$ApiBase/admin/realtime-demo/tick" `
    -ContentType "application/json" `
    -Body $body

  Write-Host "UpdatedAt: $($response.state.updatedAt)" -ForegroundColor Green
  Write-Host "Audits24h: $($response.state.metrics.audits24h) | Queue: $($response.state.metrics.queueDepth) | Vulns: $($response.state.metrics.vulnsDetected)" -ForegroundColor Yellow

  Start-Sleep -Milliseconds $interval
}

Write-Host ""
Write-Host "Creating and processing sample audit jobs..." -ForegroundColor Cyan

$targets = @(
  @{ chain = "ethereum"; target = "DemoVault"; sourceType = "solidity"; priority = "critical" },
  @{ chain = "solana"; target = "EscrowProgram"; sourceType = "rust"; priority = "high" },
  @{ chain = "polygon"; target = "RewardDistributor"; sourceType = "solidity"; priority = "normal" }
)

foreach ($target in $targets) {
  $job = Invoke-RestMethod `
    -Method Post `
    -Uri "$ApiBase/audit/jobs" `
    -ContentType "application/json" `
    -Body ($target | ConvertTo-Json -Depth 10)

  Write-Host "Created job: $($job.job.id)" -ForegroundColor Green

  Start-Sleep -Milliseconds 700

  $processed = Invoke-RestMethod `
    -Method Post `
    -Uri "$ApiBase/audit/jobs/$($job.job.id)/process"

  Write-Host "Processed: $($processed.result.target) / findings=$($processed.result.findings.Count)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Final metrics:" -ForegroundColor Cyan
Invoke-RestMethod "$ApiBase/audit/metrics"

Write-Host ""
Write-Host "Full realtime demo completed. Dashboard should move through backend polling." -ForegroundColor Green
Read-Host "Press ENTER to close"
