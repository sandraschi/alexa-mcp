# Alexa MCP Web Gateway - SOTA v14.1 Industrial Start
$WebPort = 10800
$BackendPort = 10801
$ProjectRoot = Split-Path -Parent $PSScriptRoot

# 1. Purge Port Squatters
Write-Host " [CLEAN] Checking for port squatters on $WebPort and $BackendPort..." -ForegroundColor Yellow
$pids = Get-NetTCPConnection -LocalPort $WebPort, $BackendPort -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 4 } | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) {
    Write-Host " [KILL] Terminating PID: $p" -ForegroundColor Red
    try { Stop-Process -Id $p -Force -ErrorAction Stop } catch { Write-Host " [WARN] Could not terminate $p." -ForegroundColor Gray }
}

# 2. Environment Setup
Set-Location $PSScriptRoot
if (-not (Test-Path "node_modules")) { 
    Write-Host " [INSTALL] Node modules missing. Running npm install..." -ForegroundColor Cyan
    npm install 
}

# 3. Start Backend Bridge (Industrial Gateway)
Write-Host " [BACKEND] Starting Alexa MCP Bridge on port $BackendPort..." -ForegroundColor Cyan
$srcPath = Join-Path $ProjectRoot "src"
# Use asgi_app to ensure the Web Bridge (FastAPI) is served, not just the Protocol layer
$backendCmd = "Set-Location '$ProjectRoot'; `$env:PYTHONPATH = '$srcPath'; uv run uvicorn alexa_mcp.server:asgi_app --host 127.0.0.1 --port $BackendPort --log-level info"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal

# 4. Start Frontend (Vite Dev Server)
Write-Host " [FRONTEND] Starting Vite frontend on port $WebPort..." -ForegroundColor Green

# 4b. Auto-Open Browser (Polling)
$frontendUrl = "http://127.0.0.1:$WebPort/"
$pollAndOpen = "for (`$i = 0; `$i -lt 60; `$i++) { try { `$null = Invoke-WebRequest -Uri '$frontendUrl' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Start-Process '$frontendUrl'; exit } catch { Start-Sleep -Seconds 1 } }"
Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Hidden", "-Command", $pollAndOpen

Write-Host " [SOTA] System is orchestrating. Dashboard will open shortly." -ForegroundColor Gray
npm run dev -- --port $WebPort --host



