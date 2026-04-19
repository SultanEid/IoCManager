<#
.SYNOPSIS
  Invoke a remote Sigma hunt on a Windows or Linux target over SSH, then pull results locally.

.DESCRIPTION
  Windows mode:
    Copies Sigma rules from IOC_MGR to the remote Windows target, runs Chainsaw against EVTX,
    and downloads the JSON results.

  Linux mode:
    Uses a constrained Sigma-compatible custom rule subset on IOC_MGR and hunts recent
    journal/syslog content on the remote Linux target over SSH, then downloads the JSON results.

  After downloading, the script optionally:
    - Deletes the temporary rules folder on the remote target (Cleanup)
    - Prints JSON to console (raw or pretty) only when detections exist
    - Creates a human-readable TXT table from the JSON output (Interactive Mode Only)

.NOTES
  Linux mode currently supports custom YAML rules that use:
    detection:
      selection:
        keywords:
          - "needle"

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

  [Parameter()]
  [string] $KeyPath,

  [switch] $UseEnvironmentPassword,

  [ValidateSet("auto", "windows", "linux")]
  [string] $RemoteOS = "auto",

  [ValidateRange(1, 525600)]
  [int] $MinutesBack = 60,

  [switch] $ScanEntireLog,

  [string] $Rule,

  [string] $CustomRule,

  [string] $EvtxPath = "C:\Windows\System32\winevt\Logs\Microsoft-Windows-Sysmon%4Operational.evtx",

  [string] $LinuxLogPath = "",

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
if (-not [string]::IsNullOrWhiteSpace($KeyPath) -and !(Test-Path -LiteralPath $KeyPath)) {
    throw "SSH private key not found: $KeyPath"
}
$SshPassword = if ($UseEnvironmentPassword) { $env:IOC_MANAGER_SSH_PASSWORD } else { "" }
if ([string]::IsNullOrWhiteSpace($KeyPath) -and [string]::IsNullOrWhiteSpace($SshPassword)) {
    throw "Provide either KeyPath or a subnet SSH password."
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
$EffectiveOs = if ($RemoteOS -eq 'auto') {
    if ([string]::IsNullOrWhiteSpace($EvtxPath)) { 'linux' } else { 'windows' }
} else {
    $RemoteOS
}

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
    $usePasswordAuth = -not [string]::IsNullOrWhiteSpace($SshPassword) -and [string]::IsNullOrWhiteSpace($KeyPath)
    $args = @(
        '-q'
    )
    if (-not [string]::IsNullOrWhiteSpace($KeyPath)) {
        $args += @('-i', $KeyPath, '-o', 'IdentitiesOnly=yes')
    }
    if ($usePasswordAuth) {
        $args += @('-o', 'BatchMode=no', '-o', 'PreferredAuthentications=password,keyboard-interactive', '-o', 'PubkeyAuthentication=no', '-o', 'PasswordAuthentication=yes')
    }
    else {
        $args += @('-o', 'BatchMode=yes')
    }

    if ($AcceptNewHostKey) {
        $args += @('-o', 'StrictHostKeyChecking=accept-new')
    }

    return $args
}

function Invoke-OpenSshCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Executable,

        [Parameter(Mandatory = $true)]
        [string[]] $Arguments
    )

    if ([string]::IsNullOrWhiteSpace($SshPassword) -or -not [string]::IsNullOrWhiteSpace($KeyPath)) {
        $output = & $Executable @Arguments 2>&1
        return [pscustomobject]@{ Output = $output; ExitCode = $LASTEXITCODE }
    }

    $askpass = Join-Path $env:TEMP ("askpass_{0}.cmd" -f ([guid]::NewGuid().ToString("N")))
    $askpassScript = @'
