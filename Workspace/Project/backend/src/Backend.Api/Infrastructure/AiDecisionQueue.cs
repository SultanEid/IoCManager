using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Backend.Api.Infrastructure;

public interface IAiDecisionQueue
{
    ValueTask EnqueueAsync(Guid decisionId, CancellationToken cancellationToken = default);
    ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken);
}

public sealed class AiDecisionQueue : IAiDecisionQueue
{
    private readonly Channel<Guid> _channel;
    private readonly ConcurrentDictionary<Guid, byte> _scheduledIds = new();

    public AiDecisionQueue()
    {
        _channel = Channel.CreateUnbounded<Guid>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
        });
    }

    public ValueTask EnqueueAsync(Guid decisionId, CancellationToken cancellationToken = default)
    {
        if (decisionId == Guid.Empty)
        {
            throw new ArgumentException("Decision id is required.", nameof(decisionId));
        }

        if (!_scheduledIds.TryAdd(decisionId, 0))
        {
            return ValueTask.CompletedTask;
        }

        return _channel.Writer.WriteAsync(decisionId, cancellationToken);
    }

    public async ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken)
    {
        var decisionId = await _channel.Reader.ReadAsync(cancellationToken);
        _scheduledIds.TryRemove(decisionId, out _);
        return decisionId;
    }
}

