[CmdletBinding()]
param(
    [Parameter()]
    [string]$HttpBaseUrl = 'http://172.165.50.134:8080/detechtive-check',

    [Parameter()]
    [string]$DnsServer = '8.8.8.8',

    [Parameter()]
    [string]$SensorIp = '172.165.50.134',

    [Parameter()]
    [int]$Iterations = 4
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

for ($index = 1; $index -le $Iterations; $index++) {
    ping -n 2 $SensorIp | Out-Null
    nslookup detechtive.local $DnsServer 2>$null | Out-Null
    curl.exe --connect-timeout 2 --max-time 2 -A "curl/8.0" -H "Host: detechtive.lab" $HttpBaseUrl 2>$null | Out-Null
    curl.exe --connect-timeout 2 --max-time 2 -A "Wget/1.21" -H "Host: detechtive.lab" $HttpBaseUrl 2>$null | Out-Null
    curl.exe --connect-timeout 2 --max-time 2 -H "Host: detechtive.lab" -H "X-DeTechTive-Test: 1" $HttpBaseUrl 2>$null | Out-Null
    Start-Sleep -Milliseconds 120
}
