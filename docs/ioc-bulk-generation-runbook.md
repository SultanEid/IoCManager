# IOC Bulk Generation Runbook

This runbook documents the safest and most repeatable way to generate a large number of IOC rows in the VMware lab without wasting time on quoting issues, oversized scan batches, or unnecessary database pressure.

Use this when the goal is to:

- validate the full pipeline end to end
- seed the database with lab IOC data
- create a diverse dataset across scanners, targets, and rules

Use this together with:

- [script-contracts.md](C:\Users\xsspe\Desktop\IOC_Manager\docs\script-contracts.md)
- [report-context-sanitized.md](C:\Users\xsspe\Desktop\IOC_Manager\docs\report-context-sanitized.md)
- [ui-planning-contract.md](C:\Users\xsspe\Desktop\IOC_Manager\docs\ui-planning-contract.md)

## 1. Current Lab Context

### Hosts

- `ioc_mgr`: `172.165.50.128`
- `WIN-SRV01`: `172.165.50.130`
- `WIN-SRV02`: `172.165.50.131`
- `LINUX-SRV01`: `172.165.50.132`
- `Linux-Sensor`: `172.165.50.134`

### Roles

- `ioc_mgr` is the remote execution relay and script host.
- `Linux-Sensor` is the active Snort and Suricata sensor.
- `.130`, `.131`, and `.132` are the scan targets.

### Backend path

The preferred ingestion path is the MVC backend, not direct DB writes:

1. trigger lab activity on the targets or sensor
2. call `POST /api/scans/run`
3. let the backend execute the script on `ioc_mgr`
4. let the backend parse the returned JSON
5. let the backend create IOC objects and store them

This preserves:

- `ScanResult`
- `IOC.ResultID`
- child detail rows
- consistent parsing and normalization

## 2. The Best Operational Pattern

### Do this

- generate IOC activity first
- run small or medium scanner batches
- verify counts after each phase
- scale only after one sample run succeeds

### Do not do this

- do not run giant YARA scans against broad Windows paths in one call
- do not rely on one massive Snort or Suricata hunt window
- do not insert directly into Azure SQL to “speed things up”
- do not spam the DB with repeated validation queries

## 3. Best Scanner Strategy

### YARA

Best use:

- deterministic bulk seeding
- large reliable volume
- file-path and file-hash coverage

What worked best:

- plant marker files under a dedicated folder only
- use split single-rule `.yar` files instead of a multi-rule bulk pack for Windows
- keep each YARA scan around `100` to `200` findings per run

Why:

- Windows YARA scans with `500+` matching files in one request tended to run too long
- smaller per-rule batches were stable

Recommended YARA scan pattern:

- `vmware-130`:
  - `C:\IoC\bulk`
- `vmware-131`:
  - `C:\IoC\bulk`
- `vmware-132`:
  - `/home/don/IoC/bulk`

Recommended rule pattern:

- `C:\YaraRules\bulk_split\alpha.yar`
- `C:\YaraRules\bulk_split\beta.yar`
- `C:\YaraRules\bulk_split\gamma.yar`
- `C:\YaraRules\bulk_split\delta.yar`
- `C:\YaraRules\bulk_split\epsilon.yar`

### SIGMA

Best use:

- controlled diversity across Windows and Linux
- cleaner semantic variety than network flood traffic

What worked best:

- trigger events first
- then scan with a short `MinutesBack`
- use custom rules tied to the known triggers

Windows rules that worked well:

- `detechtive_bulk_win_alpha.yml`
- `detechtive_bulk_win_beta.yml`
- `detechtive_bulk_win_gamma.yml`
- `detechtive_test_whoami.yml`
- `detechtive_test_ipconfig.yml`
- `detechtive_test_net_user.yml`

Linux rules that worked well:

- `detechtive_bulk_linux_alpha.yml`
- `detechtive_bulk_linux_beta.yml`
- `detechtive_bulk_linux_gamma.yml`
- `detechtive_linux_logger_recon.yml`
- `detechtive_linux_logger_dns.yml`
- `detechtive_linux_logger_service.yml`

Important Linux rule behavior:

- Linux Sigma is sensitive to normalized command text.
- To avoid dedupe collapse, use unique suffixes in logger messages when you want volume.
- Example:
  - `logger "DeTechTive Linux Sigma Recon 1"`
  - `logger "DeTechTive Linux Sigma Recon 2"`

### SNORT

Best use:

- reliable high-volume network IOC generation
- bulk top-up when the IOC count target is still not met

What worked best:

- generate traffic from the sensor host `.134`
- use short hunt windows
- run per-target bursts instead of one giant multi-target flood

Reliable rule types:

- ICMP ping
- DNS canary query using `detechtive`

Why Snort was the best network volume source:

- it returned large batches reliably
- it handled short targeted hunt windows better than Suricata in this lab

### SURICATA

Best use:

- spot validation
- low-volume diversity
- proving the Suricata path is healthy

What worked best:

- generate traffic from the sensor host `.134`
- use short hunt windows
- treat it as a validation scanner, not the main bulk volume source

Why:

- Suricata visibility is more sensitive to the traffic path in this lab
- Snort was a better bulk source

## 4. The Most Important Technical Lesson

### Trigger commands should be executed through `ioc_mgr` using encoded PowerShell

