param(
    [string]$OutputDir = ".\data\latest",
    [int]$MaxPerFeed = 50000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

function Write-Info($msg) {
    Write-Host "[INFO] $msg"
}

function Write-WarnLog($msg) {
    Write-Host "[WARN] $msg"
}

function Invoke-TextFeed {
    param(
        [Parameter(Mandatory = $true)][string]$Url
    )
    $tmp = [System.IO.Path]::GetTempFileName()
    try {
        & curl.exe -L --fail --silent --show-error --connect-timeout 30 --max-time 120 `
            -A "IoC-Intelligence-Service/1.0 (+https://localhost)" `
            -o $tmp $Url
        if ($LASTEXITCODE -ne 0) {
            throw "curl exited with code $LASTEXITCODE for $Url"
        }
        return Get-Content -Path $tmp -Raw -Encoding UTF8
    }
    finally {
        if (Test-Path $tmp) { Remove-Item $tmp -Force }
    }
}

function Invoke-BinaryFeed {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$OutFile
    )
    & curl.exe -L --fail --silent --show-error --connect-timeout 30 --max-time 180 `
        -A "IoC-Intelligence-Service/1.0 (+https://localhost)" `
        -o $OutFile $Url
    if ($LASTEXITCODE -ne 0) {
        throw "curl exited with code $LASTEXITCODE for $Url"
    }
}

function Parse-AbuseChCsv {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][string[]]$Columns
    )
    $clean = $Content -split "`n" | Where-Object {
        $_.Trim().Length -gt 0 -and -not $_.TrimStart().StartsWith("#")
    }
    if ($clean.Count -eq 0) { return @() }
    return ($clean -join "`n") | ConvertFrom-Csv -Header $Columns
}

function Try-ParseDate([string]$s) {
    $result = [datetime]::UtcNow
    if ([datetime]::TryParse($s, [ref]$result)) {
        return ([datetime]::SpecifyKind($result, [System.DateTimeKind]::Utc)).ToString("o")
    }
    return [datetime]::UtcNow.ToString("o")
}

function Normalize-IocValue {
    param(
        [Parameter(Mandatory = $true)][string]$Type,
        [Parameter(Mandatory = $true)][string]$Value
    )

    $raw = $Value.Trim()
    if ([string]::IsNullOrWhiteSpace($raw)) { return $null }

    switch ($Type.ToLowerInvariant()) {
        "domain" {
            $v = $raw.ToLowerInvariant()
            $v = $v -replace "^\*\.", ""
            $v = $v.Trim(".")
            if ($v -match "^[a-z0-9][a-z0-9\.\-]{1,252}[a-z0-9]$") { return $v }
            return $null
        }
        "ip" {
            $v = ($raw -split ":")[0].Trim()
            if ($v -match "^(\d{1,3}\.){3}\d{1,3}$") { return $v }
            return $null
        }
        "url" {
            $v = $raw.Replace("hxxp://", "http://").Replace("hxxps://", "https://")
            return $v.Trim()
        }
        "hash" {
            $v = $raw.ToLowerInvariant()
            if ($v -match "^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$") { return $v }
            return $null
        }
        default {
            return $null
        }
    }
}

function Add-Record {
    param(
        [System.Collections.Generic.List[object]]$Observables,
        [System.Collections.Generic.List[object]]$Detections,
        [System.Collections.Generic.List[object]]$Outcomes,
        [string]$IocType,
        [string]$IocValue,
        [string]$SourceSystem,
        [string]$EventTime,
        [string]$Verdict,
        [hashtable]$HostContext,
        [hashtable]$RuleContext,
        [string]$ScannerFamily,
        [double]$SeverityScore
    )

    $normalized = Normalize-IocValue -Type $IocType -Value $IocValue
    if ($null -eq $normalized) { return }

    $observables.Add([pscustomobject]@{
        ioc_type = $IocType.ToLowerInvariant()
        ioc_value = $normalized
        event_time = $EventTime
        source_system = $SourceSystem
        host_context_json = ($HostContext | ConvertTo-Json -Compress)
        rule_context_json = ($RuleContext | ConvertTo-Json -Compress)
    })

    $detections.Add([pscustomobject]@{
        ioc_type = $IocType.ToLowerInvariant()
        ioc_value = $normalized
        event_time = $EventTime
        scanner_family = $ScannerFamily
        severity_score = [math]::Round($SeverityScore, 4)
    })

    $Outcomes.Add([pscustomobject]@{
        ioc_type = $IocType.ToLowerInvariant()
        ioc_value = $normalized
        event_time = $EventTime
        verdict = $Verdict
    })
}

function Limit-List {
    param([System.Collections.Generic.List[object]]$List, [int]$MaxItems)
    if ($List.Count -le $MaxItems) { return $List }
    return [System.Collections.Generic.List[object]]($List.GetRange(0, $MaxItems))
}