@echo off
powershell -NoProfile -NonInteractive -Command "[Console]::Out.Write([Environment]::GetEnvironmentVariable('IOC_MANAGER_SSH_PASSWORD'))"
'@
    Set-Content -LiteralPath $askpass -Encoding ascii -Value $askpassScript
    $oldAsk = $env:SSH_ASKPASS
    $oldReq = $env:SSH_ASKPASS_REQUIRE
    $oldDisplay = $env:DISPLAY
    try {
        $env:SSH_ASKPASS = $askpass
        $env:SSH_ASKPASS_REQUIRE = "force"
        $env:DISPLAY = "1"
        $output = & $Executable @Arguments 2>&1
        return [pscustomobject]@{ Output = $output; ExitCode = $LASTEXITCODE }
    }
    finally {
        $env:SSH_ASKPASS = $oldAsk
        $env:SSH_ASKPASS_REQUIRE = $oldReq
        $env:DISPLAY = $oldDisplay
        Remove-Item -LiteralPath $askpass -Force -ErrorAction SilentlyContinue
    }
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

    $result = Invoke-OpenSshCommand -Executable $SSH -Arguments $args
    $output = $result.Output
    $exitCode = $result.ExitCode

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
    $args += Get-SshCommonArgs
    if ($Recursive) { $args += '-r' }
    $args += @($LocalPath, "$User@${Target}:$RemotePath")

    $result = Invoke-OpenSshCommand -Executable $SCP -Arguments $args
    $output = $result.Output
    $exitCode = $result.ExitCode

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
    $args += Get-SshCommonArgs
    $args += @("$User@${Target}:$RemotePath", $LocalPath)

    $result = Invoke-OpenSshCommand -Executable $SCP -Arguments $args
    $output = $result.Output
    $exitCode = $result.ExitCode

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

$CustomRulesOnly = -not [string]::IsNullOrWhiteSpace($CustomRule)

function Get-LinuxSigmaRuleDefinitions {
    param(
        [Parameter(Mandatory = $true)]
        [string] $RuleRoot
    )

    $ruleFiles = if ((Get-Item -LiteralPath $RuleRoot).PSIsContainer) {
        Get-ChildItem -LiteralPath $RuleRoot -Filter *.yml -File -Recurse
    } else {
        @(Get-Item -LiteralPath $RuleRoot)
    }

    $definitions = New-Object System.Collections.Generic.List[object]

    foreach ($ruleFile in $ruleFiles) {
        $lines = Get-Content -LiteralPath $ruleFile.FullName
        $title = $null
        $level = 'medium'
        $status = 'experimental'
        $identifier = $null
        $keywords = New-Object System.Collections.Generic.List[string]
        $product = 'linux'
        $service = 'syslog'
        $category = 'process_creation'
        $inKeywords = $false

        foreach ($line in $lines) {
            if ($line -match '^\s*title:\s*(.+?)\s*$') { $title = $Matches[1].Trim(); $inKeywords = $false; continue }
            if ($line -match '^\s*id:\s*(.+?)\s*$') { $identifier = $Matches[1].Trim(); $inKeywords = $false; continue }
            if ($line -match '^\s*level:\s*(.+?)\s*$') { $level = $Matches[1].Trim(); $inKeywords = $false; continue }
            if ($line -match '^\s*status:\s*(.+?)\s*$') { $status = $Matches[1].Trim(); $inKeywords = $false; continue }
            if ($line -match '^\s*product:\s*(.+?)\s*$') { $product = $Matches[1].Trim(); $inKeywords = $false; continue }
            if ($line -match '^\s*service:\s*(.+?)\s*$') { $service = $Matches[1].Trim(); $inKeywords = $false; continue }
            if ($line -match '^\s*category:\s*(.+?)\s*$') { $category = $Matches[1].Trim(); $inKeywords = $false; continue }
            if ($line -match '^\s*keywords:\s*$') { $inKeywords = $true; continue }

            if ($inKeywords -and $line -match '^\s*-\s*(.+?)\s*$') {
                $value = $Matches[1].Trim().Trim('"').Trim("'")
                if (-not [string]::IsNullOrWhiteSpace($value)) {
                    $keywords.Add($value) | Out-Null
                }
                continue
            }

            if ($line -match '^\s*\S') {
                $inKeywords = $false
            }
        }

        if ([string]::IsNullOrWhiteSpace($title)) {
            throw "Linux Sigma rule '$($ruleFile.Name)' is missing a title."
        }

        if ($keywords.Count -eq 0) {
            throw "Linux Sigma rule '$($ruleFile.Name)' must define detection.selection.keywords."
        }

        $definitions.Add([pscustomobject]@{
            title = $title
            id = if ([string]::IsNullOrWhiteSpace($identifier)) { [Guid]::NewGuid().ToString() } else { $identifier }
            level = $level
            status = $status
            logsource = [pscustomobject]@{
                category = $category
                product = $product
                service = $service
            }
            keywords = @($keywords)
            file = $ruleFile.Name
        }) | Out-Null
    }

    return $definitions.ToArray()
}

