using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Backend.Api.Infrastructure;

public interface IAiAdjudicationQueue
{
    ValueTask EnqueueAsync(Guid adjudicationId, CancellationToken cancellationToken = default);
    ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken);
}

public sealed class AiAdjudicationQueue : IAiAdjudicationQueue
{
    private readonly Channel<Guid> _channel;
    private readonly ConcurrentDictionary<Guid, byte> _scheduledIds = new();

    public AiAdjudicationQueue()
    {
        _channel = Channel.CreateUnbounded<Guid>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
        });
    }

    public ValueTask EnqueueAsync(Guid adjudicationId, CancellationToken cancellationToken = default)
    {
        if (adjudicationId == Guid.Empty)
        {
            throw new ArgumentException("Adjudication id is required.", nameof(adjudicationId));
        }

        if (!_scheduledIds.TryAdd(adjudicationId, 0))
        {
            return ValueTask.CompletedTask;
        }

        return _channel.Writer.WriteAsync(adjudicationId, cancellationToken);
    }

    public async ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken)
    {
        var adjudicationId = await _channel.Reader.ReadAsync(cancellationToken);
        _scheduledIds.TryRemove(adjudicationId, out _);
        return adjudicationId;
    }
}
