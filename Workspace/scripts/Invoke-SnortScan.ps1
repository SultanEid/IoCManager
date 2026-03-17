<#
.SYNOPSIS
    DeTechTive Network Module - State-Aware Snort 2.9 Interrogator (100% SSH/SCP Edition)
#>
[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [ValidateSet("Quarantine", "Hunt", "Pcap")]
    [string]$Mode,

    [string]$IP,
    [string]$FilePath,
    [datetime]$Since,
    [int]$MinutesBack = 60,
    [switch]$Interactive,
    [string]$SensorIP = "172.165.50.134",
    [string]$SSHUser = "don",
    [string]$SensorSudoPassword = "don",
    [string]$RemoteRulePath = "/etc/snort/rules/local.rules",
    [string]$RemoteLogPath = "/var/log/snort/snort.alert",
    [string]$LocalSnortExe = "C:\Tools\Snort\bin\snort.exe",
    [string]$LocalSnortConf = "C:\Tools\Snort\etc\snort.conf",
    [string]$MasterRulePath = "C:\Tools\Snort\rules\local.rules",
    [string]$ResultsBaseDir = "C:\Tools\Snort\results",
    [string]$ScratchDir = "C:\Tools\forensic_logs_temp",
    [string]$SensorReloadCommand = "systemctl restart snort"
)

$script:RunTimestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$script:BashSingleQuoteEscape = [string][char]39 + '"' + [string][char]39 + '"' + [string][char]39
$snortRegex = '\[\*\*\]\s+\[\d+:(?<sid>\d+):\d+\]\s+(?<msg>.*?)\s+\[\*\*\]\s+(?:\[Classification:.*?\]\s+)?(?:\[Priority:.*?\]\s+)?\{(?<proto>\w+)\}\s+(?<src>[\d\.]+)(?::\d+)?\s+->\s+(?<dest>[\d\.]+)(?::\d+)?'
$snortTimestampRegex = '^(?<ts>\d{2}/\d{2}-\d{2}:\d{2}:\d{2})(?:\.\d+)?'