function Quote-PosixArg {
    param(
        [AllowNull()]
        [string] $Value
    )

    if ($null -eq $Value -or $Value.Length -eq 0) {
        return "''"
    }

    return "'" + $Value.Replace("'", "'\''") + "'"
}

function Invoke-LinuxSigmaHunt {
    param(
        [Parameter(Mandatory = $true)]
        [object[]] $RuleDefinitions,

        [Parameter(Mandatory = $true)]
        [string] $EffectiveLogPath,

        [Parameter(Mandatory = $true)]
        [string] $LocalResultFile
    )

    $definitionsJson = $RuleDefinitions | ConvertTo-Json -Depth 10 -Compress
    $definitionsBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($definitionsJson))
    $sinceIso = (Get-Date).ToUniversalTime().AddMinutes(-$MinutesBack).ToString('O')
    $logPathBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($EffectiveLogPath))

    $pythonScript = @'
import base64
import datetime
import json
import re
import subprocess
import sys

rules = json.loads(base64.b64decode(sys.argv[2]).decode('utf-8'))
if isinstance(rules, dict):
    rules = [rules]
since_iso = sys.argv[3]
log_path = base64.b64decode(sys.argv[4]).decode('utf-8')

since = datetime.datetime.fromisoformat(since_iso.replace('Z', '+00:00'))

def is_sysmon_line(line):
    lowered = line.lower()
    return '<event>' in lowered or ' sysmon[' in lowered

detections = []
command_line_pattern = re.compile(r"""<Data\s+Name=(['"])CommandLine\1>(.*?)</Data>""", re.IGNORECASE)
logger_pattern = re.compile(r"""(?i)(?:^|\s)(?:/usr/bin/)?(?:bash|sh|dash)\s+-c\s+logger\s+(.+)$|(?:^|\s)(?:/usr/bin/)?logger\s+(.+)$""")
seen_detections = set()
compiled_rules = []
all_keywords = set()

for rule in rules:
    keywords = [keyword.lower() for keyword in rule.get('keywords', []) if keyword]
    compiled_rules.append((rule, keywords))
    for keyword in keywords:
        all_keywords.add(keyword)

def extract_command_line(line):
    match = command_line_pattern.search(line)
    if match:
        return match.group(2)
    return line

def normalize_command_line(command_line):
    normalized = command_line.strip()
    lowered = normalized.lower()
    prefixes = (
        '/usr/bin/bash -c ',
        '/bin/bash -c ',
        'bash -c ',
        '/usr/bin/sh -c ',
        '/bin/sh -c ',
        'sh -c ',
        '/usr/bin/dash -c ',
        '/bin/dash -c ',
        'dash -c '
    )
    for prefix in prefixes:
        if lowered.startswith(prefix):
            normalized = normalized[len(prefix):].strip()
            break
    if normalized.startswith('"') and normalized.endswith('"') and len(normalized) >= 2:
        normalized = normalized[1:-1].strip()
    logger_match = logger_pattern.search(normalized)
    if logger_match:
        message = logger_match.group(1) or logger_match.group(2) or ''
        normalized = f"logger {message.strip()}".strip()
    return normalized

