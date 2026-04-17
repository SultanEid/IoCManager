param(
  [string]$Token,
  [string]$ActorUserId,
  [string]$ScannerFamiliesJson,
  [string]$RuleInputMode,
  [string]$RulePath,
  [string]$NetworkIdsJson,
  [string]$TargetIdsJson,
  [string]$OptionsJson,
  [string]$TargetOsOverridesJson,
  [string[]]$Files
)
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $Token)
$content = [System.Net.Http.MultipartFormDataContent]::new()
$content.Add([System.Net.Http.StringContent]::new($ActorUserId), 'actorUserId')
$content.Add([System.Net.Http.StringContent]::new($ScannerFamiliesJson), 'scannerFamiliesJson')
$content.Add([System.Net.Http.StringContent]::new($RuleInputMode), 'ruleInputMode')
if ($RulePath) { $content.Add([System.Net.Http.StringContent]::new($RulePath), 'rulePath') }
$content.Add([System.Net.Http.StringContent]::new($NetworkIdsJson), 'networkIdsJson')
$content.Add([System.Net.Http.StringContent]::new($TargetIdsJson), 'targetIdsJson')
$content.Add([System.Net.Http.StringContent]::new($OptionsJson), 'optionsJson')
if ($TargetOsOverridesJson) { $content.Add([System.Net.Http.StringContent]::new($TargetOsOverridesJson), 'targetOsOverridesJson') }
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
