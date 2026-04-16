using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Sockets;

namespace Backend.Api.Infrastructure;

public sealed record DiscoveryTargetRange(
    string RequestedCidr,
    string? RangeStartIp,
    string? RangeEndIp,
    IReadOnlyList<IPAddress> Targets,
    IReadOnlyList<IPAddress> ExcludedTargets);

public sealed class DiscoveryTargetRangeParser
{
    private readonly DiscoveryExecutionOptions _options;

    public DiscoveryTargetRangeParser(IOptions<DiscoveryExecutionOptions> options)
    {
        _options = options.Value;
    }

    public DiscoveryTargetRange Parse(string subnetCidr, string? rangeStartIp, string? rangeEndIp)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(subnetCidr);
        var trimmedCidr = subnetCidr.Trim();

        var separatorIndex = trimmedCidr.IndexOf('/');
        if (separatorIndex <= 0 || separatorIndex >= trimmedCidr.Length - 1)
        {
            throw new ArgumentException("Subnet CIDR must be in IPv4 CIDR format (for example 10.10.1.0/24).", nameof(subnetCidr));
        }

        var rawAddress = trimmedCidr[..separatorIndex];
        var rawPrefix = trimmedCidr[(separatorIndex + 1)..];
        if (!int.TryParse(rawPrefix, out var prefixLength) || prefixLength < 0 || prefixLength > 32)
        {
            throw new ArgumentException("Subnet CIDR prefix length must be between 0 and 32.", nameof(subnetCidr));
        }

        var baseAddress = ParseIpv4(rawAddress, nameof(subnetCidr));
        var baseValue = ToUInt32(baseAddress);

        var mask = prefixLength == 0 ? 0u : uint.MaxValue << (32 - prefixLength);
        var networkValue = baseValue & mask;
        var broadcastValue = networkValue | ~mask;

        var (hostMin, hostMax) = ComputeHostRange(networkValue, broadcastValue, prefixLength);
        if (hostMin > hostMax)
        {
            throw new ArgumentException("Subnet CIDR does not contain any discoverable host addresses.", nameof(subnetCidr));
        }

        uint rangeStartValue;
        uint rangeEndValue;
        string? normalizedRangeStart = null;
        string? normalizedRangeEnd = null;

        var hasRangeStart = !string.IsNullOrWhiteSpace(rangeStartIp);
        var hasRangeEnd = !string.IsNullOrWhiteSpace(rangeEndIp);
        if (hasRangeStart != hasRangeEnd)
        {
            throw new ArgumentException("Range start and range end must both be provided or both be omitted.");
        }

        if (hasRangeStart && hasRangeEnd)
        {
            var parsedRangeStart = ParseIpv4(rangeStartIp!.Trim(), nameof(rangeStartIp));
            var parsedRangeEnd = ParseIpv4(rangeEndIp!.Trim(), nameof(rangeEndIp));
            rangeStartValue = ToUInt32(parsedRangeStart);
            rangeEndValue = ToUInt32(parsedRangeEnd);

            if (rangeStartValue > rangeEndValue)
            {
                throw new ArgumentException("Range start IP must be less than or equal to range end IP.");
            }

            if (rangeStartValue < hostMin || rangeEndValue > hostMax)
            {
                throw new ArgumentException("Requested range must be fully contained in the selected subnet host range.");
            }

            normalizedRangeStart = FromUInt32(rangeStartValue).ToString();
            normalizedRangeEnd = FromUInt32(rangeEndValue).ToString();
        }
        else
        {
            rangeStartValue = hostMin;
            rangeEndValue = hostMax;
        }

        var totalHosts = checked((int)(rangeEndValue - rangeStartValue + 1));
        if (totalHosts <= 0)
        {
            throw new ArgumentException("Requested discovery range must include at least one host.");
        }

        if (totalHosts > _options.MaxHostsPerRun)
        {
            throw new ArgumentException($"Requested discovery range includes {totalHosts} hosts, exceeding the configured safety limit of {_options.MaxHostsPerRun}.");
        }

        var gatewayCandidate = prefixLength < 31 ? networkValue + 1 : (uint?)null;
        var targets = new List<IPAddress>(totalHosts);
        var excludedTargets = new List<IPAddress>(1);
        for (var index = 0; index < totalHosts; index++)
        {
            var targetValue = rangeStartValue + (uint)index;
            if (gatewayCandidate.HasValue && targetValue == gatewayCandidate.Value)
            {
                excludedTargets.Add(FromUInt32(targetValue));
                continue;
            }

            targets.Add(FromUInt32(targetValue));
        }

        if (targets.Count == 0)
        {
            throw new ArgumentException("Requested discovery range only contains the excluded subnet gateway address.");
        }

        var requestedCidr = $"{FromUInt32(networkValue)}/{prefixLength}";
        return new DiscoveryTargetRange(requestedCidr, normalizedRangeStart, normalizedRangeEnd, targets, excludedTargets);
    }

    private static (uint HostMin, uint HostMax) ComputeHostRange(uint networkValue, uint broadcastValue, int prefixLength)
    {
        if (prefixLength >= 31)
        {
            return (networkValue, broadcastValue);
        }

        return (networkValue + 1, broadcastValue - 1);
    }

    private static IPAddress ParseIpv4(string rawValue, string argumentName)
    {
        if (!IPAddress.TryParse(rawValue, out var parsed) || parsed.AddressFamily != AddressFamily.InterNetwork)
        {
            throw new ArgumentException($"Value '{rawValue}' must be a valid IPv4 address.", argumentName);
        }

        return parsed;
    }

    private static uint ToUInt32(IPAddress address)
    {
        var bytes = address.GetAddressBytes();
        return ((uint)bytes[0] << 24)
               | ((uint)bytes[1] << 16)
               | ((uint)bytes[2] << 8)
               | bytes[3];
    }

    private static IPAddress FromUInt32(uint value)
    {
        Span<byte> bytes =
        [
            (byte)(value >> 24),
            (byte)(value >> 16),
            (byte)(value >> 8),
            (byte)value,
        ];
        return new IPAddress(bytes);
    }
}