def process_line(line):
    line_lower = line.lower()
    for rule, keywords in compiled_rules:
        if all(keyword in line_lower for keyword in keywords):
            command_line = normalize_command_line(extract_command_line(line))
            detection_key = (rule.get('id'), command_line)
            if detection_key in seen_detections:
                continue
            seen_detections.add(detection_key)
            detections.append({
                'name': rule['title'],
                'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'level': rule.get('level', 'medium'),
                'source': 'sigma',
                'status': rule.get('status', 'experimental'),
                'id': rule.get('id'),
                'logsource': rule.get('logsource', {}),
                'message': line,
                'CommandLine': command_line,
                'document': {
                    'kind': 'journalctl',
                    'path': log_path or 'journalctl',
                    'data': {
                        'Message': line,
                        'CommandLine': command_line,
                        'RawMessage': line
                    }
                }
            })

cmd = ['journalctl', '--since', since.strftime('%Y-%m-%d %H:%M:%S'), '--no-pager', '-o', 'short-iso']
if all_keywords:
    grep_pattern = '(?i)(' + '|'.join(re.escape(keyword) for keyword in sorted(all_keywords)) + ')'
    cmd += ['--grep', grep_pattern]
used_journalctl = False
try:
    with subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, encoding='utf-8', errors='replace') as proc:
        if proc.stdout is not None:
            used_journalctl = True
            for raw_line in proc.stdout:
                line = raw_line.strip()
                if not line or not is_sysmon_line(line):
                    continue
                process_line(line)
        proc.wait()
except OSError:
    used_journalctl = False

if not used_journalctl and log_path:
    try:
        with open(log_path, 'r', encoding='utf-8', errors='replace') as handle:
            for raw_line in handle:
                line = raw_line.rstrip('\n')
                if not line or not is_sysmon_line(line):
                    continue
                process_line(line)
    except OSError:
        pass

sys.stdout.write(json.dumps(detections))
'@

    $pythonScriptBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($pythonScript))
    $quotedDefinitions = Quote-PosixArg $definitionsBase64
    $quotedSince = Quote-PosixArg $sinceIso
    $quotedLogPath = Quote-PosixArg $logPathBase64
    $quotedPythonScript = Quote-PosixArg $pythonScriptBase64
    $quotedPythonRunner = Quote-PosixArg "import base64, sys; exec(compile(base64.b64decode(sys.argv[1]).decode('utf-8'), '<sigma>', 'exec'))"
    $remoteCommand = "python3 -c $quotedPythonRunner $quotedPythonScript $quotedDefinitions $quotedSince $quotedLogPath"

    $sshArgs = @()
    $sshArgs += Get-SshCommonArgs
    $sshArgs += "$User@$Target"
    $sshArgs += $remoteCommand

    $result = Invoke-OpenSshCommand -Executable $SSH -Arguments $sshArgs
    $output = $result.Output
    if ($result.ExitCode -ne 0) {
        $detail = if ($output) { ($output -join [Environment]::NewLine).Trim() } else { "No additional error details." }
        throw "Remote Linux Sigma scan failed.`n$detail"
    }

    $jsonOutput = if ($output) { ($output -join [Environment]::NewLine).Trim() } else { "[]" }
    Set-Content -LiteralPath $LocalResultFile -Value $jsonOutput -Encoding UTF8
}

if ($EffectiveOs -eq 'linux' -and -not $CustomRulesOnly) {
    throw "Linux Sigma mode currently supports custom rules only."
}

if ($EffectiveOs -eq 'windows' -and $Interactive) { Write-Host "[*] Verifying Chainsaw toolkit on target..." }

