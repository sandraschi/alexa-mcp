param([switch]$Headless, [switch]$BackendOnly, [switch]$NoBrowser)
$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $PSCommandPath
$BackendPort = 10801
$FrontendPort = 10800

# Port zombie clearing
Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

Write-Host "Starting alexa-mcp..." -ForegroundColor Cyan

# Start backend via Start-Job with proper working directory
$BackendJob = Start-Job -Name "backend" -ScriptBlock {
    param($Root, $Port)
    Set-Location $Root
    uv run python -m alexa_mcp --http --port $Port
} -ArgumentList $ScriptRoot, $BackendPort

# Readiness poll
Write-Host "Waiting for backend on port $BackendPort..." -ForegroundColor Yellow
for ($i = 0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/api/status" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($r.StatusCode -eq 200) {
            Write-Host "Backend ready" -ForegroundColor Green
            break
        }
    } catch {}
    Start-Sleep 1
}

if ($BackendOnly -or $Headless) {
    Write-Host "Backend running on http://127.0.0.1:$BackendPort" -ForegroundColor Cyan
    return
}

# Start frontend
$WebRoot = Join-Path $ScriptRoot "web_sota"
Push-Location $WebRoot
Start-Process -NoNewWindow -FilePath "npx" -ArgumentList "vite --port $FrontendPort --host 127.0.0.1" -WorkingDirectory $WebRoot
Pop-Location

# Auto-open browser
if (-not $NoBrowser) {
    Start-Process "http://127.0.0.1:$FrontendPort"
}

Write-Host "Frontend: http://127.0.0.1:$FrontendPort" -ForegroundColor Cyan
Write-Host "Backend:  http://127.0.0.1:$BackendPort" -ForegroundColor Cyan

# Keep-alive
while ($true) {
    if ($BackendJob.State -eq "Completed" -or $BackendJob.State -eq "Failed") {
        Receive-Job $BackendJob
        break
    }
    Start-Sleep 2
}
