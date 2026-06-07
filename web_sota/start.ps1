Param([switch]$Headless)

# Fast port helpers (scripts/PortHelpers.ps1)
Param([switch]$Headless)
$SkipFrontend = $Headless

# --- SOTA Headless Standard ---
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
$WindowStyle = if ($Headless) { 'Hidden' } else { 'Normal' }
# ------------------------------

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

# 3b. Wait until uvicorn is listening (Vite proxies /api to this port; starting Vite first causes ECONNREFUSED spam)
Write-Host " [WAIT] Waiting for backend TCP on port $BackendPort..." -ForegroundColor DarkGray
$backendReady = $false
for ($i = 0; $i -lt 120; $i++) {
    $tcp = $null
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $BackendPort)
        if ($tcp.Connected) {
            Write-Host " [BACKEND] Listening (waited $($i * 250) ms)." -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Start-Sleep -Milliseconds 250
    } finally {
        if ($null -ne $tcp) {
            try { $tcp.Close() } catch {}
            try { $tcp.Dispose() } catch {}
        }
    }
}
if (-not $backendReady) {
    Write-Host " [WARN] Port $BackendPort not open after ~30s. Open the backend window for errors; Vite /api proxy will fail until it is up." -ForegroundColor Yellow
}

# 4. Start Frontend (Vite Dev Server)
Write-Host " [FRONTEND] Starting Vite frontend on port $WebPort..." -ForegroundColor Green

# 4b. Auto-Open Browser (Polling)
$frontendUrl = "http://127.0.0.1:$WebPort/"
$pollAndOpen = "for (`$i = 0; `$i -lt 60; `$i++) { try { `$null = Invoke-WebRequest -Uri '$frontendUrl' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Start-Process '$frontendUrl'; exit } catch { Start-Sleep -Seconds 1 } }"
Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Hidden", "-Command", $pollAndOpen

Write-Host " [SOTA] System is orchestrating. Dashboard will open shortly." -ForegroundColor Gray
if ($SkipFrontend) { return }
npm run dev -- --port $WebPort --host




_RepoRootForPorts = Split-Path -Parent $PSScriptRoot
Param([switch]$Headless)
$SkipFrontend = $Headless

# --- SOTA Headless Standard ---
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
$WindowStyle = if ($Headless) { 'Hidden' } else { 'Normal' }
# ------------------------------

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

# 3b. Wait until uvicorn is listening (Vite proxies /api to this port; starting Vite first causes ECONNREFUSED spam)
Write-Host " [WAIT] Waiting for backend TCP on port $BackendPort..." -ForegroundColor DarkGray
$backendReady = $false
for ($i = 0; $i -lt 120; $i++) {
    $tcp = $null
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $BackendPort)
        if ($tcp.Connected) {
            Write-Host " [BACKEND] Listening (waited $($i * 250) ms)." -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Start-Sleep -Milliseconds 250
    } finally {
        if ($null -ne $tcp) {
            try { $tcp.Close() } catch {}
            try { $tcp.Dispose() } catch {}
        }
    }
}
if (-not $backendReady) {
    Write-Host " [WARN] Port $BackendPort not open after ~30s. Open the backend window for errors; Vite /api proxy will fail until it is up." -ForegroundColor Yellow
}

# 4. Start Frontend (Vite Dev Server)
Write-Host " [FRONTEND] Starting Vite frontend on port $WebPort..." -ForegroundColor Green

# 4b. Auto-Open Browser (Polling)
$frontendUrl = "http://127.0.0.1:$WebPort/"
$pollAndOpen = "for (`$i = 0; `$i -lt 60; `$i++) { try { `$null = Invoke-WebRequest -Uri '$frontendUrl' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Start-Process '$frontendUrl'; exit } catch { Start-Sleep -Seconds 1 } }"
Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Hidden", "-Command", $pollAndOpen