This was the single biggest source of wasted effort.

Bad approach:

- trying to push complex nested commands through multiple SSH hops with raw quoting

Good approach:

1. SSH from Win11 to `ioc_mgr`
2. run encoded PowerShell on `ioc_mgr`
3. let `ioc_mgr` execute the second SSH hop using a proper argument array

This avoided most of the quoting failures for:

- Windows target file planting
- Windows command triggering
- Linux logger command triggering
- sensor-side network burst generation

## 5. Known Good Trigger Patterns

### YARA file markers

Create dedicated marker files that match known bulk rules.

Examples:

- `DeTechTiveBulkYaraAlpha`
- `DeTechTiveBulkYaraBeta`
- `DeTechTiveBulkYaraGamma`
- `DeTechTiveBulkYaraDelta`
- `DeTechTiveBulkYaraEpsilon`

### Windows Sigma activity

Generate:

- `cmd.exe /c echo DeTechTiveBulkWinAlpha`
- `cmd.exe /c echo DeTechTiveBulkWinBeta`
- `cmd.exe /c echo DeTechTiveBulkWinGamma`
- `whoami`
- `ipconfig`
- `net user`

### Linux Sigma activity

Generate:

- `logger "DeTechTiveBulkLinuxAlpha 1"`
- `logger "DeTechTiveBulkLinuxBeta 1"`
- `logger "DeTechTiveBulkLinuxGamma 1"`
- `logger "DeTechTive Linux Sigma Recon 1"`
- `logger "DeTechTive Linux Sigma DNS 1"`
- `logger "DeTechTive Linux Sigma Service 1"`

### Network activity

Generate from the sensor host `.134`:

- `ping -c 1 <target>`
- `nslookup detechtive.local <target>`

Targets:

- `172.165.50.130`
- `172.165.50.131`
- `172.165.50.132`

## 6. Best Batch Sizes

These worked well:

- YARA:
  - `100` to `200` findings per run
- SIGMA:
  - `20` to `70` findings per run on Windows
  - `50` to `60` findings per run on Linux with unique logger suffixes
- SNORT:
  - `100` to `350` findings per run on a short hunt window
- SURICATA:
  - `2` to `5` findings per run for validation

These were poor choices:

- YARA:
  - `500+` Windows matches in one request
- network scans:
  - long wide hunt windows with stale backlog mixed in

## 7. Best Order Of Operations

Use this order:

1. start the MVC app locally
2. confirm `GET /api/targets/discovered` works
3. record the current `IOC` count
4. run one sample scan for each scanner
5. plant and trigger YARA and Sigma activity
6. run YARA batches
7. run Sigma batches
8. generate short sensor-side traffic bursts
9. run Snort hunts
10. run a small Suricata validation slice
11. record final counts
12. spot-check recent rows

Reason:

- YARA and Sigma are deterministic and easier to control
- Snort is the best late-stage volume source
- Suricata should confirm health, not carry the whole bulk target

## 8. Minimal Validation Queries

To stay gentle on Azure SQL, use only a few focused queries.

### Baseline and final total

- total `IOC` rows

### Distribution

- `IOC` count by `ScannerType`

### Integrity

- base rows missing their expected child row

### Spot-check

- recent `YARA`, `SIGMA`, `SNORT`, `SURICATA` rows joined with child tables

Do not keep querying every minute during the run.

## 9. Quality Gates

Before calling the run successful, confirm:

- `BaseOnlyRows = 0`
- recent `YARA` rows have:
  - `FilePath`
  - `FileHash`
- recent `SIGMA` rows have:
  - `RuleName`
  - useful `CommandLine`
- recent `SNORT` and `SURICATA` rows have:
  - `SourceIP`
  - `DestIP`
  - `Protocol`
  - `Severity`

## 10. Current Known Good Outcome Profile

A healthy seeded dataset in this lab should look roughly like:

- YARA:
  - largest file-based bulk source
- SIGMA:
  - second largest, with more semantic variety
- SNORT:
  - strong network volume source
- SURICATA:
  - smaller but present

If `SURICATA` is much lower than `SNORT`, that is acceptable in this lab as long as Suricata still produces valid rows.

## 11. Practical Recommendation For Future Runs

If the goal is around `4,000` new IOC rows, the best pattern is:

- `1,500` to `2,000` from YARA
- `1,000` to `1,500` from SIGMA
- `500` to `1,000` from SNORT
- `10` to `50` from SURICATA`

This is better than trying to force equal volume from every scanner.

## 12. Future Improvements

These would make future seeding much easier:

- add a dedicated backend endpoint for lab seeding batches
- add stored trigger scripts under `scripts` instead of one-off remote command strings
- add scanner-specific seed plans under `docs`
- add small reusable rule subsets on `ioc_mgr` for:
  - YARA bulk
  - Sigma bulk
  - Snort validation
  - Suricata validation
- add a lightweight run summary page in the MVC app

## 13. Key Takeaways

- Use the backend ingestion path, not manual DB inserts.
- Use encoded PowerShell for nested remote execution.
- Split YARA into small deterministic batches.
- Use Sigma for diversity.
- Use Snort for network volume.
- Use Suricata for health validation and smaller proof slices.
- Query the DB sparingly and verify integrity at the end.
