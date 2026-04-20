# Global rules for all scripts

## Interactive mode

-   meant for humans
-   prints readable status/output to terminal
-   may also save local result files
-   ASP.NET should **not** depend on interactive output

## Silent mode

-   meant for C#
-   your app should call scripts **without** `-Interactive`
-   parse **stdout only**
-   if stdout has JSON line(s), those are real detections/results
-   if stdout is empty, that means **no findings**
-   if the script throws / exits with failure, treat as **execution failure**

## Common app behavior

Your C# side should handle 3 outcomes:

1.  **stdout contains JSON**
    
    -   parse and store in DB
2.  **stdout empty**
    
    -   clean scan / no findings
3.  **script error / non-zero / stderr failure**
    
    -   mark scan as failed

* * *

# 1) YARA contract

## Purpose

Remote file/path scan on Windows or Linux target using YARA rules.

## Main parameters

-   `-Target`
-   `-User`
-   `-ScanPath`
-   `-RulePath` or `-RemoteRulePath`
-   `-RemoteOS`
-   `-KeyPath`

## Optional behavior

-   `-Recursive`
-   `-ShowStrings`
-   `-NoCleanup`
-   `-Interactive`

## Silent output behavior

-   emits **one JSON object**
-   JSON contains:
    
    -   `metadata`
    -   `raw_scanner_payload`

## No-match behavior

-   still returns JSON
-   `match_count = 0`
-   `affected_files = 0`

## Match behavior

-   returns JSON with:
    
    -   matched files
    -   rules
    -   optional strings/offsets if `-ShowStrings`

## Failure behavior

-   should be treated as failed execution
-   transport/setup/runtime failure must not be confused with ???0 matches???

## Local saved results

-   saved under:
    
    -   `C:\Tools\yara\results\<TargetIP>\`

## App expectation

-   always try to parse stdout JSON for YARA
-   then decide based on `match_count`

* * *

# 2) Sigma contract

## Purpose

Remote Chainsaw hunt on Windows EVTX logs using Sigma rules.

## Main parameters

-   `-Target`
-   `-User`
-   `-KeyPath`
-   `-Rule` or `-CustomRule`

## Optional behavior

-   `-MinutesBack`
-   `-ScanEntireLog`
-   `-EvtxPath`
-   `-PrettyJson`
-   `-Interactive`

## Silent output behavior

-   emits JSON **only when detections exist**
-   one enveloped JSON object
-   contains:
    
    -   `metadata`
    -   `raw_scanner_payload`
        
        -   `detection_count`
        -   `detections`

## No-detection behavior

-   returns **nothing**
-   stdout empty = clean scan

## Detection behavior

-   returns JSON
-   `raw_scanner_payload.detection_count > 0`

## Failure behavior

-   throws / fails
-   bad rule path, SSH failure, Chainsaw failure = execution failure

## Local saved results

-   saved under:
    
    -   `C:\Tools\Sigma\results\<TargetIP>\`

## App expectation

-   if stdout empty ??? no findings
-   if stdout has JSON ??? parse and store
-   do not expect a ???clean scan JSON??? from Sigma

* * *

# 3) Suricata contract

## Purpose

Network detection using Suricata in 3 modes:

-   `Quarantine`
-   `Hunt`
-   `Pcap`

## Standardized Linux layout

-   config: `/etc/suricata/`
-   rules: `/etc/suricata/rules/`
-   logs: `/var/log/suricata/`

## Main parameters

-   `-Mode`
-   `-IP` for Hunt or Quarantine
-   `-MinutesBack` for Hunt windowing, default `60`
-   `-Since` for Hunt windowing with an absolute timestamp
-   `-FilePath` for Pcap

## Important defaults

-   `RemoteRulePath = /etc/suricata/rules/local.rules`
-   `RemoteLogPath = /var/log/suricata/eve.json`

## Silent output behavior

-   emits **one JSON line per alert hit**
-   only real alerts are output

## No-hit behavior

-   returns **nothing**

## Interactive behavior

-   Quarantine: prints alert stream
-   Hunt: prints matching alert table
-   Pcap: prints alert table

## Local saved results

-   saved under:
    
    -   `C:\Tools\Suricata\results\<TargetIP>\`

## App expectation by mode

### Quarantine

-   long-running stream filtered to one IP
-   each stdout JSON line = one alert for the monitored IP
-   best for streaming/continuous ingestion

### Hunt

-   finite query
-   bounded by `-MinutesBack` or `-Since` when provided
-   `-MinutesBack 0` keeps the full-history behavior
-   stdout JSON lines only for matching alert hits
-   empty stdout = no hits

### Pcap

-   finite offline analysis
-   stdout JSON lines only for alert hits
-   empty stdout = no hits

## Failure behavior

-   script/runtime/SSH/pcap execution failure = failed execution

* * *

# 4) Snort contract

## Purpose

Network detection using Snort in 3 modes:

-   `Quarantine`
-   `Hunt`
-   `Pcap`

## Main parameters

-   `-Mode`
-   `-IP` for Hunt or Quarantine
-   `-MinutesBack` for Hunt windowing, default `60`
-   `-Since` for Hunt windowing with an absolute timestamp
-   `-FilePath` for Pcap

## Important defaults

-   `RemoteRulePath = /etc/snort/rules/local.rules`
-   `RemoteLogPath = /var/log/snort/snort.alert`

## Silent output behavior

-   emits **one JSON line per alert**
-   each line is one parsed Snort fast alert converted into your envelope

## No-hit behavior

-   returns **nothing**

## Interactive behavior

-   Quarantine: prints alert stream
-   Hunt: prints table
-   Pcap: prints table

## Local saved results

-   saved under:
    
    -   `C:\Tools\Snort\results\<TargetIP>\`

## App expectation by mode

### Quarantine

-   long-running stream filtered to one IP
-   each JSON line = one alert

### Hunt

-   finite query
-   bounded by `-MinutesBack` or `-Since` when provided
-   `-MinutesBack 0` keeps the full-history behavior
-   zero stdout = no hits

### Pcap

-   finite offline analysis
-   zero stdout = no hits

## Failure behavior

-   runtime/SSH/pcap failure = failed execution

* * *

# Unified C# parsing logic

This is the simplest reliable app logic:

## For YARA

-   read stdout
-   if JSON exists, parse it
-   store only if `match_count > 0`
-   if `match_count = 0`, treat as clean scan

## For Sigma

-   read stdout
-   if empty, clean scan
-   if JSON exists, parse and store

## For Suricata

-   read stdout line by line
-   each line is one alert JSON
-   if no lines, no hits

## For Snort

-   read stdout line by line
-   each line is one alert JSON
-   if no lines, no hits

* * *

# Result storage assumption

Your app should treat the scripts as having **two outputs**:

## Primary output

-   stdout JSON for machine parsing

## Secondary output

-   local saved files for audit/debug/manual review

The app should depend mainly on **stdout**, not on reading saved files.