Write-Host " [SOTA] System is orchestrating. Dashboard will open shortly." -ForegroundColor Gray
if ($SkipFrontend) { return }
npm run dev -- --port $WebPort --host




_PortHelpers = Join-Path Param([switch]$Headless)
$SkipFrontend = $Headless

# --- SOTA Headless Standard ---
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
$WindowStyle = if ($Headless) { 'Hidden' } else { 'Normal' }
# ------------------------------

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

# 3b. Wait until uvicorn is listening (Vite proxies /api to this port; starting Vite first causes ECONNREFUSED spam)
Write-Host " [WAIT] Waiting for backend TCP on port $BackendPort..." -ForegroundColor DarkGray
$backendReady = $false
for ($i = 0; $i -lt 120; $i++) {
    $tcp = $null
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $BackendPort)
        if ($tcp.Connected) {
            Write-Host " [BACKEND] Listening (waited $($i * 250) ms)." -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Start-Sleep -Milliseconds 250
    } finally {
        if ($null -ne $tcp) {
            try { $tcp.Close() } catch {}
            try { $tcp.Dispose() } catch {}
        }
    }
}
if (-not $backendReady) {
    Write-Host " [WARN] Port $BackendPort not open after ~30s. Open the backend window for errors; Vite /api proxy will fail until it is up." -ForegroundColor Yellow
}

# 4. Start Frontend (Vite Dev Server)
Write-Host " [FRONTEND] Starting Vite frontend on port $WebPort..." -ForegroundColor Green

# 4b. Auto-Open Browser (Polling)
$frontendUrl = "http://127.0.0.1:$WebPort/"
$pollAndOpen = "for (`$i = 0; `$i -lt 60; `$i++) { try { `$null = Invoke-WebRequest -Uri '$frontendUrl' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Start-Process '$frontendUrl'; exit } catch { Start-Sleep -Seconds 1 } }"
Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Hidden", "-Command", $pollAndOpen

Write-Host " [SOTA] System is orchestrating. Dashboard will open shortly." -ForegroundColor Gray
if ($SkipFrontend) { return }
npm run dev -- --port $WebPort --host




_RepoRootForPorts 'scripts\PortHelpers.ps1'
if (Test-Path -LiteralPath Param([switch]$Headless)
$SkipFrontend = $Headless

# --- SOTA Headless Standard ---
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
$WindowStyle = if ($Headless) { 'Hidden' } else { 'Normal' }
# ------------------------------

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

# 3b. Wait until uvicorn is listening (Vite proxies /api to this port; starting Vite first causes ECONNREFUSED spam)
Write-Host " [WAIT] Waiting for backend TCP on port $BackendPort..." -ForegroundColor DarkGray
$backendReady = $false
for ($i = 0; $i -lt 120; $i++) {
    $tcp = $null
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $BackendPort)
        if ($tcp.Connected) {
            Write-Host " [BACKEND] Listening (waited $($i * 250) ms)." -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Start-Sleep -Milliseconds 250
    } finally {
        if ($null -ne $tcp) {
            try { $tcp.Close() } catch {}
            try { $tcp.Dispose() } catch {}
        }
    }
}
if (-not $backendReady) {
    Write-Host " [WARN] Port $BackendPort not open after ~30s. Open the backend window for errors; Vite /api proxy will fail until it is up." -ForegroundColor Yellow
}

# 4. Start Frontend (Vite Dev Server)
Write-Host " [FRONTEND] Starting Vite frontend on port $WebPort..." -ForegroundColor Green

# 4b. Auto-Open Browser (Polling)
$frontendUrl = "http://127.0.0.1:$WebPort/"
$pollAndOpen = "for (`$i = 0; `$i -lt 60; `$i++) { try { `$null = Invoke-WebRequest -Uri '$frontendUrl' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Start-Process '$frontendUrl'; exit } catch { Start-Sleep -Seconds 1 } }"
Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Hidden", "-Command", $pollAndOpen