$outRoot = Resolve-Path -LiteralPath (New-Item -Path $OutputDir -ItemType Directory -Force).FullName
$rawDir = Join-Path $outRoot "raw"
New-Item -Path $rawDir -ItemType Directory -Force | Out-Null

$observables = [System.Collections.Generic.List[object]]::new()
$detections = [System.Collections.Generic.List[object]]::new()
$outcomes = [System.Collections.Generic.List[object]]::new()
$manifest = [System.Collections.Generic.List[object]]::new()

Write-Info "Collecting real IOC data feeds into $outRoot"

# 1) Benign domains (Tranco primary, Umbrella fallback)
$benignLoaded = 0
$benignSources = @(
    @{ name = "tranco"; url = "https://tranco-list.eu/top-1m.csv.zip"; local = "tranco-top1m.zip" },
    @{ name = "umbrella"; url = "http://s3-us-west-1.amazonaws.com/umbrella-static/top-1m.csv.zip"; local = "umbrella-top1m.zip" }
)

foreach ($source in $benignSources) {
    if ($benignLoaded -ge $MaxPerFeed) { break }
    try {
        $zipPath = Join-Path $rawDir $source.local
        Invoke-BinaryFeed -Url $source.url -OutFile $zipPath
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
        $entry = $zip.Entries | Where-Object { $_.Name -eq "top-1m.csv" } | Select-Object -First 1
        if ($null -eq $entry) { throw "top-1m.csv not found inside archive." }

        $reader = New-Object System.IO.StreamReader($entry.Open())
        $count = 0
        while (-not $reader.EndOfStream -and $benignLoaded -lt $MaxPerFeed) {
            $line = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            $parts = $line.Split(",")
            if ($parts.Length -lt 2) { continue }
            $domain = $parts[1]
            Add-Record -Observables $observables -Detections $detections -Outcomes $outcomes `
                -IocType "domain" -IocValue $domain -SourceSystem $source.name `
                -EventTime ([datetime]::UtcNow.ToString("o")) -Verdict "benign" `
                -HostContext @{ host_criticality = 0.3; asset_exposure = 0.2 } `
                -RuleContext @{ source_reputation = 0.95; scanner_agreement = 0.1; severity_score = 0.02 } `
                -ScannerFamily "passive_dns" -SeverityScore 0.02
            $count++
            $benignLoaded++
        }
        $reader.Close()
        $zip.Dispose()
        $manifest.Add([pscustomobject]@{ feed = $source.name; loaded = $count; status = "ok" })
    }
    catch {
        $manifest.Add([pscustomobject]@{ feed = $source.name; loaded = 0; status = "error"; error = $_.Exception.Message })
        Write-WarnLog "$($source.name) feed failed: $($_.Exception.Message)"
    }
}

if ($benignLoaded -lt $MaxPerFeed) {
    try {
        $content = Invoke-TextFeed -Url "https://raw.githubusercontent.com/opendns/public-domain-lists/master/opendns-top-domains.txt"
        $lines = $content -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith("#") }
        $count = 0
        foreach ($line in $lines) {
            if ($benignLoaded -ge $MaxPerFeed) { break }
            Add-Record -Observables $observables -Detections $detections -Outcomes $outcomes `
                -IocType "domain" -IocValue $line -SourceSystem "opendns_top_domains" `
                -EventTime ([datetime]::UtcNow.ToString("o")) -Verdict "benign" `
                -HostContext @{ host_criticality = 0.3; asset_exposure = 0.2 } `
                -RuleContext @{ source_reputation = 0.95; scanner_agreement = 0.1; severity_score = 0.02 } `
                -ScannerFamily "passive_dns" -SeverityScore 0.02
            $count++
            $benignLoaded++
        }
        $manifest.Add([pscustomobject]@{ feed = "opendns_top_domains"; loaded = $count; status = "ok" })
    }
    catch {
        $manifest.Add([pscustomobject]@{ feed = "opendns_top_domains"; loaded = 0; status = "error"; error = $_.Exception.Message })
        Write-WarnLog "opendns_top_domains feed failed: $($_.Exception.Message)"
    }
}

