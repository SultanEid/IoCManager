[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$OutputRoot,

    [Parameter()]
    [int]$BatchSize = 30
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$definitions = @(
    @{
        Prefix = 'pscombo'
        Body = @'
powershell.exe -enc ZQBjAGgAbwAgAHQAZQBzAHQA -nop -w hidden -ep bypass
'@
    },
    @{
        Prefix = 'recon'
        Body = @'
whoami
whoami /groups
whoami /priv
net user
net view
systeminfo
ipconfig /all
'@
    },
    @{
        Prefix = 'tools'
        Body = @'
mshta.exe
regsvr32.exe
rundll32.exe
wireshark.exe
'@
    }
)

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null

$created = New-Object System.Collections.Generic.List[string]

foreach ($definition in $definitions) {
    foreach ($index in 1..$BatchSize) {
        $filePath = Join-Path $OutputRoot ("{0}_{1:000}.txt" -f $definition.Prefix, $index)
        Set-Content -LiteralPath $filePath -Value $definition.Body -Encoding ASCII
        $created.Add($filePath)
    }
}

$created | ConvertTo-Json
