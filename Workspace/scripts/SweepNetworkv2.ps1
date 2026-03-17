param(
  # CIDR network (optional if you use -StartIP/-EndIP)
  [string]$Network,

  # Range scan (optional; if provided, overrides -Network)
  [string]$StartIP,
  [string]$EndIP,

  [int]$TimeoutMs = 500,

  # Outputs results as a JSON array for the ASP.NET backend
  # Example: .\SweepNetwork.ps1 -Network "172.165.50.0/24" -Json
  [switch]$Json
)

function IPToUInt32([string]$ip) {
  $bytes = [System.Net.IPAddress]::Parse($ip).GetAddressBytes()
  [Array]::Reverse($bytes)
  return [BitConverter]::ToUInt32($bytes, 0)
}

function UInt32ToIP([uint32]$n) {
  $bytes = [BitConverter]::GetBytes($n)
  [Array]::Reverse($bytes)
  return ([System.Net.IPAddress]::new($bytes)).ToString()
}

function Expand-CIDR([string]$cidr) {
  $parts = $cidr.Split('/')
  if ($parts.Count -ne 2) { throw "Invalid CIDR. Example: 192.168.1.0/24" }
  $ip = $parts[0]
  $prefix = [int]$parts[1]
  if ($prefix -lt 1 -or $prefix -gt 32) { throw "Prefix must be 1..32" }

  $ipInt = IPToUInt32 $ip
  $mask = [uint32](([math]::Pow(2, 32) - 1) - ([math]::Pow(2, (32 - $prefix)) - 1))
  $network = $ipInt -band $mask
  $broadcast = $network + ([uint32]([math]::Pow(2, (32 - $prefix)) - 1))

  # Host range (skip network & broadcast if possible)
  $start = $network
  $end = $broadcast
  if ($prefix -le 30) { $start = $network + 1; $end = $broadcast - 1 }

  $ips = New-Object System.Collections.Generic.List[string]
  for ($i = $start; $i -le $end; $i++) { $ips.Add((UInt32ToIP $i)) }
  return $ips
}

function Expand-Range([string]$startIp, [string]$endIp) {
  if (-not $startIp -or -not $endIp) {
    throw "Provide both -StartIP and -EndIP for range scan."
  }

  $start = [uint32](IPToUInt32 $startIp)
  $end   = [uint32](IPToUInt32 $endIp)

  if ($start -gt $end) { throw "StartIP must be <= EndIP." }

  $ips = New-Object System.Collections.Generic.List[string]
  for ($i = $start; $i -le $end; $i++) { $ips.Add((UInt32ToIP $i)) }
  return $ips
}

# Reject half-specified ranges early instead of silently falling back to -Network.
if (($StartIP -and -not $EndIP) -or ($EndIP -and -not $StartIP)) {
  throw "Provide both -StartIP and -EndIP for range scan."
}

# Decide targets
$targets =
  if ($StartIP -and $EndIP) {
    Expand-Range $StartIP $EndIP
  } elseif ($Network) {
    Expand-CIDR $Network
  } else {
    throw "Provide -Network (CIDR) OR -StartIP and -EndIP."
  }

$ping = New-Object System.Net.NetworkInformation.Ping

# Pre-build all rows as Offline, then flip to Online if ping succeeds.
$rows = New-Object System.Collections.Generic.List[object]
foreach ($ip in $targets) {
  $rows.Add([pscustomobject]@{
    IPAddress = $ip
    Status    = "Offline"
  }) | Out-Null
}

# Ping each
foreach ($row in $rows) {
  try {
    $reply = $ping.Send($row.IPAddress, $TimeoutMs)
    if ($reply.Status -eq "Success") {
      $row.Status = "Online"
    }
  } catch {
    # keep Status=Offline
  }
}

# Already in range order, but keep numeric sort for safety
$sorted = $rows | Sort-Object { [uint32](IPToUInt32 $_.IPAddress) }

# JSON Output Block
if ($Json) {
  # Always emit a JSON array, even when there is only one target.
  $payload = @($sorted | Select-Object IPAddress, Status)
  ConvertTo-Json -InputObject $payload -Depth 3 -Compress
} else {
  $sorted | Select-Object IPAddress, Status | Format-Table -AutoSize
}
