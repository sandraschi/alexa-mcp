set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]
import 'scripts/just/fleet.just'

# ── Dashboard ─────────────────────────────────────────────────────────────────

# Open the interactive recipe dashboard in the browser
default:
    @just --list

# ── Development ───────────────────────────────────────────────────────────────

# Start the full web gateway and backend bridge
dev:
    pwsh -NoProfile -File '{{justfile_directory()}}\start.ps1'

# Build the frontend production bundle
build:
    Set-Location '{{justfile_directory()}}/web_sota'
    npm run build

# Install all workspace dependencies (uv and npm)
install:
    uv sync
    Set-Location '{{justfile_directory()}}/web_sota'
    npm install

# ── Quality ───────────────────────────────────────────────────────────────────

# Execute Ruff SOTA v14.1 linting
lint:
    uv run ruff check .
    Set-Location '{{justfile_directory()}}\web_sota'
    npx @biomejs/biome ci .

# Execute Ruff SOTA v14.1 fix and formatting
fix:
    uv run ruff check . --fix
    uv run ruff format .
    Set-Location '{{justfile_directory()}}\web_sota'
    npx @biomejs/biome check --write .

# Execute the professional test suite
test:
    uv run pytest tests/ -q

# Gates: lint + test
certify: lint test

# ── Packaging ─────────────────────────────────────────────────────────────────

# Build the PyInstaller backend .exe and copy to Tauri resources
build-sidecar:
    pwsh -NoProfile -File '{{justfile_directory()}}\native\build.ps1'

# Build Tauri NSIS desktop installer
build-native:
    Set-Location '{{justfile_directory()}}\native'
    $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
    pwsh -NoProfile -File .\build.ps1

# Pack MCPB bundle for Claude Desktop
mcpb-pack:
    uv run python scripts/mcpb-pack.ps1

# Run CUA-NSIS smoke test (install -> launch -> verify -> uninstall)
cua-nsis-test:
    uv run python scripts/cua-smoke.py

# ── Legacy ───────────────────────────────────────────────────────────────────

# Execute a direct acoustic verification test
live-test:
    uv run python scripts/live_test.py

# Execute security and dependency audits
audit:
    uv run bandit -r src/
    uv run safety check

# ── Maintenance ───────────────────────────────────────────────────────────────

# Clean all build and cache artifacts
clean:
    Remove-Item -Recurse -Force .venv, .ruff_cache, web_sota/dist, web_sota/node_modules -ErrorAction SilentlyContinue

# Verify local audio device connectivity
verify:
    uv run python verify_setup.py
