<#
.SYNOPSIS
    Runs a remote YARA scan over SSH and saves results locally in TXT and JSON formats.

.DESCRIPTION
    A core scanning component of the DeTechTive framework. This script automates 
    the process of authenticating to a remote Linux or Windows host, uploading 
    rules, executing YARA, and retrieving the results. 
    
    Results are automatically filed into: C:\Tools\yara\results\<Target_IP>\

.PARAMETER Target
    The IP address or hostname of the remote machine.

.PARAMETER User
    The SSH username for the remote machine.

.PARAMETER ScanPath
    The remote path (file or directory) to be scanned.

.PARAMETER RulePath
    The local YARA rule file (.yar) to be uploaded and used.

.PARAMETER RemoteRulePath
    If the rule is already present on the target, provide the path here to skip upload.

.PARAMETER RemoteOS
    Force the OS logic: 'linux', 'windows', or 'auto' (default).

.PARAMETER PrivateKeyPath
    Path to the SSH private key used for authentication. (Alias: -KeyPath)

.PARAMETER Interactive
    Switch. If set, outputs human-readable status messages to the console.

.EXAMPLE
    .\Invoke-YaraScan.ps1 -Target "172.16.5.132" -User "don" -ScanPath "/home/don/IoC" -RulePath "C:\Rules\malware.yar" -Recursive
    Executes scan and saves results to C:\Tools\yara\results\172.16.5.132\
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Target,

    [Parameter(Mandatory = $true)]
    [string]$User,

    [int]$Port = 22,

    [Parameter(Mandatory = $true)]
    [string]$ScanPath,

    [string]$RulePath,

    [string]$RemoteRulePath,

    [ValidateSet("auto","linux","windows")]
    [string]$RemoteOS = "auto",

    [switch]$Linux,
    [switch]$Windows,

    [string]$RemoteWorkDir = "/tmp/detechtive_scan",

    [string]$RemoteYaraPath = "",

    [switch]$Recursive,
    [switch]$ShowStrings,

    [Alias("KeyPath")]
    [string]$PrivateKeyPath,

    [string]$PrivateKeyPassphrase = "",

    [switch]$AcceptNewHostKey,

    [switch]$NoCleanup,

    [switch]$Interactive
)

# =============================================================================
# [1] HELPER FUNCTIONS: Environment & Validation
# =============================================================================

function Assert-Command([string]$name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Required command '$name' not found. Install OpenSSH Client (ssh + scp)."
    }
}

function Is-WindowsPath([string]$p) {
    if (-not $p) { return $false }
    return ($p -match '^[A-Za-z]:[\\/]' )
}

function Quote-PosixArg([string]$s) {
    if ($null -eq $s -or $s.Length -eq 0) { return "''" }
    return "'" + $s.Replace("'", "'\''") + "'"
}

function Quote-PsLiteral([string]$s) {
    if ($null -eq $s) { $s = "" }
    return "'" + $s.Replace("'", "''") + "'"
}

function To-SshWinPath([string]$p) {
    if ($null -eq $p) { return $p }
    return ($p -replace "\\","/")
}

# =============================================================================
# [2] SSH AUTHENTICATION: Agent & Passphrase Handling
# =============================================================================

function Ensure-SshAgentRunning {
    try {
        $svc = Get-Service -Name "ssh-agent" -ErrorAction Stop
        if ($svc.Status -ne "Running") {
            Set-Service -Name "ssh-agent" -StartupType Automatic | Out-Null
            Start-Service -Name "ssh-agent" | Out-Null
        }
    } catch {
        throw "ssh-agent service not available. Error: $($_.Exception.Message)"
    }
}

