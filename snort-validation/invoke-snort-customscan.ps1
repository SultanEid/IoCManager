param(
  [string]$Token,
  [string]$ActorUserId,
  [string[]]$ScannerFamilies,
  [ValidateSet('hostPath','upload')][string]$RuleInputMode,
  [string]$RulePath,
  [string[]]$NetworkIds,
  [string[]]$TargetIds,
  [string]$MinutesBack,
  [string[]]$Files
)
function Convert-ToJsonArray([string[]]$Items) {
  if ($null -eq $Items -or $Items.Count -eq 0) { return '[]' }
  if ($Items.Count -eq 1) { return '[' + ($Items[0] | ConvertTo-Json -Compress) + ']' }
  return ($Items | ConvertTo-Json -Compress)
}
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $Token)
$content = [System.Net.Http.MultipartFormDataContent]::new()
$content.Add([System.Net.Http.StringContent]::new($ActorUserId), 'actorUserId')
$content.Add([System.Net.Http.StringContent]::new((Convert-ToJsonArray $ScannerFamilies)), 'scannerFamiliesJson')
$content.Add([System.Net.Http.StringContent]::new($RuleInputMode), 'ruleInputMode')
if ($RulePath) { $content.Add([System.Net.Http.StringContent]::new($RulePath), 'rulePath') }
$content.Add([System.Net.Http.StringContent]::new((Convert-ToJsonArray $NetworkIds)), 'networkIdsJson')
$content.Add([System.Net.Http.StringContent]::new((Convert-ToJsonArray $TargetIds)), 'targetIdsJson')
$options = @{ minutesBack = $MinutesBack }
$content.Add([System.Net.Http.StringContent]::new(($options | ConvertTo-Json -Compress)), 'optionsJson')
$streams = @()
foreach ($file in ($Files | Where-Object { $_ })) {
  $stream = [System.IO.File]::OpenRead($file)
  $streams += $stream
  $fileContent = [System.Net.Http.StreamContent]::new($stream)
  $content.Add($fileContent, 'files', [System.IO.Path]::GetFileName($file))
}
try {
  $response = $client.PostAsync('http://localhost:5127/api/v2/legacy-pipeline/custom-scans', $content).GetAwaiter().GetResult()
  $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
  [pscustomobject]@{ StatusCode = [int]$response.StatusCode; Body = $body } | ConvertTo-Json -Compress
}
finally {
  foreach ($stream in $streams) { $stream.Dispose() }
  $content.Dispose()
  $client.Dispose()
}
