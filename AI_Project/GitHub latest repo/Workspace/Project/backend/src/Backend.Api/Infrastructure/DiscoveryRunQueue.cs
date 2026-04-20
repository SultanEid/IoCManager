using System.Threading.Channels;

namespace Backend.Api.Infrastructure;

public interface IDiscoveryRunQueue
{
    ValueTask EnqueueAsync(Guid runId, CancellationToken cancellationToken = default);
    ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken);
}

public sealed class DiscoveryRunQueue : IDiscoveryRunQueue
{
    private readonly Channel<Guid> _channel;

    public DiscoveryRunQueue()
    {
        _channel = Channel.CreateUnbounded<Guid>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
        });
    }

    public ValueTask EnqueueAsync(Guid runId, CancellationToken cancellationToken = default)
    {
        if (runId == Guid.Empty)
        {
            throw new ArgumentException("Discovery run id is required.", nameof(runId));
        }

        return _channel.Writer.WriteAsync(runId, cancellationToken);
    }

    public ValueTask<Guid> DequeueAsync(CancellationToken cancellationToken)
    {
        return _channel.Reader.ReadAsync(cancellationToken);
    }
}
