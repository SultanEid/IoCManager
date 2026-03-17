<#
.SYNOPSIS
  Invoke a remote Sigma (Chainsaw) hunt on a Windows target over SSH, then pull results locally.

.DESCRIPTION
  This script copies Sigma rules (official or custom) from the local machine (IOC_MGR) to a temporary folder
  on the remote Windows target using SCP, runs Chainsaw "hunt" against an EVTX log for a given
  time window (MinutesBack), outputs results as JSON on the remote host, and then downloads
  that JSON to the local results directory.

  After downloading, the script optionally:
    - Deletes the temporary rules folder on the remote target (Cleanup)
    - Prints JSON to console (raw or pretty) only when detections exist
    - Creates a human-readable TXT table from the JSON output (Interactive Mode Only)

.NOTES
  Silent mode returns enveloped JSON only when detections exist.
  If no detections are found:
    - Interactive mode prints a success/no-detections message
    - Silent mode outputs nothing
#>

param(
  [Parameter(Mandatory = $true)]
  [string] $Target,

  [Parameter(Mandatory = $true)]
  [string] $User,

  [Parameter(Mandatory = $true)]
  [string] $KeyPath,

  [ValidateRange(1, 525600)]
  [int] $MinutesBack = 60,

  [switch] $ScanEntireLog,

  [string] $Rule,

  [string] $CustomRule,

  [string] $EvtxPath = "C:\Windows\System32\winevt\Logs\Microsoft-Windows-Sysmon%4Operational.evtx",

  [switch] $Cleanup = $true,

  [switch] $PrettyJson,

  [switch] $Interactive,

  [switch] $AcceptNewHostKey
)

# =========================
#  Validation
# =========================
if ([string]::IsNullOrWhiteSpace($Target))  { throw "Target cannot be empty." }
if ([string]::IsNullOrWhiteSpace($User))    { throw "User cannot be empty." }
if ([string]::IsNullOrWhiteSpace($KeyPath)) { throw "KeyPath cannot be empty." }

if (!(Test-Path -LiteralPath $KeyPath)) {
    throw "SSH private key not found: $KeyPath"
}

if (-not [string]::IsNullOrWhiteSpace($Rule) -and -not [string]::IsNullOrWhiteSpace($CustomRule)) {
    throw "Use either -Rule or -CustomRule, not both."
}

# =========================
#  SSH / SCP executable paths
# =========================
$SSH = "$env:WINDIR\System32\OpenSSH\ssh.exe"
$SCP = "$env:WINDIR\System32\OpenSSH\scp.exe"

if (!(Test-Path -LiteralPath $SSH)) { throw "ssh.exe not found at: $SSH" }
if (!(Test-Path -LiteralPath $SCP)) { throw "scp.exe not found at: $SCP" }

# =========================
#  Resolve local rules directory / file
# =========================
$BaseSigmaRules  = "C:\Tools\Sigma\rules"
$BaseCustomRules = "C:\Tools\Sigma\custom_rules"

if (-not [string]::IsNullOrWhiteSpace($CustomRule)) {
    $RulesPath = Join-Path $BaseCustomRules $CustomRule
    $RuleSourceType = "custom"
} elseif (-not [string]::IsNullOrWhiteSpace($Rule)) {
    $RulesPath = Join-Path $BaseSigmaRules $Rule
    $RuleSourceType = "official"
} else {
    $RulesPath = $BaseSigmaRules
    $RuleSourceType = "official_all"
}

if (!(Test-Path -LiteralPath $RulesPath)) {
    throw "Rule path not found locally: $RulesPath"
}

$RulesItem = Get-Item -LiteralPath $RulesPath
$RulesLeaf = $RulesItem.Name
$RulesIsDirectory = $RulesItem.PSIsContainer

# =========================
#  Remote + local working directories
# =========================
$RemoteSigmaBase = "C:\Tools\Sigma"
$LocalOutDir     = "C:\Tools\Sigma\results\$Target"
New-Item -ItemType Directory -Force -Path $LocalOutDir | Out-Null

# =========================
#  Helper functions
# =========================
function Get-SshCommonArgs {
    $args = @(
        '-q',
        '-i', $KeyPath,
        '-o', 'BatchMode=yes'
    )

    if ($AcceptNewHostKey) {
        $args += @('-o', 'StrictHostKeyChecking=accept-new')
    }

    return $args
}

