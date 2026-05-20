set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

# ── Dashboard ─────────────────────────────────────────────────────────────────

# Open the interactive recipe dashboard in the browser
default:
    @pwsh.exe -NoProfile -ExecutionPolicy Bypass -File ../mcp-central-docs/scripts/just-dashboard.ps1 -Path .

# ── Development ───────────────────────────────────────────────────────────────

# Start the full web gateway and backend bridge
dev:
    Set-Location '{{justfile_directory()}}/web_sota'
    powershell -File start.ps1

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
    uv run ruff check . --fix --unsafe-fixes
    uv run ruff format .
    Set-Location '{{justfile_directory()}}\web_sota'
    npx @biomejs/biome check --write .

# Execute the professional test suite
test:
    uv run pytest tests/

# Generate test coverage report
coverage:
    uv run pytest --cov=src tests/

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
