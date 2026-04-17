# Safe Lab Seeding Runbook

Purpose:
- generate benign but detector-visible IOC seed data
- avoid nested inline PowerShell quoting
- avoid generic remote orchestration behavior that can trigger endpoint protection

Principles:
- use explicit payload files only
- stage files through `ioc_mgr`
- run with short `-File` or `bash` execution paths
- no generic manifest engine
- no remote self-delete behavior

Current payloads:
- `scripts\Lab\payloads\windows\Seed-YaraSafeFiles.ps1`
- `scripts\Lab\payloads\linux\Seed-YaraSafeFiles.sh`
- `scripts\Lab\payloads\windows\Trigger-SigmaSafe.ps1`
- `scripts\Lab\payloads\linux\Trigger-SigmaSafe.sh`
- `scripts\Lab\payloads\linux\Trigger-SigmaCustomKnown.sh`
- `scripts\Lab\payloads\windows\Generate-NetworkTraffic.ps1`
- `scripts\Lab\payloads\linux\Generate-NetworkTraffic.sh`

Relay scripts on `ioc_mgr`:
- `scripts\Lab\ioc_mgr\Invoke-RemoteWindowsPayload.ps1`
- `scripts\Lab\ioc_mgr\Invoke-RemoteLinuxPayload.ps1`

Validated target outputs:
- Windows YARA seed directories:
  - `C:\IoC\seed\diverse_c`
  - `C:\IoC\seed\diverse_d`
- Linux YARA seed directory:
  - `/home/don/IoC/seed/diverse2`

Validated YARA rules for this seeded content:
- `C:\YaraRules\neo23x0_curated_windows\gen_recon_indicators.yar`
- `C:\YaraRules\official\suspicious_strings.yar`
- `C:\YaraRules\detechtive_curated_safe.yar`

Validated Sigma rules for this seeded content:
- Windows official:
  - `windows/process_creation/proc_creation_win_whoami_groups_discovery.yml`
  - `windows/process_creation/proc_creation_win_whoami_priv_discovery.yml`
  - `windows/process_creation/proc_creation_win_nslookup_domain_discovery.yml`
  - `windows/process_creation/proc_creation_win_curl_custom_user_agent.yml`
- Linux custom:
  - `detechtive_bulk_linux_alpha.yml`
  - `detechtive_bulk_linux_beta.yml`
  - `detechtive_bulk_linux_gamma.yml`

Notes:
- `gen_powershell_invocation.yar` did not match the current seed set reliably in this lab and should not be assumed valid without re-verifying the exact content.
- The network side is still uneven:
  - Suricata saw fresh seeded traffic reliably
  - Snort remained mostly limited to existing ICMP and DNS patterns
- Always ingest through `POST /api/scans/run`, not direct DB writes.