if ($EffectiveOs -eq 'windows') {
$PreFlightPS = @"
if (!(Test-Path '$RemoteSigmaBase\chainsaw\chainsaw.exe')) { throw 'chainsaw.exe missing' }
if (!(Test-Path '$RemoteSigmaBase\chainsaw\mappings\sigma-event-logs-all.yml')) { throw 'mapping file missing' }
Write-Output 'OK'
"@

$PreFlightCheck = Invoke-RemotePS -ScriptText $PreFlightPS -FailureMessage "Pre-flight failed on target."
if (-not ($PreFlightCheck | Where-Object { $_ -match '^OK$' })) {
    throw "Pre-flight failed: unexpected remote response."
}
}

# =========================
#  Create temp rules folder
# =========================
if ($EffectiveOs -eq 'windows' -and $Interactive) { Write-Host "[*] Creating temp rules folder on target..." }

$ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
$remoteRulesRoot    = "C:\Temp\detechtive_rules_$ts"
$remoteRulesRootScp = "C:/Temp/detechtive_rules_$ts"
$remoteRulesPath    = "$remoteRulesRoot\$RulesLeaf"
$effectiveRemoteRulesPath = $remoteRulesPath

if ($EffectiveOs -eq 'windows') {
    $CreateTempPS = @"
New-Item -ItemType Directory -Force '$remoteRulesRoot' | Out-Null
if (!(Test-Path '$remoteRulesRoot')) { throw 'Failed to create remote temp rules root.' }
"@

    Invoke-RemotePS -ScriptText $CreateTempPS -FailureMessage "Failed to create temp rules folder on target." | Out-Null
}

# =========================
#  Copy rules via SCP
# =========================
if ($EffectiveOs -eq 'windows' -and $Interactive) { Write-Host "[*] Copying rules from '$RulesPath' to target..." }

if ($EffectiveOs -eq 'windows') {
    Invoke-ScpUpload -LocalPath $RulesPath -RemotePath $remoteRulesRootScp -Recursive:$RulesIsDirectory
}

if ($EffectiveOs -eq 'windows') {
    $VerifyRulesPS = @"
`$expected = '$remoteRulesPath'
`$root = '$remoteRulesRoot'
`$allowRootFallback = `$$($RulesIsDirectory.ToString().ToLowerInvariant())

if (Test-Path `$expected) {
    Write-Output ('PATH:' + `$expected)
    exit 0
}

if (`$allowRootFallback -and (Test-Path `$root)) {
    `$entries = @(Get-ChildItem -LiteralPath `$root -Force -ErrorAction SilentlyContinue)
    if (`$entries.Count -gt 0) {
        Write-Output ('PATH:' + `$root)
        exit 0
    }
}

throw 'Uploaded rule path not found on target.'
"@

    $verifyRulesOutput = Invoke-RemotePS -ScriptText $VerifyRulesPS -FailureMessage "Uploaded rules could not be verified on target."
    $resolvedPathLine = $verifyRulesOutput | Where-Object { $_ -like 'PATH:*' } | Select-Object -Last 1
    if ([string]::IsNullOrWhiteSpace($resolvedPathLine)) {
        throw "Uploaded rules could not be verified on target."
    }

    $effectiveRemoteRulesPath = $resolvedPathLine.Substring(5)
}

# =========================
#  Run Chainsaw hunt
# =========================
if ($EffectiveOs -eq 'windows' -and $Interactive) { Write-Host "[*] Running Chainsaw on target..." }

$injectDanger = if ($ScanEntireLog) { '$true' } else { '$false' }

