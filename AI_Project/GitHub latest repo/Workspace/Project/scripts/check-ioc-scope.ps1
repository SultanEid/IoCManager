param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$allowedPathRegex = "\\(archive|research)\\"
$targetPaths = @(
  "frontend/workbench/src",
  "frontend/workbench/README.md",
  "backend/src/Backend.Api",
  "backend/README.md",
  "docs",
  "ai/service/README.md"
)

$extensions = @(".ts", ".tsx", ".cs", ".md", ".json", ".toml", ".yml", ".yaml")
$disallowedPatterns = @(
  @{ Name = "CTI platform"; Regex = "\bCTI platform\b" },
  @{ Name = "Case workbench"; Regex = "\bcase workbench\b" },
  @{ Name = "Reasoning platform"; Regex = "\breasoning platform\b" },
  @{ Name = "Autonomous reasoning claims"; Regex = "\bautonomous reasoning\b" },
  @{ Name = "Graph-first framing"; Regex = "\bgraph-first\b" },
  @{ Name = "Fake enterprise claim"; Regex = "\benterprise[- ](grade|ready|scale|class)\b" }
)

$files = @()
foreach ($target in $targetPaths) {
  $full = Join-Path $RepoRoot $target
  if (-not (Test-Path $full)) {
    continue
  }

  $item = Get-Item $full
  if ($item.PSIsContainer) {
    $files += Get-ChildItem $full -Recurse -File |
      Where-Object {
        $extensions -contains $_.Extension -and
        $_.FullName -notmatch "\\(node_modules|bin|obj|dist|build|\.next|coverage|test-results)\\" -and
        $_.FullName -notmatch $allowedPathRegex
      }
  } else {
    if (($extensions -contains $item.Extension) -and ($item.FullName -notmatch $allowedPathRegex)) {
      $files += $item
    }
  }
}

$violations = New-Object System.Collections.Generic.List[object]

foreach ($file in $files) {
  $relativePath = $file.FullName.Replace($RepoRoot + "\", "")
  foreach ($pattern in $disallowedPatterns) {
    $matches = Select-String -Path $file.FullName -Pattern $pattern.Regex -AllMatches
    foreach ($match in $matches) {
      $violations.Add([PSCustomObject]@{
          Path    = $relativePath
          Line    = $match.LineNumber
          Pattern = $pattern.Name
          Text    = $match.Line.Trim()
        })
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Host "IoC scope guardrail check failed." -ForegroundColor Red
  $violations |
    Sort-Object Path, Line |
    ForEach-Object {
      Write-Host ("{0}:{1} [{2}] {3}" -f $_.Path, $_.Line, $_.Pattern, $_.Text)
    }
  exit 1
}

Write-Host "IoC scope guardrail check passed." -ForegroundColor Green