function Add-KeyToAgentNonInteractive {
    param([string]$KeyPath, [string]$Passphrase)
    if (-not (Test-Path -LiteralPath $KeyPath)) { throw "PrivateKeyPath not found: $KeyPath" }
    
    # Silenced ssh-add output
    if (-not $Passphrase) { & ssh-add $KeyPath 2>&1 | Out-Null; return }

    $askpass = Join-Path $env:TEMP ("askpass_{0}.cmd" -f ([guid]::NewGuid().ToString("N")))
    Set-Content -LiteralPath $askpass -Encoding ascii -Value "@echo $Passphrase"
    
    $oldAsk = $env:SSH_ASKPASS; $oldReq = $env:SSH_ASKPASS_REQUIRE; $oldDis = $env:DISPLAY
    try {
        $env:SSH_ASKPASS = $askpass; $env:SSH_ASKPASS_REQUIRE = "force"; $env:DISPLAY = "1"
        $k = $KeyPath.Replace('"','""')
        
        # Silenced cmd /c output
        $null = cmd /c "ssh-add `"$k`" > NUL 2>&1"
        if ($LASTEXITCODE -ne 0) { throw "ssh-add failed. Check passphrase." }
    }
    finally {
        $env:SSH_ASKPASS = $oldAsk; $env:SSH_ASKPASS_REQUIRE = $oldReq; $env:DISPLAY = $oldDis
        Remove-Item -LiteralPath $askpass -Force -ErrorAction SilentlyContinue
    }
}

# =============================================================================
# [3] REMOTE EXECUTION: SSH & SCP Wrappers
# =============================================================================

function Build-SshBaseArgs {
    param($User, $Target, $Port, $PrivateKeyPath, $AcceptNewHostKey, $UseAgent)
    $args = @("-p", "$Port")
    if (-not $UseAgent -and $PrivateKeyPath) {
        $args += @("-i", $PrivateKeyPath, "-o", "IdentitiesOnly=yes")
    }
    $args += @("-o", "BatchMode=yes", "-o", "PreferredAuthentications=publickey", "-o", "PasswordAuthentication=no")
    if ($AcceptNewHostKey) { $args += @("-o", "StrictHostKeyChecking=accept-new") }
    $args += @("${User}@${Target}")
    return ,$args
}

function Run-Ssh {
    param($BaseArgs, $RemoteCommand)
    $out = & ssh @BaseArgs $RemoteCommand 2>&1
    if ($LASTEXITCODE -ne 0 -and $out) { Write-Error ($out -join "`n") }
    return $LASTEXITCODE
}

function Run-ScpAction {
    param($Local, $Remote, $User, $Target, $Port, $Key, $Accept, $Agent, [switch]$Download)
    $args = @("-q", "-P", "$Port", "-o", "BatchMode=yes")
    if (-not $Agent -and $Key) { $args += @("-i", $Key, "-o", "IdentitiesOnly=yes") }
    if ($Accept) { $args += @("-o", "StrictHostKeyChecking=accept-new") }
    
    if ($Download) { $args += @("${User}@${Target}:${Remote}", $Local) }
    else { $args += @($Local, "${User}@${Target}:${Remote}") }
    
    & scp @args
    return $LASTEXITCODE
}

# =============================================================================
# [4] DATA PARSING: Result Processing & JSON Construction
# =============================================================================

function Parse-YaraOutput {
    param([string[]]$Lines)
    $matchList = New-Object System.Collections.Generic.List[object]
    $current = $null; $other = New-Object System.Collections.Generic.List[string]

    foreach ($line in $Lines) {
        if ([string]::IsNullOrWhiteSpace($line) -or $line -match '^===') { continue }
        if ($line -match '^\s*(0x[0-9A-Fa-f]+):\s*(\$\S+):\s*(.*)$') {
            if ($null -ne $current) { $current.strings += [pscustomobject]@{ offset=$Matches[1]; id=$Matches[2]; value=$Matches[3] } }
            continue
        }
        if ($line -match '^(\S+)\s+(.+)$') {
            $current = [pscustomobject]@{ rule=$Matches[1]; file=$Matches[2].Trim(); strings=@() }
            $matchList.Add($current) | Out-Null
            continue
        }
        $other.Add($line) | Out-Null
    }
    return [pscustomobject]@{ matches = $matchList; other = $other }
}

function Get-RemoteFileHashes {
    param(
        [string]$EffectiveOS,
        $SshBaseArgs,
        [string[]]$FilePaths
    )

    $hashes = @{}
    $uniquePaths = $FilePaths |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -Unique

    if (-not $uniquePaths -or $uniquePaths.Count -eq 0) {
        return $hashes
    }

    if ($EffectiveOS -eq "windows") {
        $output = @()
        foreach ($path in $uniquePaths) {
            $quotedPath = Quote-PsLiteral $path
            $remoteScript = @"
`$ProgressPreference = 'SilentlyContinue'
`$ErrorActionPreference = 'Stop'
`$path = $quotedPath
`$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath `$path).Hash
if (-not [string]::IsNullOrWhiteSpace(`$hash)) {
    [Console]::Out.WriteLine(`$path + '|' + `$hash.ToLowerInvariant())
}
"@
            $encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($remoteScript))
            $hashLine = & ssh @SshBaseArgs "powershell.exe -EncodedCommand $encoded" 2>$null
            if ($hashLine) {
                $output += $hashLine
            }
        }
    }
    else {
        $quotedPaths = $uniquePaths | ForEach-Object { Quote-PosixArg $_ }
        $remoteScript = "for path in " + ($quotedPaths -join " ") + "; do if [ -f ""`$path"" ]; then hash=`$(sha256sum ""`$path"" | awk '{print `$1}'); printf '%s|%s\n' ""`$path"" ""`$hash""; fi; done"
        $output = & ssh @SshBaseArgs $remoteScript 2>$null
    }

    foreach ($line in $output) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $parts = $line -split '\|', 2
        if ($parts.Count -ne 2) { continue }
        $hashes[$parts[0]] = $parts[1]
    }

    return $hashes
}