if ($EffectiveOs -eq 'windows') {
$psScan = @"
`$ProgressPreference = 'SilentlyContinue'

`$base      = '$RemoteSigmaBase'
`$chainsaw  = Join-Path `$base 'chainsaw\chainsaw.exe'
`$map       = Join-Path `$base 'chainsaw\mappings\sigma-event-logs-all.yml'
`$out       = Join-Path `$base 'out'
`$rules     = '$effectiveRemoteRulesPath'
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
    if (Test-Path `$outFile) {
        `$outputInfo = Get-Item `$outFile
        if (`$outputInfo.Length -eq 0) {
            Set-Content -LiteralPath `$outFile -Encoding UTF8 -Value '[]'
            `$chainsawExit = 0
        } else {
            throw "Chainsaw exited with code `$chainsawExit"
        }
    } else {
        throw "Chainsaw exited with code `$chainsawExit"
    }
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
}
else {
    if ($Interactive) { Write-Host "[*] Running Linux Sigma hunt on target..." }
    $linuxRules = Get-LinuxSigmaRuleDefinitions -RuleRoot $RulesPath
    $remoteOut = "linux-inline-result"
    $remoteExitLine = "0"
    $effectiveLinuxLogPath = if ([string]::IsNullOrWhiteSpace($LinuxLogPath)) { "/var/log/syslog" } else { $LinuxLogPath }
    $LocalFile = Join-Path $LocalOutDir ("sigma_{0}_{1}.json" -f $Target, (Get-Date).ToString('yyyyMMdd_HHmmss'))
    Invoke-LinuxSigmaHunt -RuleDefinitions $linuxRules -EffectiveLogPath $effectiveLinuxLogPath -LocalResultFile $LocalFile
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

if ($EffectiveOs -eq 'windows') {
    $remoteOutScp = ($remoteOut -replace "\\", "/")
    $LocalFile    = Join-Path $LocalOutDir (Split-Path $remoteOutScp -Leaf)

    Invoke-ScpDownload -RemotePath $remoteOutScp -LocalPath $LocalOutDir
}

if (!(Test-Path -LiteralPath $LocalFile)) {
    throw "Expected local result file was not found after download: $LocalFile"
}

if ($Interactive) { Write-Host "[+] Saved to: $LocalFile" }

# =========================
#  Cleanup target
# =========================
if ($Cleanup) {
    if ($EffectiveOs -eq 'windows' -and $Interactive) { Write-Host "[*] Cleaning temp rules folder on target..." }

    if ($EffectiveOs -eq 'windows') {
        $CleanupPS = @"
if (Test-Path '$remoteRulesRoot') {
    Remove-Item -Recurse -Force '$remoteRulesRoot' -ErrorAction Stop
}
"@

        Invoke-RemotePS -ScriptText $CleanupPS -FailureMessage "Remote cleanup failed." | Out-Null
    }
    else {
        # Linux mode now executes inline and writes results locally, so there is no remote artifact to clean up.
    }
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
        source_log       = if ($EffectiveOs -eq 'windows') { $EvtxPath } else { if ([string]::IsNullOrWhiteSpace($LinuxLogPath)) { "/var/log/syslog" } else { $LinuxLogPath } }
        scan_entire_log  = [bool]$ScanEntireLog
        minutes_back     = $TimeWindow
        rule_source      = $RulesLeaf
        rule_source_type = $RuleSourceType
        result_file      = $LocalFile
        detections       = $Detections
    }

    $CommandLine = if ($EffectiveOs -eq 'windows') {
        "chainsaw hunt $EvtxPath -s $effectiveRemoteRulesPath -m $RemoteSigmaBase\chainsaw\mappings\sigma-event-logs-all.yml"
    } else {
        "linux-sigma hunt journalctl --since $MinutesBack minutes"
    }
    $EnvelopeObj = Build-EnvelopeObject `
        -RawPayload $RawPayload `
        -TargetServer "$User@$Target" `
        -OsType $EffectiveOs `
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
            if (-not $cmd) {
                $cmd = $item.document.data.CommandLine
            }
            if (-not $cmd) {
                $cmd = $item.CommandLine
            }

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