function Invoke-RemotePS {
    param(
        [Parameter(Mandatory = $true)]
        [string] $ScriptText,

        [Parameter(Mandatory = $true)]
        [string] $FailureMessage
    )

    $wrapped = @"
`$ErrorActionPreference = 'Stop'
try {
$ScriptText
exit 0
}
catch {
    Write-Error (`$_ | Out-String)
    exit 1
}
"@

    $enc = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($wrapped))
    $args = @()
    $args += Get-SshCommonArgs
    $args += "$User@$Target"
    $args += "powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand $enc"

    $output = & $SSH @args 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        $detail = if ($output) { ($output -join [Environment]::NewLine).Trim() } else { "No additional error details." }
        throw "$FailureMessage`n$detail"
    }

    return $output
}

function Invoke-ScpUpload {
    param(
        [Parameter(Mandatory = $true)]
        [string] $LocalPath,

        [Parameter(Mandatory = $true)]
        [string] $RemotePath,

        [switch] $Recursive
    )

    $args = @('-q')
    $args += Get-SshCommonArgs | Where-Object { $_ -ne 'BatchMode=yes' -or $true }
    if ($Recursive) { $args += '-r' }
    $args += @($LocalPath, "$User@${Target}:$RemotePath")

    $output = & $SCP @args 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        $detail = if ($output) { ($output -join [Environment]::NewLine).Trim() } else { "No additional error details." }
        throw "SCP upload failed.`n$detail"
    }
}

function Invoke-ScpDownload {
    param(
        [Parameter(Mandatory = $true)]
        [string] $RemotePath,

        [Parameter(Mandatory = $true)]
        [string] $LocalPath
    )

    $args = @('-q')
    $args += Get-SshCommonArgs | Where-Object { $_ -ne 'BatchMode=yes' -or $true }
    $args += @("$User@${Target}:$RemotePath", $LocalPath)

    $output = & $SCP @args 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        $detail = if ($output) { ($output -join [Environment]::NewLine).Trim() } else { "No additional error details." }
        throw "SCP download failed.`n$detail"
    }
}

function Build-EnvelopeObject {
    param(
        [Parameter(Mandatory = $true)]
        [object] $RawPayload,

        [Parameter(Mandatory = $true)]
        [string] $TargetServer,

        [Parameter(Mandatory = $true)]
        [string] $OsType,

        [Parameter(Mandatory = $true)]
        [string] $CmdLine,

        [Parameter(Mandatory = $true)]
        [int] $ExitCode
    )

    return [pscustomobject]@{
        metadata = [pscustomobject]@{
            target_server = $TargetServer
            os_type       = $OsType
            timestamp_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            scanner_type  = "SIGMA"
            command_line  = $CmdLine.Trim()
            exit_code     = $ExitCode
        }
        raw_scanner_payload = $RawPayload
    }
}

# =========================
#  Interactive confirmation
# =========================
if ($ScanEntireLog -and $Interactive) {
    Write-Host "`n[!] WARNING: ScanEntireLog flag is active!" -ForegroundColor Red
    Write-Host "[!] The script will bypass time clamping and scan the complete historical log." -ForegroundColor Red
    Write-Host "[!] This may cause temporary high CPU/Memory usage on the target." -ForegroundColor Yellow

    $confirm = Read-Host "Are you sure you want to proceed? (y/N)"
    if ($confirm -notmatch "^[yY](es)?$") {
        Write-Host "`n[-] Scan aborted by user." -ForegroundColor Yellow
        return
    }

    Write-Host "[+] Proceeding with full log scan..." -ForegroundColor Green
}

# =========================
#  Pre-flight
# =========================
if ($Interactive) { Write-Host "[*] Verifying Chainsaw toolkit on target..." }

$PreFlightPS = @"
if (!(Test-Path '$RemoteSigmaBase\chainsaw\chainsaw.exe')) { throw 'chainsaw.exe missing' }
if (!(Test-Path '$RemoteSigmaBase\chainsaw\mappings\sigma-event-logs-all.yml')) { throw 'mapping file missing' }
Write-Output 'OK'
"@

$PreFlightCheck = Invoke-RemotePS -ScriptText $PreFlightPS -FailureMessage "Pre-flight failed on target."
if (-not ($PreFlightCheck | Where-Object { $_ -match '^OK$' })) {
    throw "Pre-flight failed: unexpected remote response."
}

# =========================
#  Create temp rules folder
# =========================
if ($Interactive) { Write-Host "[*] Creating temp rules folder on target..." }

$ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
$remoteRulesRoot    = "C:\Temp\detechtive_rules_$ts"
$remoteRulesRootScp = "C:/Temp/detechtive_rules_$ts"
$remoteRulesPath    = "$remoteRulesRoot\$RulesLeaf"

$CreateTempPS = @"
New-Item -ItemType Directory -Force '$remoteRulesRoot' | Out-Null
if (!(Test-Path '$remoteRulesRoot')) { throw 'Failed to create remote temp rules root.' }
"@

Invoke-RemotePS -ScriptText $CreateTempPS -FailureMessage "Failed to create temp rules folder on target." | Out-Null

# =========================
#  Copy rules via SCP
# =========================
if ($Interactive) { Write-Host "[*] Copying rules from '$RulesPath' to target..." }

Invoke-ScpUpload -LocalPath $RulesPath -RemotePath $remoteRulesRootScp -Recursive:$RulesIsDirectory

$VerifyRulesPS = @"
if (!(Test-Path '$remoteRulesPath')) { throw 'Uploaded rule path not found on target.' }
Write-Output 'OK'
"@

Invoke-RemotePS -ScriptText $VerifyRulesPS -FailureMessage "Uploaded rules could not be verified on target." | Out-Null

# =========================
#  Run Chainsaw hunt
# =========================
if ($Interactive) { Write-Host "[*] Running Chainsaw on target..." }

$injectDanger = if ($ScanEntireLog) { '$true' } else { '$false' }

$psScan = @"
`$ProgressPreference = 'SilentlyContinue'

`$base      = '$RemoteSigmaBase'
`$chainsaw  = Join-Path `$base 'chainsaw\chainsaw.exe'
`$map       = Join-Path `$base 'chainsaw\mappings\sigma-event-logs-all.yml'
`$out       = Join-Path `$base 'out'
`$rules     = '$remoteRulesPath'
`$targetLog = '$EvtxPath'