Write-Host " [SOTA] System is orchestrating. Dashboard will open shortly." -ForegroundColor Gray
if ($SkipFrontend) { return }
npm run dev -- --port $WebPort --host




_PortHelpers) { . Param([switch]$Headless)
$SkipFrontend = $Headless

# --- SOTA Headless Standard ---
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
$WindowStyle = if ($Headless) { 'Hidden' } else { 'Normal' }
# ------------------------------

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

# 3b. Wait until uvicorn is listening (Vite proxies /api to this port; starting Vite first causes ECONNREFUSED spam)
Write-Host " [WAIT] Waiting for backend TCP on port $BackendPort..." -ForegroundColor DarkGray
$backendReady = $false
for ($i = 0; $i -lt 120; $i++) {
    $tcp = $null
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $BackendPort)
        if ($tcp.Connected) {
            Write-Host " [BACKEND] Listening (waited $($i * 250) ms)." -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Start-Sleep -Milliseconds 250
    } finally {
        if ($null -ne $tcp) {
            try { $tcp.Close() } catch {}
            try { $tcp.Dispose() } catch {}
        }
    }
}
if (-not $backendReady) {
    Write-Host " [WARN] Port $BackendPort not open after ~30s. Open the backend window for errors; Vite /api proxy will fail until it is up." -ForegroundColor Yellow
}

# 4. Start Frontend (Vite Dev Server)
Write-Host " [FRONTEND] Starting Vite frontend on port $WebPort..." -ForegroundColor Green

# 4b. Auto-Open Browser (Polling)
$frontendUrl = "http://127.0.0.1:$WebPort/"
$pollAndOpen = "for (`$i = 0; `$i -lt 60; `$i++) { try { `$null = Invoke-WebRequest -Uri '$frontendUrl' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Start-Process '$frontendUrl'; exit } catch { Start-Sleep -Seconds 1 } }"
Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Hidden", "-Command", $pollAndOpen

Write-Host " [SOTA] System is orchestrating. Dashboard will open shortly." -ForegroundColor Gray
if ($SkipFrontend) { return }
npm run dev -- --port $WebPort --host




_PortHelpers }
$SkipFrontend = $Headless

# --- SOTA Headless Standard ---
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
$WindowStyle = if ($Headless) { 'Hidden' } else { 'Normal' }
# ------------------------------

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

# 3b. Wait until uvicorn is listening (Vite proxies /api to this port; starting Vite first causes ECONNREFUSED spam)
Write-Host " [WAIT] Waiting for backend TCP on port $BackendPort..." -ForegroundColor DarkGray
$backendReady = $false
for ($i = 0; $i -lt 120; $i++) {
    $tcp = $null
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $BackendPort)
        if ($tcp.Connected) {
            Write-Host " [BACKEND] Listening (waited $($i * 250) ms)." -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        Start-Sleep -Milliseconds 250
    } finally {
        if ($null -ne $tcp) {
            try { $tcp.Close() } catch {}
            try { $tcp.Dispose() } catch {}
        }
    }
}
if (-not $backendReady) {
    Write-Host " [WARN] Port $BackendPort not open after ~30s. Open the backend window for errors; Vite /api proxy will fail until it is up." -ForegroundColor Yellow
}

# 4. Start Frontend (Vite Dev Server)
Write-Host " [FRONTEND] Starting Vite frontend on port $WebPort..." -ForegroundColor Green

# 4b. Auto-Open Browser (Polling)
$frontendUrl = "http://127.0.0.1:$WebPort/"
$pollAndOpen = "for (`$i = 0; `$i -lt 60; `$i++) { try { `$null = Invoke-WebRequest -Uri '$frontendUrl' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Start-Process '$frontendUrl'; exit } catch { Start-Sleep -Seconds 1 } }"
Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Hidden", "-Command", $pollAndOpen

Write-Host " [SOTA] System is orchestrating. Dashboard will open shortly." -ForegroundColor Gray
if ($SkipFrontend) { return }
npm run dev -- --port $WebPort --host





