Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$serviceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $serviceRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    throw "Sidecar virtual environment not found at $python"
}

Set-Location $serviceRoot
& $python -m uvicorn decision_service.main:app --host localhost --port 8100