# 2) Phishing domains
try {
    $content = Invoke-TextFeed -Url "https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-domains-ACTIVE.txt"
    $lines = $content -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith("#") } | Select-Object -First $MaxPerFeed
    $count = 0
    foreach ($line in $lines) {
        Add-Record -Observables $observables -Detections $detections -Outcomes $outcomes `
            -IocType "domain" -IocValue $line -SourceSystem "phishing_database" `
            -EventTime ([datetime]::UtcNow.ToString("o")) -Verdict "true_positive" `
            -HostContext @{ host_criticality = 0.7; asset_exposure = 0.8 } `
            -RuleContext @{ source_reputation = 0.15; scanner_agreement = 0.6; severity_score = 0.85 } `
            -ScannerFamily "sigma" -SeverityScore 0.85
        $count++
    }
    $manifest.Add([pscustomobject]@{ feed = "phishing_database"; loaded = $count; status = "ok" })
}
catch {
    $manifest.Add([pscustomobject]@{ feed = "phishing_database"; loaded = 0; status = "error"; error = $_.Exception.Message })
    Write-WarnLog "Phishing Database feed failed: $($_.Exception.Message)"
}

# 3) OpenPhish URLs
try {
    $content = Invoke-TextFeed -Url "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt"
    $lines = $content -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith("#") } | Select-Object -First $MaxPerFeed
    $count = 0
    foreach ($line in $lines) {
        Add-Record -Observables $observables -Detections $detections -Outcomes $outcomes `
            -IocType "url" -IocValue $line -SourceSystem "openphish" `
            -EventTime ([datetime]::UtcNow.ToString("o")) -Verdict "true_positive" `
            -HostContext @{ host_criticality = 0.75; asset_exposure = 0.85 } `
            -RuleContext @{ source_reputation = 0.1; scanner_agreement = 0.7; severity_score = 0.88 } `
            -ScannerFamily "sigma" -SeverityScore 0.88
        $count++
    }
    $manifest.Add([pscustomobject]@{ feed = "openphish"; loaded = $count; status = "ok" })
}
catch {
    $manifest.Add([pscustomobject]@{ feed = "openphish"; loaded = 0; status = "error"; error = $_.Exception.Message })
    Write-WarnLog "OpenPhish feed failed: $($_.Exception.Message)"
}

# 4) Feodotracker malicious IPs
try {
    $content = Invoke-TextFeed -Url "https://feodotracker.abuse.ch/downloads/ipblocklist.csv"
    $rows = Parse-AbuseChCsv -Content $content -Columns @("first_seen_utc", "dst_ip", "dst_port", "c2_status", "last_online", "malware")
    $rows = $rows | Select-Object -First $MaxPerFeed
    $count = 0
    foreach ($row in $rows) {
        Add-Record -Observables $observables -Detections $detections -Outcomes $outcomes `
            -IocType "ip" -IocValue $row.dst_ip -SourceSystem "feodotracker" `
            -EventTime (Try-ParseDate $row.first_seen_utc) -Verdict "true_positive" `
            -HostContext @{ host_criticality = 0.8; asset_exposure = 0.9 } `
            -RuleContext @{ source_reputation = 0.05; scanner_agreement = 0.8; severity_score = 0.93 } `
            -ScannerFamily "snort" -SeverityScore 0.93
        $count++
    }
    $manifest.Add([pscustomobject]@{ feed = "feodotracker"; loaded = $count; status = "ok" })
}
catch {
    $manifest.Add([pscustomobject]@{ feed = "feodotracker"; loaded = 0; status = "error"; error = $_.Exception.Message })
    Write-WarnLog "Feodotracker feed failed: $($_.Exception.Message)"
}

# 5) URLhaus URLs
try {
    $content = Invoke-TextFeed -Url "https://urlhaus.abuse.ch/downloads/csv_recent/"
    $rows = Parse-AbuseChCsv -Content $content -Columns @("id", "dateadded", "url", "url_status", "last_online", "threat", "tags", "urlhaus_link", "reporter")
    $rows = $rows | Select-Object -First $MaxPerFeed
    $count = 0
    foreach ($row in $rows) {
        Add-Record -Observables $observables -Detections $detections -Outcomes $outcomes `
            -IocType "url" -IocValue $row.url -SourceSystem "urlhaus" `
            -EventTime (Try-ParseDate $row.dateadded) -Verdict "true_positive" `
            -HostContext @{ host_criticality = 0.82; asset_exposure = 0.9 } `
            -RuleContext @{ source_reputation = 0.07; scanner_agreement = 0.78; severity_score = 0.9 } `
            -ScannerFamily "snort" -SeverityScore 0.9
        $count++
    }
    $manifest.Add([pscustomobject]@{ feed = "urlhaus"; loaded = $count; status = "ok" })
}
catch {
    $manifest.Add([pscustomobject]@{ feed = "urlhaus"; loaded = 0; status = "error"; error = $_.Exception.Message })
    Write-WarnLog "URLhaus feed failed: $($_.Exception.Message)"
}

