<#
.SYNOPSIS
    DeTechTive Network Module - State-Aware Suricata Interrogator (100% SSH/SCP Edition)
#>
[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [ValidateSet("Quarantine", "Hunt", "Pcap")]
    [string]$Mode,

    [string]$IP,
    [string]$QuarantineIPs,
    [string]$FilePath,
    [datetime]$Since,
    [int]$MinutesBack = 60,
    [switch]$Interactive,
    [string]$SensorIP = "172.165.50.134",
    [string]$SSHUser = "don",
    [string]$SensorSudoPassword = "don",
    [string]$RemoteRulePath = "/etc/suricata/rules/local.rules",
    [string]$RemoteLogPath = "/var/log/suricata/eve.json",
    [string]$LocalSuricataExe = "C:\Tools\Suricata\suricata.exe",
    [string]$LocalSuricataConfig = "C:\Tools\Suricata\suricata.yaml",
    [string]$MasterRulePath = "C:\Tools\Suricata\rules\local.rules",
    [string]$ResultsBaseDir = "C:\Tools\Suricata\results",
    [string]$ScratchDir = "C:\Tools\forensic_logs_temp",
    [string]$SensorReloadCommand = "systemctl restart suricata",
    [switch]$SkipRuleSync,
    [string]$QuarantineCapturePath
)

$script:RunTimestamp = Get-Date -Format "yyyyMMdd_HHmmss_fff"
$script:RunNonce = [guid]::NewGuid().ToString('N')
$script:BashSingleQuoteEscape = [string][char]39 + '"' + [string][char]39 + '"' + [string][char]39

function Build-Envelope {
    param($LogObj, $TargetServer, $OsType, $CmdLine)

    [pscustomobject]@{
        metadata = [pscustomobject]@{
            target_server = $TargetServer
            os_type = $OsType
            timestamp_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            scanner_type = "SURICATA"
            command_line = $CmdLine.Trim()
            exit_code = 0
        }
        raw_scanner_payload = $LogObj
    } | ConvertTo-Json -Depth 12 -Compress
}

function Save-TargetAlert {
    param($TargetIp, $EnvelopedJson)

    if ([string]::IsNullOrWhiteSpace($TargetIp)) {
        $TargetIp = "Unknown_IP"
    }

    $targetDir = Join-Path $ResultsBaseDir $TargetIp
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Force $targetDir | Out-Null
    }

    $targetFile = Join-Path $targetDir "scan_${script:RunTimestamp}.json"
    $EnvelopedJson | Out-File -FilePath $targetFile -Append -Encoding UTF8
}

function Save-QuarantineCapture {
    param($EnvelopedJson)

    if ([string]::IsNullOrWhiteSpace($QuarantineCapturePath)) {
        return
    }

    $captureDirectory = Split-Path -Parent $QuarantineCapturePath
    if (-not [string]::IsNullOrWhiteSpace($captureDirectory) -and -not (Test-Path $captureDirectory)) {
        New-Item -ItemType Directory -Force -Path $captureDirectory | Out-Null
    }

    $EnvelopedJson | Out-File -FilePath $QuarantineCapturePath -Append -Encoding UTF8
}

function Out-InteractiveTable {
    param($Title, $Data)

    if ($Interactive -and $Data.Count -gt 0) {
        Write-Host "`n=======================================================" -ForegroundColor Cyan
        Write-Host "   [ $Title ]" -ForegroundColor Cyan
        Write-Host "=======================================================`n" -ForegroundColor Cyan
        $Data | Format-Table -AutoSize
    }
}

function Quote-BashArg {
    param([string]$Value)

    if ($null -eq $Value -or $Value.Length -eq 0) {
        return "''"
    }

    return "'" + $Value.Replace("'", $script:BashSingleQuoteEscape) + "'"
}

function Get-RemoteHash {
    param([string[]]$Output)

    foreach ($line in $Output) {
        if ($line -match '([0-9A-Fa-f]{32})') {
            return $Matches[1].ToUpper()
        }
    }

    return $null
}

