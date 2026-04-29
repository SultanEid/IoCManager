$ErrorActionPreference = "Stop"

function Stop-PortProcess {
    param(
        [int]$Port
    )

    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
}

Stop-PortProcess -Port 3000
Stop-PortProcess -Port 5127
Stop-PortProcess -Port 8100

Write-Host "Stopped W2 stack ports: 3000, 5127, 8100"