# 6) MalwareBazaar hashes
try {
    $content = Invoke-TextFeed -Url "https://bazaar.abuse.ch/export/csv/recent/"
    $rows = Parse-AbuseChCsv -Content $content -Columns @("first_seen_utc", "sha256_hash", "md5_hash", "sha1_hash", "reporter", "file_name", "file_type_guess", "mime_type", "signature", "clamav", "vtpercent", "imphash", "ssdeep", "tlsh")
    $rows = $rows | Select-Object -First $MaxPerFeed
    $count = 0
    foreach ($row in $rows) {
        $hashValue = if ($row.sha256_hash) { $row.sha256_hash } elseif ($row.md5_hash) { $row.md5_hash } else { $row.sha1_hash }
        Add-Record -Observables $observables -Detections $detections -Outcomes $outcomes `
            -IocType "hash" -IocValue $hashValue -SourceSystem "malwarebazaar" `
            -EventTime (Try-ParseDate $row.first_seen_utc) -Verdict "true_positive" `
            -HostContext @{ host_criticality = 0.88; asset_exposure = 0.92 } `
            -RuleContext @{ source_reputation = 0.04; scanner_agreement = 0.82; severity_score = 0.95 } `
            -ScannerFamily "yara" -SeverityScore 0.95
        $count++
    }
    $manifest.Add([pscustomobject]@{ feed = "malwarebazaar"; loaded = $count; status = "ok" })
}
catch {
    $manifest.Add([pscustomobject]@{ feed = "malwarebazaar"; loaded = 0; status = "error"; error = $_.Exception.Message })
    Write-WarnLog "MalwareBazaar feed failed: $($_.Exception.Message)"
}

# 7) ThreatFox mixed feed
try {
    $content = Invoke-TextFeed -Url "https://threatfox.abuse.ch/export/csv/recent/"
    $rows = Parse-AbuseChCsv -Content $content -Columns @("id", "date_added", "ioc_value", "ioc_type", "threat_type", "fk_malware", "malware_alias", "malware_printable", "reporter", "confidence_level", "tags")
    $rows = $rows | Select-Object -First $MaxPerFeed
    $count = 0
    foreach ($row in $rows) {
        $iocType = switch ($row.ioc_type) {
            "domain" { "domain" }
            "url" { "url" }
            "md5_hash" { "hash" }
            "sha1_hash" { "hash" }
            "sha256_hash" { "hash" }
            "ip:port" { "ip" }
            "ipv4:port" { "ip" }
            default { $null }
        }
        if ($null -eq $iocType) { continue }

        Add-Record -Observables $observables -Detections $detections -Outcomes $outcomes `
            -IocType $iocType -IocValue $row.ioc_value -SourceSystem "threatfox" `
            -EventTime (Try-ParseDate $row.date_added) -Verdict "escalated" `
            -HostContext @{ host_criticality = 0.9; asset_exposure = 0.95 } `
            -RuleContext @{ source_reputation = 0.03; scanner_agreement = 0.85; severity_score = 0.97 } `
            -ScannerFamily "threat_feed" -SeverityScore 0.97
        $count++
    }
    $manifest.Add([pscustomobject]@{ feed = "threatfox"; loaded = $count; status = "ok" })
}
catch {
    $manifest.Add([pscustomobject]@{ feed = "threatfox"; loaded = 0; status = "error"; error = $_.Exception.Message })
    Write-WarnLog "ThreatFox feed failed: $($_.Exception.Message)"
}

# Final dedupe / save
Write-Info "Finalizing CSV files..."

$obsFinal = @($observables |
    Group-Object ioc_type, ioc_value, event_time, source_system |
    ForEach-Object { $_.Group | Select-Object -First 1 })
$detFinal = @($detections |
    Group-Object ioc_type, ioc_value, event_time, scanner_family |
    ForEach-Object { $_.Group | Select-Object -First 1 })
$outFinal = @($outcomes |
    Group-Object ioc_type, ioc_value, event_time, verdict |
    ForEach-Object { $_.Group | Select-Object -First 1 })

$obsPath = Join-Path $outRoot "observables.csv"
$detPath = Join-Path $outRoot "detections.csv"
$outPath = Join-Path $outRoot "outcomes.csv"
$manifestPath = Join-Path $outRoot "collection_manifest.json"

$obsFinal | Export-Csv -Path $obsPath -NoTypeInformation -Encoding UTF8
$detFinal | Export-Csv -Path $detPath -NoTypeInformation -Encoding UTF8
$outFinal | Export-Csv -Path $outPath -NoTypeInformation -Encoding UTF8
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Path $manifestPath -Encoding UTF8

$summary = [pscustomobject]@{
    observables = @($obsFinal).Count
    detections = @($detFinal).Count
    outcomes = @($outFinal).Count
    output_dir = $outRoot.Path
    generated_utc = [datetime]::UtcNow.ToString("o")
}
$summary | ConvertTo-Json -Depth 3 | Write-Output