function Invoke-SensorCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,

        [switch]$AsRoot,
        [switch]$IgnoreExitCode
    )

    $remoteCommand = if ($AsRoot) {
        $quotedPassword = Quote-BashArg $SensorSudoPassword
        $quotedCommand = Quote-BashArg $Command
        "printf '%s\n' $quotedPassword | sudo -S -p '' bash -lc $quotedCommand"
    } else {
        $Command
    }

    $output = & ssh -o BatchMode=yes "$SSHUser@$SensorIP" $remoteCommand 2>&1
    $exitCode = $LASTEXITCODE

    if (-not $IgnoreExitCode -and $exitCode -ne 0) {
        $detail = if ($output) { ($output -join [Environment]::NewLine).Trim() } else { "No additional error details." }
        throw "Sensor command failed.`n$detail"
    }

    return @($output)
}

function Invoke-SensorUpload {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LocalPath,

        [Parameter(Mandatory = $true)]
        [string]$RemotePath
    )

    $output = & scp -q -o BatchMode=yes $LocalPath "$SSHUser@${SensorIP}:$RemotePath" 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        $detail = if ($output) { ($output -join [Environment]::NewLine).Trim() } else { "No additional error details." }
        throw "SCP upload failed.`n$detail"
    }
}

function Quote-ProcessArgument {
    param([string]$Value)

    if ($null -eq $Value) {
        return '""'
    }

    if ($Value -notmatch '[\s"]') {
        return $Value
    }

    return '"' + $Value.Replace('"', '\"') + '"'
}

function Invoke-LocalProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Executable,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [Parameter(Mandatory = $true)]
        [string]$StdOutPath,

        [Parameter(Mandatory = $true)]
        [string]$StdErrPath
    )

    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $Executable
    $psi.Arguments = (($Arguments | ForEach-Object { Quote-ProcessArgument $_ }) -join ' ')
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $psi

    if (-not $process.Start()) {
        throw "Failed to start local process: $Executable"
    }

    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    [System.IO.File]::WriteAllText($StdOutPath, $stdout)
    [System.IO.File]::WriteAllText($StdErrPath, $stderr)

    return $process.ExitCode
}

function Get-HuntWindowStartUtc {
    if ($PSBoundParameters.ContainsKey('Since')) {
        return $Since.ToUniversalTime()
    }

    if ($MinutesBack -gt 0) {
        return (Get-Date).ToUniversalTime().AddMinutes(-1 * $MinutesBack)
    }

    return $null
}

function Build-SuricataHuntCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TargetIp,

        [Nullable[datetime]]$WindowStartUtc
    )

    if ($null -eq $WindowStartUtc) {
        return "grep -a $(Quote-BashArg $TargetIp) $(Quote-BashArg $RemoteLogPath)"
    }

    $tailLines = [Math]::Max($MinutesBack * 200, 5000)
    return "tail -n $tailLines $(Quote-BashArg $RemoteLogPath) | grep -a $(Quote-BashArg $TargetIp)"
}

function Convert-SuricataTimestampToUtc {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $null
    }

    $normalized = $Value.Replace("Z", "+00:00")
    if ($normalized.Length -gt 5 -and ($normalized[-5] -eq '+' -or $normalized[-5] -eq '-') -and $normalized[-3] -ne ':') {
        $normalized = $normalized.Substring(0, $normalized.Length - 2) + ":" + $normalized.Substring($normalized.Length - 2)
    }

    try {
        return [datetimeoffset]::Parse($normalized, [System.Globalization.CultureInfo]::InvariantCulture).UtcDateTime
    } catch {
        return $null
    }
}

function Test-SuricataAlertWithinWindow {
    param(
        [Parameter(Mandatory = $true)]
        $LogObject,

        [Nullable[datetime]]$WindowStartUtc
    )

    if ($null -eq $WindowStartUtc) {
        return $true
    }

    $eventTimeUtc = Convert-SuricataTimestampToUtc -Value $LogObject.timestamp
    return ($null -ne $eventTimeUtc -and $eventTimeUtc -ge $WindowStartUtc)
}