function Normalize-MatchPath([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path)) { return $Path }

    if ($Path -match '^[A-Za-z]:\\') {
        return ($Path -replace '\\{2,}', '\')
    }

    return $Path
}

function Build-JsonResult {
    param($YaraExitCode, $EffectiveOS, $RemoteYaraPath, $FlagsStr, $ScanPath, $RemoteRule, $RemoteResult, $LocalResult, $Target, $User, $Port, $SshBaseArgs)
    
    $rawLines = Get-Content -LiteralPath $LocalResult -ErrorAction SilentlyContinue
    $parsed = Parse-YaraOutput -Lines $rawLines
    $uniqueFiles = if ($parsed.matches.Count -gt 0) {
        $parsed.matches |
            ForEach-Object { Normalize-MatchPath $_.file } |
            Select-Object -Unique
    }
    else {
        @()
    }
    $fileHashes = Get-RemoteFileHashes -EffectiveOS $EffectiveOS -SshBaseArgs $SshBaseArgs -FilePaths $uniqueFiles

    foreach ($match in $parsed.matches) {
        $hash = $null
        $normalizedPath = Normalize-MatchPath $match.file
        if ($normalizedPath -and $fileHashes.ContainsKey($normalizedPath)) {
            $hash = $fileHashes[$normalizedPath]
        }

        Add-Member -InputObject $match -NotePropertyName file_hash -NotePropertyValue $hash -Force
    }

    $obj = [pscustomobject]@{
        metadata = [pscustomobject]@{
            target_server = "${User}@${Target}" # <-- Updated to target_server
            os_type = $EffectiveOS
            timestamp_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            scanner_type = "YARA"
            command_line = "$RemoteYaraPath $FlagsStr $RemoteRule $ScanPath".Trim()
            exit_code = $YaraExitCode 
        }
        raw_scanner_payload = [pscustomobject]@{
            match_count = $parsed.matches.Count
            affected_files = $uniqueFiles.Count
            matches = $parsed.matches
            unparsed_output = $parsed.other
        }
    }
    return ($obj | ConvertTo-Json -Depth 12 -Compress)
}