function Build-Envelope {
    param($LogObj, $Target, $OsType, $CmdLine)

    [pscustomobject]@{
        metadata = [pscustomobject]@{
            target_server = $Target
            os_type = $OsType
            timestamp_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            scanner_type = "SNORT"
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

function Build-SnortHuntCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TargetIp,

        [Nullable[datetime]]$WindowStartUtc
    )

    if ($null -eq $WindowStartUtc) {
        return "grep $(Quote-BashArg $TargetIp) $(Quote-BashArg $RemoteLogPath)"
    }

    $tailLines = [Math]::Max($MinutesBack * 200, 5000)
    return "tail -n $tailLines $(Quote-BashArg $RemoteLogPath) | grep $(Quote-BashArg $TargetIp)"
}

function Convert-SnortTimestampToUtc {
    param([string]$Line)

    $match = [regex]::Match($Line, $snortTimestampRegex)
    if (-not $match.Success) {
        return $null
    }

    $currentYear = (Get-Date).Year
    $candidate = "{0}/{1}" -f $currentYear, $match.Groups['ts'].Value

    try {
        $parsed = [datetime]::ParseExact($candidate, "yyyy/MM/dd-HH:mm:ss", [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal)
        if ($parsed -gt (Get-Date).AddDays(1)) {
            $parsed = $parsed.AddYears(-1)
        }
        return $parsed.ToUniversalTime()
    } catch {
        return $null
    }
}

function Convert-SnortTimestampToDisplay {
    param([string]$Line)

    $timestampUtc = Convert-SnortTimestampToUtc -Line $Line
    if ($null -eq $timestampUtc) {
        return (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }

    return $timestampUtc.ToString("yyyy-MM-dd HH:mm:ss")
}

function Test-SnortAlertWithinWindow {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Line,

        [Nullable[datetime]]$WindowStartUtc
    )

    if ($null -eq $WindowStartUtc) {
        return $true
    }

    $eventTimeUtc = Convert-SnortTimestampToUtc -Line $Line
    return ($null -ne $eventTimeUtc -and $eventTimeUtc -ge $WindowStartUtc)
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

    $tempRulePath = "/tmp/detechtive_snort_${script:RunTimestamp}.rules"

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

function Convert-SnortLineToObject {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Line,

        [string]$TimestampOverride
    )

    if ($Line -notmatch $snortRegex) {
        return $null
    }

    return [pscustomobject]@{
        Scanner = "Snort"
        Timestamp = if ($TimestampOverride) { $TimestampOverride } else { Convert-SnortTimestampToDisplay -Line $Line }
        RuleTitle = $Matches['msg'].Trim()
        Description = "Protocol: $($Matches['proto'])"
        Protocol = $Matches['proto']
        Source_IP = $Matches['src']
        Dest_IP = $Matches['dest']
        Severity = "Medium"
    }
}

Sync-SensorRules

switch ($Mode) {
    "Quarantine" {
        if (-not $IP) {
            throw "IP is required for Quarantine mode."
        }

        if ($Interactive) {
            Write-Host "[*] MODE: SNORT QUARANTINE" -ForegroundColor DarkCyan
            Write-Host "[*] SENSOR: $SSHUser@$SensorIP" -ForegroundColor DarkCyan
            Write-Host "[*] INSPECTION FILTER: $IP" -ForegroundColor DarkCyan
            Write-Host "[!] Monitoring real-time alerts. Press Ctrl+C to stop.`n" -ForegroundColor DarkGray
        }

        $remoteCmd = "tail -n 0 -F $(Quote-BashArg $RemoteLogPath)"

        try {
            & ssh -o BatchMode=yes "$SSHUser@$SensorIP" $remoteCmd | ForEach-Object {
                $alertObj = Convert-SnortLineToObject -Line $_
                if ($null -eq $alertObj) {
                    continue
                }

                if ($alertObj.Source_IP -ne $IP -and $alertObj.Dest_IP -ne $IP) {
                    continue
                }

                $envelopedJson = Build-Envelope -LogObj $alertObj -Target "$SSHUser@$SensorIP" -OsType "linux" -CmdLine $remoteCmd
                Save-TargetAlert -TargetIp $alertObj.Dest_IP -EnvelopedJson $envelopedJson

                if ($Interactive) {
                    Write-Host "[$($alertObj.Timestamp)] [SNORT] $($alertObj.RuleTitle)" -ForegroundColor Cyan
                    Write-Host "    -> $($alertObj.Source_IP) -> $($alertObj.Dest_IP) ($($alertObj.Protocol))" -ForegroundColor Yellow
                    Write-Host "-------------------------------------------------------" -ForegroundColor DarkGray
                } else {
                    Write-Output $envelopedJson
                }
            }
        } catch {
            if ($Interactive) {
                Write-Host "[-] CONNECTION ERROR: $($_.Exception.Message)" -ForegroundColor Red
            } else {
                throw
            }
        }
    }

    "Hunt" {
        if (-not $IP) {
            if ($Interactive) {
                Write-Host "[-] ERROR: IP required." -ForegroundColor Red
            }
            return
        }

        if ($MinutesBack -lt 0) {
            throw "MinutesBack must be zero or greater."
        }

        $windowStartUtc = Get-HuntWindowStartUtc
        $windowLabel = if ($null -eq $windowStartUtc) { "full history" } else { $windowStartUtc.ToString("u") }

        if ($Interactive) {
            Write-Host "[*] MODE: SNORT HISTORIC HUNT" -ForegroundColor DarkCyan
            Write-Host "[*] HUNT WINDOW START (UTC): $windowLabel" -ForegroundColor DarkCyan
        }

        $remoteHuntCmd = Build-SnortHuntCommand -TargetIp $IP -WindowStartUtc $windowStartUtc
        $results = @()

        try {
            $hits = Invoke-SensorCommand -Command $remoteHuntCmd -IgnoreExitCode
            foreach ($line in $hits) {
                if (-not (Test-SnortAlertWithinWindow -Line $line -WindowStartUtc $windowStartUtc)) {
                    continue
                }

                $alertObj = Convert-SnortLineToObject -Line $line
                if ($null -eq $alertObj) {
                    continue
                }

                $envelopedJson = Build-Envelope -LogObj $alertObj -Target "$SSHUser@$SensorIP" -OsType "linux" -CmdLine $remoteHuntCmd
                Save-TargetAlert -TargetIp $alertObj.Dest_IP -EnvelopedJson $envelopedJson

                if ($Interactive) {
                    $results += $alertObj
                } else {
                    Write-Output $envelopedJson
                }
            }
        } catch {
            if (-not $Interactive) {
                throw
            }
        }

        Out-InteractiveTable -Title "SNORT HISTORIC HUNT: $IP" -Data $results
    }

    "Pcap" {
        if (-not $FilePath -or -not (Test-Path $FilePath)) {
            if ($Interactive) {
                Write-Host "[-] Valid FilePath required for Pcap mode." -ForegroundColor Red
            }
            return
        }

        if (-not (Test-Path $LocalSnortExe)) {
            throw "Local Snort executable not found: $LocalSnortExe"
        }

        if (-not (Test-Path $LocalSnortConf)) {
            throw "Local Snort config not found: $LocalSnortConf"
        }

        $outDir = Join-Path $ScratchDir "snort_$script:RunTimestamp"
        $stdoutFile = Join-Path $outDir "snort_stdout.log"
        $stderrFile = Join-Path $outDir "snort_stderr.log"
        New-Item -ItemType Directory -Force -Path $outDir | Out-Null

        foreach ($file in @($stdoutFile, $stderrFile)) {
            if (Test-Path $file) {
                Remove-Item $file -Force
            }
        }

        $args = @('-A', 'console', '-q', '-c', $LocalSnortConf, '-r', $FilePath, '-k', 'none')
        $cmdLineStr = "$LocalSnortExe " + ($args -join ' ')
        $exitCode = Invoke-LocalProcess -Executable $LocalSnortExe -Arguments $args -StdOutPath $stdoutFile -StdErrPath $stderrFile

        if ($exitCode -ne 0) {
            $stderr = if (Test-Path $stderrFile) { (Get-Content $stderrFile -Raw).Trim() } else { '' }
            throw "Snort PCAP execution failed with exit code $exitCode. $stderr"
        }

        if (-not (Test-Path $stdoutFile)) {
            return
        }

        $results = @()
        foreach ($line in Get-Content $stdoutFile) {
            $alertObj = Convert-SnortLineToObject -Line $line
            if ($null -eq $alertObj) {
                continue
            }

            $envelopedJson = Build-Envelope -LogObj $alertObj -Target 'localhost' -OsType 'windows' -CmdLine $cmdLineStr
            Save-TargetAlert -TargetIp $alertObj.Dest_IP -EnvelopedJson $envelopedJson

            if ($Interactive) {
                $results += $alertObj
            } else {
                Write-Output $envelopedJson
            }
        }

        Out-InteractiveTable -Title "SNORT PCAP: $FilePath" -Data $results
    }
}



