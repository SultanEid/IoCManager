param(
    [switch]$SkipSidecar
)

$ErrorActionPreference = "Stop"

$workspaceRoot = "E:\w2\Workspace"
$frontendRoot = Join-Path $workspaceRoot "Project\frontend\workbench"
$backendRoot = Join-Path $workspaceRoot "Project\backend\src\Backend.Api"
$backendProject = Join-Path $workspaceRoot "Project\backend\src\Backend.Api\Backend.Api.csproj"
$backendDll = Join-Path $workspaceRoot "Project\backend\src\Backend.Api\bin\Debug\net8.0\Backend.Api.dll"
$aiServiceRoot = Join-Path $workspaceRoot "Project\ai\service"
$pythonExe = Join-Path $aiServiceRoot ".venv\Scripts\python.exe"
$logDir = Join-Path $workspaceRoot ".logs"
$mainConnectionString = "Server=tcp:detechtive-db.database.windows.net,1433;Initial Catalog=DeTechTiveDB-2026-4-17-3-6;Persist Security Info=False;User ID=Don-Administrator;Password=CBzp*eQ#t5V^s4;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Stop-PortProcess {
    param(
        [int]$Port
    )

    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

function Start-Frontend {
    Stop-PortProcess -Port 3000
    $stdout = Join-Path $logDir "frontend-3000.out.log"
    $stderr = Join-Path $logDir "frontend-3000.err.log"
    Start-Process npm.cmd -ArgumentList "run dev" -WorkingDirectory $frontendRoot -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden
}

function Start-Backend {
    Stop-PortProcess -Port 5127
    $stdout = Join-Path $logDir "backend-5127.out.log"
    $stderr = Join-Path $logDir "backend-5127.err.log"
    & dotnet build $backendProject | Out-Null

    $backendCommand = @"
`$env:DOTNET_ROLL_FORWARD='LatestMajor'
`$env:DOTNET_ROLL_FORWARD_TO_PRERELEASE='1'
`$env:ASPNETCORE_ENVIRONMENT='Production'
`$env:DOTNET_ENVIRONMENT='Production'
`$env:CONNECTIONSTRINGS__MAIN='$mainConnectionString'
`$env:Auth__Jwt__SigningKey='codex-local-temporary-signing-key-32chars-minimum'
`$env:Auth__LocalFallback__Enabled='true'
`$env:Auth__LocalFallback__UserName='don'
`$env:Auth__LocalFallback__Password='don'
`$env:Auth__LocalFallback__Roles='IT,Analyst,Lead,Admin,DEV'
`$env:IOC_MANAGER_PROMOTE_YARA_HIGH_FOR_TESTING='true'
`$env:AppStartup__SkipHostedWorkers='true'
`$env:AppStartup__EnableLegacyScanPipelineWorker='true'
`$env:AppStartup__EnableScanAnalystPocAutonomyWorker='true'
`$env:AppStartup__EnableAegisMitigationAutonomyWorker='true'
& dotnet '$backendDll' --urls http://localhost:5127
"@
    Start-Process powershell.exe -ArgumentList "-NoProfile -Command $backendCommand" -WorkingDirectory $backendRoot -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden
}

function Start-Sidecar {
    Stop-PortProcess -Port 8100
    if (-not (Test-Path $pythonExe)) {
        throw "Python virtual environment was not found at $pythonExe"
    }

    $stdout = Join-Path $logDir "sidecar-8100.out.log"
    $stderr = Join-Path $logDir "sidecar-8100.err.log"
    Start-Process $pythonExe -ArgumentList "-m uvicorn decision_service.main:app --host 127.0.0.1 --port 8100" -WorkingDirectory $aiServiceRoot -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden
}

Start-Frontend
Start-Backend
if (-not $SkipSidecar) {
    Start-Sidecar
}

Start-Sleep -Seconds 8

Write-Host "W2 stack started."
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:5127"
if (-not $SkipSidecar) {
    Write-Host "Sidecar:  http://127.0.0.1:8100"
}
Write-Host "Build label should read: W2 Agents build"