# =============================================================================
# [5] MAIN EXECUTION: Initialization & OS Detection
# =============================================================================

Assert-Command "ssh"; Assert-Command "scp"

# Directory Setup: C:\Tools\yara\results\<IP>\
$ResultsBase = "C:\Tools\yara\results\$Target"
if (-not (Test-Path $ResultsBase)) { New-Item -ItemType Directory -Force -Path $ResultsBase | Out-Null }

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$localTxtResult = Join-Path $ResultsBase "scan_$timestamp.txt"
$localJsonResult = Join-Path $ResultsBase "scan_$timestamp.json"

# OS Detection Logic
if ($Linux -and $Windows) { throw "Select only one OS flag." }
$EffectiveOS = if ($Linux) { "linux" } elseif ($Windows) { "windows" } else { 
    if ($RemoteOS -ne "auto") { $RemoteOS } else { if (Is-WindowsPath $ScanPath) { "windows" } else { "linux" } }
}

# Key Management
$UseAgent = $false
if ($PrivateKeyPath -and $PrivateKeyPassphrase) {
    Assert-Command "ssh-add"
    Ensure-SshAgentRunning
    Add-KeyToAgentNonInteractive -KeyPath $PrivateKeyPath -Passphrase $PrivateKeyPassphrase
    $UseAgent = $true
}

$sshBase = Build-SshBaseArgs -User $User -Target $Target -Port $Port -PrivateKeyPath $PrivateKeyPath -AcceptNewHostKey:$AcceptNewHostKey -UseAgent:$UseAgent
$yaraFlags = @(); if ($Recursive) { $yaraFlags += "-r" }; if ($ShowStrings) { $yaraFlags += "-s" }
$flagsStr = ($yaraFlags -join " ")

# =============================================================================
# [6] OS BRANCH: Linux
# =============================================================================

if ($EffectiveOS -eq "linux") {
    $RemoteYaraPath = if ($RemoteYaraPath) { $RemoteYaraPath } else { "yara" }
    $remoteRule = if ($RemoteRulePath) { $RemoteRulePath } else { "$RemoteWorkDir/rule_$timestamp.yar" }
    $remoteResult = "$RemoteWorkDir/result_$timestamp.txt"

    [void](Run-Ssh -BaseArgs $sshBase -RemoteCommand "mkdir -p -- $(Quote-PosixArg $RemoteWorkDir)")

    if (-not $RemoteRulePath) {
        [void](Run-ScpAction -Local (Resolve-Path $RulePath).Path -Remote $remoteRule -User $User -Target $Target -Port $Port -Key $PrivateKeyPath -Accept $AcceptNewHostKey -Agent $UseAgent)
    }

    $ec = Run-Ssh -BaseArgs $sshBase -RemoteCommand "$RemoteYaraPath $flagsStr $(Quote-PosixArg $remoteRule) $(Quote-PosixArg $ScanPath) > $(Quote-PosixArg $remoteResult) 2>&1"
    [void](Run-ScpAction -Local $localTxtResult -Remote $remoteResult -User $User -Target $Target -Port $Port -Key $PrivateKeyPath -Accept $AcceptNewHostKey -Agent $UseAgent -Download)

    if (-not $NoCleanup) {
        $rmCmd = "rm -f -- $(Quote-PosixArg $remoteResult)"; if (-not $RemoteRulePath) { $rmCmd += " $(Quote-PosixArg $remoteRule)" }
        [void](Run-Ssh -BaseArgs $sshBase -RemoteCommand $rmCmd)
    }
}

# =============================================================================
# [7] OS BRANCH: Windows
# =============================================================================

