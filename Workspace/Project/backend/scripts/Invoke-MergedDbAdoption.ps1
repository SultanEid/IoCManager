param(
    [switch]$Apply,
    [string]$EnvironmentName = "Development",
    [string]$ConfigDirectory = ""
)

$backendRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($ConfigDirectory)) {
    $ConfigDirectory = Join-Path $backendRoot "src\\Backend.Api"
}

$projectPath = Join-Path $backendRoot "tools\\MergedDbAdoption\\MergedDbAdoption.csproj"
$arguments = @(
    "run",
    "--project", $projectPath,
    "--",
    "--config-dir", (Resolve-Path $ConfigDirectory).Path,
    "--environment", $EnvironmentName
)

if ($Apply.IsPresent) {
    $arguments += "--apply"
}

dotnet @arguments