function Convert-SuricataFastLogLineToObject {
    param([string]$Line)

    if ([string]::IsNullOrWhiteSpace($Line)) {
        return $null
    }

    $pattern = '^(?<timestamp>\d{2}/\d{2}/\d{4}-\d{2}:\d{2}:\d{2}\.\d+)\s+\[\*\*\]\s+\[(?<gid>\d+):(?<sid>\d+):(?<rev>\d+)\]\s+(?<signature>.+?)\s+\[\*\*\]\s+\[Classification:\s+(?<classification>.*?)\]\s+\[Priority:\s+(?<priority>\d+)\]\s+\{(?<proto>[^}]+)\}\s+(?<srcEndpoint>\S+)\s+->\s+(?<destEndpoint>\S+)$'
    $lineMatch = [regex]::Match($Line, $pattern)
    if (-not $lineMatch.Success) {
        return $null
    }

    $srcIp = $lineMatch.Groups['srcEndpoint'].Value
    $srcPort = $null
    $srcEndpointMatch = [regex]::Match($srcIp, '^(?<ip>\d+\.\d+\.\d+\.\d+):(?<port>\d+)$')
    if ($srcEndpointMatch.Success) {
        $srcIp = $srcEndpointMatch.Groups['ip'].Value
        $srcPort = [int]$srcEndpointMatch.Groups['port'].Value
    }

    $destIp = $lineMatch.Groups['destEndpoint'].Value
    $destPort = $null
    $destEndpointMatch = [regex]::Match($destIp, '^(?<ip>\d+\.\d+\.\d+\.\d+):(?<port>\d+)$')
    if ($destEndpointMatch.Success) {
        $destIp = $destEndpointMatch.Groups['ip'].Value
        $destPort = [int]$destEndpointMatch.Groups['port'].Value
    }

    [pscustomobject]@{
        timestamp = $lineMatch.Groups['timestamp'].Value
        event_type = 'alert'
        src_ip = $srcIp
        src_port = $srcPort
        dest_ip = $destIp
        dest_port = $destPort
        proto = $lineMatch.Groups['proto'].Value
        alert = [pscustomobject]@{
            signature = $lineMatch.Groups['signature'].Value.Trim()
            severity = $lineMatch.Groups['priority'].Value
            gid = $lineMatch.Groups['gid'].Value
            signature_id = $lineMatch.Groups['sid'].Value
            rev = $lineMatch.Groups['rev'].Value
            category = $lineMatch.Groups['classification'].Value
        }
    }
}

function Sync-SensorRules {
    if (-not (Test-Path $MasterRulePath)) {
        return
    }

    $localHash = (Get-FileHash $MasterRulePath -Algorithm MD5).Hash.ToUpper()
    $remoteHashOutput = Invoke-SensorCommand -Command "md5sum $(Quote-BashArg $RemoteRulePath) 2>/dev/null" -IgnoreExitCode
    $remoteHash = Get-RemoteHash -Output $remoteHashOutput

    if ($remoteHash -eq $localHash) {
        if ($Interactive) {
            Write-Host "[+] Rules are already in sync. Skipping upload." -ForegroundColor Green
        }
        return
    }

    $tempRulePath = "/tmp/detechtive_suricata_${script:RunTimestamp}.rules"

    if ($Interactive) {
        Write-Host "[*] Rule change detected. Syncing via SCP..." -ForegroundColor Yellow
    }

    Invoke-SensorUpload -LocalPath $MasterRulePath -RemotePath $tempRulePath

    $installCommand = "install -m 0644 $(Quote-BashArg $tempRulePath) $(Quote-BashArg $RemoteRulePath) && rm -f -- $(Quote-BashArg $tempRulePath)"
    Invoke-SensorCommand -AsRoot -Command $installCommand | Out-Null

    $verifiedHash = Get-RemoteHash -Output (Invoke-SensorCommand -Command "md5sum $(Quote-BashArg $RemoteRulePath)")
    if ($verifiedHash -ne $localHash) {
        throw "Sensor rule sync verification failed for $RemoteRulePath."
    }

    Invoke-SensorCommand -AsRoot -Command $SensorReloadCommand | Out-Null

    if ($Interactive) {
        Write-Host "[+] Rules synced and sensor reloaded." -ForegroundColor Green
    }
}

if ($Mode -ne "Pcap" -and -not $SkipRuleSync) {
    Sync-SensorRules
}

