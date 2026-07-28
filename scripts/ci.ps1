$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..
uv sync --group dev
uv run ruff check src
uv run ruff format --check src
uv run pytest -q --tb=short tests/
exit $LASTEXITCODE
