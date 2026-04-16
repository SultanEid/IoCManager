using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace Backend.Api.Infrastructure;

public sealed record IcmpProbeResult(
    bool Reachable,
    string? Hostname,
    int? Ttl,
    string Status,
    string? Diagnostic);

public interface IIcmpProbe
{
    Task<IcmpProbeResult> ProbeAsync(IPAddress address, TimeSpan timeout, CancellationToken cancellationToken);
}

public sealed class SystemIcmpProbe : IIcmpProbe
{
    public async Task<IcmpProbeResult> ProbeAsync(IPAddress address, TimeSpan timeout, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(address);
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(address, (int)timeout.TotalMilliseconds);
            var reachable = reply.Status == IPStatus.Success;
            var status = reply.Status.ToString();
            return new IcmpProbeResult(
                Reachable: reachable,
                Hostname: reachable ? address.ToString() : null,
                Ttl: reachable ? reply.Options?.Ttl : null,
                Status: status,
                Diagnostic: null);
        }
        catch (Exception ex) when (ex is PingException or SocketException)
        {
            return new IcmpProbeResult(
                Reachable: false,
                Hostname: null,
                Ttl: null,
                Status: "ProbeError",
                Diagnostic: ex.Message);
        }
    }
}