switch ($Mode) {
    "Quarantine" {
        $filterIps = @()
        if (-not [string]::IsNullOrWhiteSpace($IP)) {
            $filterIps += $IP
        }

        if (-not [string]::IsNullOrWhiteSpace($QuarantineIPs)) {
            $filterIps += $QuarantineIPs.Split(',', [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() }
        }

        $filterIps = $filterIps | Select-Object -Unique
        if ($filterIps.Count -eq 0) {
            throw "At least one target IP is required for Quarantine mode."
        }

        if ($Interactive) {
            Write-Host "[*] MODE: SURICATA QUARANTINE" -ForegroundColor DarkYellow
            Write-Host "[*] RUN ID: scan_${script:RunTimestamp}.json" -ForegroundColor DarkYellow
            Write-Host "[*] INSPECTION FILTER: $($filterIps -join ', ')" -ForegroundColor DarkYellow
            Write-Host "[!] Press Ctrl+C to stop.`n" -ForegroundColor DarkGray
        }

        $remoteCmd = "tail -n 5000 $(Quote-BashArg $RemoteLogPath)"
        $seenAlerts = New-Object 'System.Collections.Generic.HashSet[string]'
        $windowStartUtc = [datetime]::UtcNow

        try {
            while ($true) {
                $lines = Invoke-SensorCommand -Command $remoteCmd -IgnoreExitCode
                foreach ($line in $lines) {
                    if ([string]::IsNullOrWhiteSpace($line) -or $line -notmatch '"event_type"\s*:\s*"alert"') {
                        continue
                    }

                    if (-not $seenAlerts.Add($line)) {
                        continue
                    }

                    try {
                        $log = $line | ConvertFrom-Json
                        if ($filterIps -notcontains $log.src_ip -and $filterIps -notcontains $log.dest_ip) {
                            continue
                        }

                        if (-not (Test-SuricataAlertWithinWindow -LogObject $log -WindowStartUtc $windowStartUtc)) {
                            continue
                        }

                        $matchedTargetIp = if ($filterIps -contains $log.src_ip) { $log.src_ip } elseif ($filterIps -contains $log.dest_ip) { $log.dest_ip } else { $log.dest_ip }
                        $envelopedJson = Build-Envelope -LogObj $log -TargetServer "$SSHUser@$SensorIP" -OsType "linux" -CmdLine $remoteCmd
                        Save-TargetAlert -TargetIp $matchedTargetIp -EnvelopedJson $envelopedJson
                        Save-QuarantineCapture -EnvelopedJson $envelopedJson

                        if ($Interactive) {
                            $time = Get-Date -Format "HH:mm:ss"
                            $srcPort = if ($null -ne $log.PSObject.Properties['src_port']) { $log.src_port } else { "-" }
                            $dstPort = if ($null -ne $log.PSObject.Properties['dest_port']) { $log.dest_port } else { "-" }

                            Write-Host "[$time] [ALERT] " -ForegroundColor Red -NoNewline
                            Write-Host "$($log.alert.signature) " -ForegroundColor White -NoNewline
                            Write-Host "(Sev: $($log.alert.severity))" -ForegroundColor DarkRed
                            Write-Host "    -> SRC: $($log.src_ip):$srcPort" -ForegroundColor Yellow
                            Write-Host "    -> DST: $($log.dest_ip):$dstPort" -ForegroundColor Yellow
                            Write-Host "-------------------------------------------------------" -ForegroundColor DarkGray
                        } else {
                            Write-Output $envelopedJson
                        }
                    } catch {
                    }
                }

                Start-Sleep -Seconds 1
            }
        } catch {
            if ($Interactive) {
                Write-Host "[-] QUARANTINE SSH ERROR: $($_.Exception.Message)" -ForegroundColor Red
            } else {
                throw
            }
        }
    }

    "Hunt" {
        if (-not $IP) {
            if ($Interactive) {
                Write-Host "[-] IP required for Hunt mode." -ForegroundColor Red
            }
            return
        }

        if ($MinutesBack -lt 0) {
            throw "MinutesBack must be zero or greater."
        }

        $windowStartUtc = Get-HuntWindowStartUtc
        $windowLabel = if ($null -eq $windowStartUtc) { "full history" } else { $windowStartUtc.ToString("u") }

        if ($Interactive) {
            Write-Host "[*] Hunting for $IP via SSH on $SensorIP..." -ForegroundColor Cyan
            Write-Host "[*] Hunt window start (UTC): $windowLabel" -ForegroundColor DarkCyan
        }

        $results = @()
        $remoteHuntCmd = Build-SuricataHuntCommand -TargetIp $IP -WindowStartUtc $windowStartUtc

        try {
            $hits = Invoke-SensorCommand -Command $remoteHuntCmd -IgnoreExitCode
            foreach ($line in $hits) {
                if ([string]::IsNullOrWhiteSpace($line)) {
                    continue
                }

                try {
                    $log = $line | ConvertFrom-Json
                    if ($log.event_type -ne "alert") {
                        continue
                    }

                    if (-not (Test-SuricataAlertWithinWindow -LogObject $log -WindowStartUtc $windowStartUtc)) {
                        continue
                    }

                    $envelopedJson = Build-Envelope -LogObj $log -TargetServer "$SSHUser@$SensorIP" -OsType "linux" -CmdLine $remoteHuntCmd
                    Save-TargetAlert -TargetIp $log.dest_ip -EnvelopedJson $envelopedJson

                    if ($Interactive) {
                        $results += [pscustomobject]@{
                            Timestamp = $log.timestamp
                            Attacker = $log.src_ip
                            Target = $log.dest_ip
                            Signature = $log.alert.signature
                            Severity = $log.alert.severity
                        }
                    } else {
                        Write-Output $envelopedJson
                    }
                } catch {
                }
            }
        } catch {
            if ($Interactive) {
                Write-Host "[-] SSH Hunt Execution Failed: $($_.Exception.Message)" -ForegroundColor Red
            } else {
                throw
            }
        }

        Out-InteractiveTable -Title "RETROACTIVE HUNT: $IP" -Data $results
    }

    "Pcap" {
        if (-not $FilePath -or -not (Test-Path $FilePath)) {
            if ($Interactive) {
                Write-Host "[-] Valid FilePath required for Pcap mode." -ForegroundColor Red
            }
            return
        }

        $alerts = @()
        $cmdLineStr = ""
        $outputLines = @()
        $fastLogLines = @()
        $useLocalSuricata = (Test-Path $LocalSuricataExe) -and (Test-Path $LocalSuricataConfig)

        if ($useLocalSuricata) {
            $outDir = Join-Path $ScratchDir "suricata_$script:RunTimestamp"
            $outEve = Join-Path $outDir "eve.json"
            $outFast = Join-Path $outDir "fast.log"
            $stdoutFile = Join-Path $outDir "suricata_stdout.log"
            $stderrFile = Join-Path $outDir "suricata_stderr.log"

            New-Item -ItemType Directory -Force -Path $outDir | Out-Null
            foreach ($file in @($outEve, $outFast, $stdoutFile, $stderrFile)) {
                if (Test-Path $file) {
                    Remove-Item $file -Force
                }
            }

            $suriArgs = @('-r', $FilePath, '-c', $LocalSuricataConfig, '-S', $MasterRulePath, '-l', $outDir, '-k', 'none')
            $cmdLineStr = "$LocalSuricataExe " + ($suriArgs -join ' ')

            $exitCode = Invoke-LocalProcess -Executable $LocalSuricataExe -Arguments $suriArgs -StdOutPath $stdoutFile -StdErrPath $stderrFile
            if ($exitCode -ne 0) {
                $stderr = if (Test-Path $stderrFile) { (Get-Content $stderrFile -Raw).Trim() } else { '' }
                throw "Suricata PCAP execution failed with exit code $exitCode. $stderr"
            }

            if (Test-Path $outEve) {
                $outputLines = @(Get-Content $outEve)
            }

            if ($outputLines.Count -eq 0 -and (Test-Path $outFast)) {
                $fastLogLines = @(Get-Content $outFast)
            }
        } else {
            Sync-SensorRules
            $remotePcapPath = "/tmp/detechtive_suricata_pcap_${script:RunTimestamp}_${script:RunNonce}$([System.IO.Path]::GetExtension($FilePath))"
            $remoteOutputDir = "/tmp/detechtive_suricata_output_${script:RunTimestamp}_${script:RunNonce}"
            try {
                Invoke-SensorUpload -LocalPath $FilePath -RemotePath $remotePcapPath
                Invoke-SensorCommand -AsRoot -Command "mkdir -p $(Quote-BashArg $remoteOutputDir)" | Out-Null
                $remoteCmd = "/usr/bin/suricata -r $(Quote-BashArg $remotePcapPath) -c /etc/suricata/suricata.yaml -S $(Quote-BashArg $RemoteRulePath) -l $(Quote-BashArg $remoteOutputDir) -k none"
                $cmdLineStr = $remoteCmd
                Invoke-SensorCommand -AsRoot -Command $remoteCmd | Out-Null
                $outputLines = @(Invoke-SensorCommand -Command "if [ -f $(Quote-BashArg ($remoteOutputDir + '/eve.json')) ]; then cat $(Quote-BashArg ($remoteOutputDir + '/eve.json')); fi" -IgnoreExitCode)
                if ($outputLines.Count -eq 0) {
                    $fastLogLines = @(Invoke-SensorCommand -Command "if [ -f $(Quote-BashArg ($remoteOutputDir + '/fast.log')) ]; then cat $(Quote-BashArg ($remoteOutputDir + '/fast.log')); fi" -IgnoreExitCode)
                }
            } finally {
                Invoke-SensorCommand -AsRoot -Command "rm -rf -- $(Quote-BashArg $remoteOutputDir) $(Quote-BashArg $remotePcapPath)" -IgnoreExitCode | Out-Null
            }
        }

        foreach ($rawLine in $outputLines) {
            if ([string]::IsNullOrWhiteSpace($rawLine)) {
                continue
            }

            try {
                $logObj = $rawLine | ConvertFrom-Json
                if ($logObj.event_type -ne 'alert') {
                    continue
                }

                $targetServer = if ($useLocalSuricata) { 'localhost' } else { "$SSHUser@$SensorIP" }
                $osType = if ($useLocalSuricata) { 'windows' } else { 'linux' }
                $envelopedJson = Build-Envelope -LogObj $logObj -TargetServer $targetServer -OsType $osType -CmdLine $cmdLineStr
                $matchedTargetIp = if ($IP -and $logObj.src_ip -eq $IP) { $logObj.src_ip } elseif ($IP -and $logObj.dest_ip -eq $IP) { $logObj.dest_ip } else { $logObj.dest_ip }
                Save-TargetAlert -TargetIp $matchedTargetIp -EnvelopedJson $envelopedJson

                if ($Interactive) {
                    $alerts += [pscustomobject]@{
                        Timestamp = $logObj.timestamp
                        Attacker = $logObj.src_ip
                        Target = $logObj.dest_ip
                        Signature = $logObj.alert.signature
                        Severity = $logObj.alert.severity
                    }
                } else {
                    Write-Output $envelopedJson
                }
            } catch {
            }
        }

        foreach ($line in $fastLogLines) {
            $logObj = Convert-SuricataFastLogLineToObject -Line $line
            if ($null -eq $logObj) {
                continue
            }

            if ($IP -and $logObj.src_ip -ne $IP -and $logObj.dest_ip -ne $IP) {
                continue
            }

            $targetServer = if ($useLocalSuricata) { 'localhost' } else { "$SSHUser@$SensorIP" }
            $osType = if ($useLocalSuricata) { 'windows' } else { 'linux' }
            $envelopedJson = Build-Envelope -LogObj $logObj -TargetServer $targetServer -OsType $osType -CmdLine $cmdLineStr
            $matchedTargetIp = if ($IP -and $logObj.src_ip -eq $IP) { $logObj.src_ip } elseif ($IP -and $logObj.dest_ip -eq $IP) { $logObj.dest_ip } else { $logObj.dest_ip }
            Save-TargetAlert -TargetIp $matchedTargetIp -EnvelopedJson $envelopedJson

            if ($Interactive) {
                $alerts += [pscustomobject]@{
                    Timestamp = $logObj.timestamp
                    Attacker = $logObj.src_ip
                    Target = $logObj.dest_ip
                    Signature = $logObj.alert.signature
                    Severity = $logObj.alert.severity
                }
            } else {
                Write-Output $envelopedJson
            }
        }

        Out-InteractiveTable -Title "PCAP FORENSICS: $FilePath" -Data $alerts
    }
}