if (!(Test-Path `$chainsaw)) { throw "chainsaw.exe missing at `$chainsaw" }
if (!(Test-Path `$map))      { throw "mapping missing at `$map" }
if (!(Test-Path `$rules))    { throw "rules path missing at `$rules" }
if (!(Test-Path `$targetLog)) { throw "Target log path not found at `$targetLog" }

New-Item -ItemType Directory -Force `$out | Out-Null

`$to      = (Get-Date).ToUniversalTime()
`$from    = `$to.AddMinutes(-$MinutesBack)
`$fromStr = `$from.ToString('yyyy-MM-ddTHH:mm:ss')
`$toStr   = `$to.ToString('yyyy-MM-ddTHH:mm:ss')

`$stamp   = (Get-Date).ToString('yyyyMMdd_HHmmss')
`$outFile = Join-Path `$out ('sigma_' + `$env:COMPUTERNAME + '_' + `$stamp + '.json')

`$ChainsawParams = @(
  'hunt', `$targetLog,
  '-s', `$rules,
  '-m', `$map,
  '--json',
  '-o', `$outFile,
  '--skip-errors',
  '-q'
)

if (-not $injectDanger) {
    `$ChainsawParams += '--from'
    `$ChainsawParams += `$fromStr
    `$ChainsawParams += '--to'
    `$ChainsawParams += `$toStr
}

& `$chainsaw @ChainsawParams | Out-Null
`$chainsawExit = `$LASTEXITCODE

if (`$chainsawExit -ne 0) {
    throw "Chainsaw exited with code `$chainsawExit"
}

if (!(Test-Path `$outFile)) {
    throw "Chainsaw did not produce an output file."
}

Write-Output "RESULT_PATH:`$outFile"
Write-Output "RESULT_EXITCODE:`$chainsawExit"
"@

$remoteOutRaw = Invoke-RemotePS -ScriptText $psScan -FailureMessage "Remote Sigma scan failed."

$remoteOut = ($remoteOutRaw | Where-Object { $_ -match '^RESULT_PATH:' } | Select-Object -Last 1) -replace '^RESULT_PATH:', ''
$remoteExitLine = ($remoteOutRaw | Where-Object { $_ -match '^RESULT_EXITCODE:' } | Select-Object -Last 1) -replace '^RESULT_EXITCODE:', ''

if ([string]::IsNullOrWhiteSpace($remoteOut)) {
    throw "Remote scan failed to return an output file path."
}

[int]$ChainsawExitCode = 0
if (-not [int]::TryParse($remoteExitLine, [ref]$ChainsawExitCode)) {
    $ChainsawExitCode = 0
}

if ($Interactive) { Write-Host "[+] Remote output file: $remoteOut" }

# =========================
#  Pull JSON output via SCP
# =========================
if ($Interactive) { Write-Host "[*] Pulling result back (scp)..." }

$remoteOutScp = ($remoteOut -replace "\\", "/")
$LocalFile    = Join-Path $LocalOutDir (Split-Path $remoteOutScp -Leaf)

Invoke-ScpDownload -RemotePath $remoteOutScp -LocalPath $LocalOutDir

if (!(Test-Path -LiteralPath $LocalFile)) {
    throw "Expected local result file was not found after download: $LocalFile"
}

if ($Interactive) { Write-Host "[+] Saved to: $LocalFile" }

# =========================
#  Cleanup target
# =========================
if ($Cleanup) {
    if ($Interactive) { Write-Host "[*] Cleaning temp rules folder on target..." }

    $CleanupPS = @"
if (Test-Path '$remoteRulesRoot') {
    Remove-Item -Recurse -Force '$remoteRulesRoot' -ErrorAction Stop
}
"@

    Invoke-RemotePS -ScriptText $CleanupPS -FailureMessage "Remote cleanup failed." | Out-Null
}

# =========================
#  Parse result JSON
# =========================
$RawJson = Get-Content -LiteralPath $LocalFile -Raw
if ([string]::IsNullOrWhiteSpace($RawJson)) {
    throw "Downloaded Sigma JSON file is empty: $LocalFile"
}

try {
    $ParsedJson = $RawJson | ConvertFrom-Json -ErrorAction Stop
} catch {
    throw "Downloaded Sigma JSON is invalid and could not be parsed: $LocalFile"
}

$Detections = @($ParsedJson)
if ($Detections.Count -eq 1 -and $null -eq $Detections[0]) {
    $Detections = @()
}

$DetectionCount = $Detections.Count

if ($DetectionCount -gt 0) {
    $TimeWindow = if ($ScanEntireLog) { $null } else { $MinutesBack }

    $RawPayload = [pscustomobject]@{
        detection_count  = $DetectionCount
        source_log       = $EvtxPath
        scan_entire_log  = [bool]$ScanEntireLog
        minutes_back     = $TimeWindow
        rule_source      = $RulesLeaf
        rule_source_type = $RuleSourceType
        result_file      = $LocalFile
        detections       = $Detections
    }

    $CommandLine = "chainsaw hunt $EvtxPath -s $remoteRulesPath -m $RemoteSigmaBase\chainsaw\mappings\sigma-event-logs-all.yml"
    $EnvelopeObj = Build-EnvelopeObject `
        -RawPayload $RawPayload `
        -TargetServer "$User@$Target" `
        -OsType "windows" `
        -CmdLine $CommandLine `
        -ExitCode $ChainsawExitCode

    $EnvelopeJson = $EnvelopeObj | ConvertTo-Json -Depth 20 -Compress
}

# =========================
#  Interactive output
# =========================
if ($Interactive) {
    if ($DetectionCount -gt 0) {
        Write-Host "`n===== SCAN RESULTS (JSON ENVELOPE) =====" -ForegroundColor Cyan

        if ($PrettyJson) {
            $EnvelopeObj | ConvertTo-Json -Depth 20 | Write-Host
        } else {
            Write-Host $EnvelopeJson
        }

        $Results = foreach ($item in $Detections) {
            $image = $item.document.data.Event.EventData.Image
            $cmd   = $item.document.data.Event.EventData.CommandLine

            [pscustomobject]@{
                Timestamp   = $item.timestamp
                Level       = $item.level
                RuleName    = $item.name
                Process     = if ($image) { Split-Path $image -Leaf } else { "N/A" }
                CommandLine = if ($cmd) { $cmd } else { "N/A" }
            }
        }

        $TxtPath = $LocalFile -replace '\.json$', '.txt'
        $Results | Format-Table -AutoSize | Out-File -FilePath $TxtPath -Encoding UTF8
        Write-Host "`n[+] Parsed results exported to TXT: $TxtPath" -ForegroundColor Green
    } else {
        Write-Host "`n[+] Scan completed successfully. No Sigma detections found in the requested scope." -ForegroundColor Yellow
    }
} else {
    if ($DetectionCount -gt 0) {
        Write-Output $EnvelopeJson
    }
}
