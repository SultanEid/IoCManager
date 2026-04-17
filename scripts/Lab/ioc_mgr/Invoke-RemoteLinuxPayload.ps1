[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TargetHost,

    [Parameter(Mandatory = $true)]
    [string]$TargetUser,

    [Parameter(Mandatory = $true)]
    [string]$TargetKeyPath,

    [Parameter(Mandatory = $true)]
    [string]$LocalPayloadPath,

    [Parameter(Mandatory = $true)]
    [string]$RemotePayloadPath,

    [Parameter()]
    [string[]]$Arguments = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scpTarget = "{0}@{1}:{2}" -f $TargetUser, $TargetHost, $RemotePayloadPath
& scp.exe -i $TargetKeyPath $LocalPayloadPath $scpTarget
if ($LASTEXITCODE -ne 0) {
    throw "Copy to $TargetHost failed."
}

$escapedArgs = $Arguments | ForEach-Object { "'{0}'" -f $_.Replace("'", "'\''") }
$remoteCommand = @(
    "chmod +x '$RemotePayloadPath'",
    "bash '$RemotePayloadPath' $($escapedArgs -join ' ')"
) -join ' && '

& ssh.exe -i $TargetKeyPath ("{0}@{1}" -f $TargetUser, $TargetHost) $remoteCommand
if ($LASTEXITCODE -ne 0) {
    throw "Execution on $TargetHost failed."
}
