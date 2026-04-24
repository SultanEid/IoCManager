using Backend.Api.Infrastructure;
using System.Collections.Concurrent;
using System.Net;

namespace Backend.Tests.Integration;

public sealed class TestIcmpProbe : IIcmpProbe
{
    private readonly ConcurrentDictionary<string, IcmpProbeResult> _responses = new(StringComparer.OrdinalIgnoreCase);

    public void Reset()
    {
        _responses.Clear();
    }

    public void SetReachable(string ipAddress, string? hostname = null)
    {
        _responses[ipAddress] = new IcmpProbeResult(
            Reachable: true,
            Hostname: hostname ?? ipAddress,
            Ttl: null,
            Status: "Success",
            Diagnostic: null);
    }

    public void SetUnreachable(string ipAddress, string? diagnostic = null)
    {
        _responses[ipAddress] = new IcmpProbeResult(
            Reachable: false,
            Hostname: null,
            Ttl: null,
            Status: "TimedOut",
            Diagnostic: diagnostic);
    }

    public Task<IcmpProbeResult> ProbeAsync(IPAddress address, TimeSpan timeout, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var key = address.ToString();
        if (_responses.TryGetValue(key, out var configured))
        {
            return Task.FromResult(configured);
        }

        return Task.FromResult(new IcmpProbeResult(
            Reachable: false,
            Hostname: null,
            Ttl: null,
            Status: "TimedOut",
            Diagnostic: $"No test probe response configured for {key}."));
    }
}
