using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Backend.Api.Infrastructure;

public interface IScanJobQueue
{
    ValueTask EnqueueAsync(Guid scanJobId, CancellationToken cancellationToken = default);
    ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken);
}

public sealed class ScanJobQueue : IScanJobQueue
{
    private readonly Channel<Guid> _channel;
    private readonly ConcurrentDictionary<Guid, byte> _scheduledIds = new();

    public ScanJobQueue()
    {
        _channel = Channel.CreateUnbounded<Guid>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
        });
    }

    public ValueTask EnqueueAsync(Guid scanJobId, CancellationToken cancellationToken = default)
    {
        if (scanJobId == Guid.Empty)
        {
            throw new ArgumentException("Scan job id is required.", nameof(scanJobId));
        }

        if (!_scheduledIds.TryAdd(scanJobId, 0))
        {
            return ValueTask.CompletedTask;
        }

        return _channel.Writer.WriteAsync(scanJobId, cancellationToken);
    }

    public async ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken)
    {
        var scanJobId = await _channel.Reader.ReadAsync(cancellationToken);
        _scheduledIds.TryRemove(scanJobId, out _);
        return scanJobId;
    }
}
