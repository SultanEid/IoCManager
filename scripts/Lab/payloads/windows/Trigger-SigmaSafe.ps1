[CmdletBinding()]
param(
    [Parameter()]
    [int]$Iterations = 12
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

for ($index = 1; $index -le $Iterations; $index++) {
    whoami /groups | Out-Null
    whoami /priv | Out-Null
    ipconfig /all | Out-Null
    nslookup _ldap._tcp.dc._msdcs.example.local 2>$null | Out-Null
    curl.exe --connect-timeout 1 --max-time 1 -H "User-Agent: EvilAgent-$index" http://127.0.0.1:65535 2>$null | Out-Null
    Start-Sleep -Milliseconds 200
}