elseif ($EffectiveOS -eq "windows") {
    $RemoteYaraPath = if ($RemoteYaraPath) { $RemoteYaraPath } else { "yara64.exe" }
    if ($RemoteWorkDir -eq "/tmp/detechtive_scan") { $RemoteWorkDir = "C:\Temp\detechtive_scan" }
    $remoteRule = if ($RemoteRulePath) { $RemoteRulePath } else { Join-Path $RemoteWorkDir "rule_$timestamp.yar" }
    $remoteResult = Join-Path $RemoteWorkDir "result_$timestamp.txt"

    $quiet = '$ProgressPreference="SilentlyContinue";'
    $cmdMkdir = ([System.Text.Encoding]::Unicode.GetBytes($quiet + "New-Item -ItemType Directory -Force -Path $(Quote-PsLiteral $RemoteWorkDir)"))
    [void](Run-Ssh -BaseArgs $sshBase -RemoteCommand "powershell.exe -EncodedCommand $([Convert]::ToBase64String($cmdMkdir))")

    if (-not $RemoteRulePath) {
        [void](Run-ScpAction -Local (Resolve-Path $RulePath).Path -Remote (To-SshWinPath $remoteRule) -User $User -Target $Target -Port $Port -Key $PrivateKeyPath -Accept $AcceptNewHostKey -Agent $UseAgent)
    }

    $psScan = "$quiet & $(Quote-PsLiteral $RemoteYaraPath) $flagsStr $(Quote-PsLiteral $remoteRule) $(Quote-PsLiteral $ScanPath) 1> $(Quote-PsLiteral $remoteResult) 2>&1; exit `$LASTEXITCODE"
    $cmdScan = ([System.Text.Encoding]::Unicode.GetBytes($psScan))
    $ec = Run-Ssh -BaseArgs $sshBase -RemoteCommand "powershell.exe -EncodedCommand $([Convert]::ToBase64String($cmdScan))"

    [void](Run-ScpAction -Local $localTxtResult -Remote (To-SshWinPath $remoteResult) -User $User -Target $Target -Port $Port -Key $PrivateKeyPath -Accept $AcceptNewHostKey -Agent $UseAgent -Download)

    if (-not $NoCleanup) {
        $cleanup = "$quiet Remove-Item -Force -Path $(Quote-PsLiteral $remoteResult)"; if (-not $RemoteRulePath) { $cleanup += ",$(Quote-PsLiteral $remoteRule)" }
        $cmdDel = ([System.Text.Encoding]::Unicode.GetBytes($cleanup))
        [void](Run-Ssh -BaseArgs $sshBase -RemoteCommand "powershell.exe -EncodedCommand $([Convert]::ToBase64String($cmdDel))")
    }
}

# =============================================================================
# [8] FINALIZATION: Header & Dual-File Output
# =============================================================================

# Build and Save JSON FIRST to avoid parsing the custom text header as false YARA rules
$json = Build-JsonResult -YaraExitCode $ec -EffectiveOS $EffectiveOS -RemoteYaraPath $RemoteYaraPath -FlagsStr $flagsStr -ScanPath $ScanPath -RemoteRule $remoteRule -RemoteResult $remoteResult -LocalResult $localTxtResult -Target $Target -User $User -Port $Port -SshBaseArgs $sshBase
$json | Set-Content $localJsonResult

# NOW modify the TXT file to include the human-readable header
$header = "=== DeTechTive Remote Scan Result ===`nTarget: $User@$Target`nOS: $EffectiveOS`nTimestamp: $(Get-Date)`n`n"
$content = Get-Content $localTxtResult -Raw -ErrorAction SilentlyContinue
($header + $content) | Set-Content $localTxtResult

# Output Logic
if ($Interactive) {
    Write-Host "`n[+] Scan Complete for $Target" -ForegroundColor Green
    Write-Host "    Results saved to: $ResultsBase"
    Write-Host "    JSON Payload:" -ForegroundColor Cyan
}

# ALWAYS output the pure JSON to stdout so C# can capture it natively
Write-Output $json

