param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
)

$ErrorActionPreference = "Stop"

function Normalize-PathForGit {
  param([string]$Path)
  return ($Path -replace "\\", "/")
}

$repoRootItem = Get-Item -LiteralPath $RepoRoot
$gitDir = Join-Path $repoRootItem.FullName ".git"
if (-not (Test-Path -LiteralPath $gitDir)) {
  throw "Repository root not found: $($repoRootItem.FullName)"
}

$gitOutput = & git -C $repoRootItem.FullName ls-files
if ($LASTEXITCODE -ne 0) {
  throw "git ls-files failed with exit code $LASTEXITCODE"
}

$tracked = @($gitOutput | ForEach-Object { Normalize-PathForGit $_ })

$blockedPatterns = @(
  @{
    Name = "Removed root src/"
    Regex = "^src/"
    Reason = "The legacy src/IocManager.Web surface is removed/decommissioned."
  },
  @{
    Name = "Root local result folder"
    Regex = "^(YARA|SIGMA|SNORT|SURICATA|SWEEPNETWORKV2)_Results/"
    Reason = "Scanner result folders are generated/local output."
  },
  @{
    Name = "Root temp or backup folder"
    Regex = "^(tmp|tmp_script_validation|Workspace\.local-backup-[^/]+)/"
    Reason = "Temporary folders and local workspace backups are not active source."
  },
  @{
    Name = "Local tool state"
    Regex = "^(\.vs|\.playwright-cli)/"
    Reason = "Local IDE/tool state must not be tracked."
  },
  @{
    Name = "Root diagnostic output"
    Regex = "^[^/]+\.(err\.log|out\.log|log|png)$"
    Reason = "Root logs and screenshots are local diagnostics."
  },
  @{
    Name = "Root probe JSON output"
    Regex = "^(live_ioc_probe_|.*probe).*\.json$"
    Reason = "Probe output is local/generated data."
  }
)

$violations = New-Object System.Collections.Generic.List[object]

foreach ($path in $tracked) {
  foreach ($pattern in $blockedPatterns) {
    if ($path -match $pattern.Regex) {
      $violations.Add([PSCustomObject]@{
          Path = $path
          Boundary = $pattern.Name
          Reason = $pattern.Reason
        })
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Host "Repository boundary check failed." -ForegroundColor Red
  $violations |
    Sort-Object Path |
    ForEach-Object {
      Write-Host ("{0} [{1}] {2}" -f $_.Path, $_.Boundary, $_.Reason)
    }
  Write-Host ""
  Write-Host "Do not delete user material automatically. Untrack or move files only when explicitly requested." -ForegroundColor Yellow
  exit 1
}

Write-Host "Repository boundary check passed." -ForegroundColor Green
Write-Host "Active product root: Workspace/Project/"
Write-Host "Reference/archive material remains allowed only when explicitly targeted."
