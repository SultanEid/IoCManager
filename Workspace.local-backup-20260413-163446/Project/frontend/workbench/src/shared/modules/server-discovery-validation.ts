type ParsedSubnet = {
  canonicalCidr: string
  hostMin: number
  hostMax: number
}

export type DiscoveryRangeValidation = {
  valid: boolean
  error: string | null
  normalizedRangeStartIp: string | null
  normalizedRangeEndIp: string | null
  totalHosts: number
}

function parseIpv4(rawValue: string): number | null {
  const parts = rawValue.trim().split(".")
  if (parts.length !== 4) {
    return null
  }

  const octets = parts.map((part) => Number(part))
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null
  }

  return (((octets[0] << 24) >>> 0) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0
}

function formatIpv4(value: number) {
  return `${(value >>> 24) & 255}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`
}

function isPrivateRfc1918(value: number) {
  const firstOctet = (value >>> 24) & 255
  const secondOctet = (value >>> 16) & 255
  return (
    firstOctet === 10 ||
    (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) ||
    (firstOctet === 192 && secondOctet === 168)
  )
}

function parseSubnet(cidr: string): ParsedSubnet | null {
  const trimmed = cidr.trim()
  const separatorIndex = trimmed.indexOf("/")
  if (separatorIndex <= 0 || separatorIndex >= trimmed.length - 1) {
    return null
  }

  const ip = parseIpv4(trimmed.slice(0, separatorIndex))
  const prefix = Number(trimmed.slice(separatorIndex + 1))
  if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return null
  }

  if (!isPrivateRfc1918(ip)) {
    return null
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const network = ip & mask
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const hostMin = prefix >= 31 ? network : (network + 1) >>> 0
  const hostMax = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0

  return {
    canonicalCidr: `${formatIpv4(network)}/${prefix}`,
    hostMin,
    hostMax,
  }
}

export function validateDiscoveryRangeInput(
  subnetCidrBlock: string,
  rangeStartIp: string,
  rangeEndIp: string,
  maxHostsPerRun = 256,
): DiscoveryRangeValidation {
  const parsedSubnet = parseSubnet(subnetCidrBlock)
  if (!parsedSubnet) {
    return {
      valid: false,
      error: "Selected subnet CIDR is invalid or outside private RFC1918 space.",
      normalizedRangeStartIp: null,
      normalizedRangeEndIp: null,
      totalHosts: 0,
    }
  }

  const hasStart = rangeStartIp.trim().length > 0
  const hasEnd = rangeEndIp.trim().length > 0
  if (hasStart !== hasEnd) {
    return {
      valid: false,
      error: "Range start and range end must both be provided or both left blank.",
      normalizedRangeStartIp: null,
      normalizedRangeEndIp: null,
      totalHosts: 0,
    }
  }

  let start = parsedSubnet.hostMin
  let end = parsedSubnet.hostMax
  let normalizedStartIp: string | null = null
  let normalizedEndIp: string | null = null
  if (hasStart && hasEnd) {
    const parsedStart = parseIpv4(rangeStartIp)
    const parsedEnd = parseIpv4(rangeEndIp)
    if (parsedStart === null || parsedEnd === null) {
      return {
        valid: false,
        error: "Range start and range end must be valid IPv4 addresses.",
        normalizedRangeStartIp: null,
        normalizedRangeEndIp: null,
        totalHosts: 0,
      }
    }

    if (!isPrivateRfc1918(parsedStart) || !isPrivateRfc1918(parsedEnd)) {
      return {
        valid: false,
        error: "Only private RFC1918 IPv4 ranges are allowed.",
        normalizedRangeStartIp: null,
        normalizedRangeEndIp: null,
        totalHosts: 0,
      }
    }

    if (parsedStart > parsedEnd) {
      return {
        valid: false,
        error: "Range start IP must be less than or equal to range end IP.",
        normalizedRangeStartIp: null,
        normalizedRangeEndIp: null,
        totalHosts: 0,
      }
    }

    if (parsedStart < parsedSubnet.hostMin || parsedEnd > parsedSubnet.hostMax) {
      return {
        valid: false,
        error: "Range must stay within the selected subnet host range.",
        normalizedRangeStartIp: null,
        normalizedRangeEndIp: null,
        totalHosts: 0,
      }
    }

    start = parsedStart
    end = parsedEnd
    normalizedStartIp = formatIpv4(parsedStart)
    normalizedEndIp = formatIpv4(parsedEnd)
  }

  const totalHosts = end - start + 1
  if (totalHosts <= 0) {
    return {
      valid: false,
      error: "Discovery range must include at least one host.",
      normalizedRangeStartIp: normalizedStartIp,
      normalizedRangeEndIp: normalizedEndIp,
      totalHosts: 0,
    }
  }

  if (totalHosts > maxHostsPerRun) {
    return {
      valid: false,
      error: `Discovery range includes ${totalHosts} hosts, exceeding the lab safety limit of ${maxHostsPerRun}.`,
      normalizedRangeStartIp: normalizedStartIp,
      normalizedRangeEndIp: normalizedEndIp,
      totalHosts,
    }
  }

  void parsedSubnet.canonicalCidr
  return {
    valid: true,
    error: null,
    normalizedRangeStartIp: normalizedStartIp,
    normalizedRangeEndIp: normalizedEndIp,
    totalHosts,
  }
}
