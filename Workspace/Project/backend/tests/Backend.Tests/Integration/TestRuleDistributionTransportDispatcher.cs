using System.Collections.Concurrent;
using Backend.Api.Infrastructure;
using Backend.Domain.IocManager;

namespace Backend.Tests.Integration;

public sealed class TestRuleDistributionTransportDispatcher : IRuleDistributionTransportDispatcher
{
    private readonly ConcurrentDictionary<Guid, ConcurrentQueue<RuleDistributionDispatchResult>> _responsesByServerId = new();

    public void Reset()
    {
        _responsesByServerId.Clear();
    }

    public void SetSequence(Guid targetServerId, params RuleDistributionDispatchResult[] results)
    {
        var queue = new ConcurrentQueue<RuleDistributionDispatchResult>(results);
        _responsesByServerId[targetServerId] = queue;
    }

    public Task<RuleDistributionDispatchResult> DispatchAsync(
        TargetServer targetServer,
        TargetServerConnectionSecret? connectionSecret,
        RuleArtifact ruleArtifact,
        RuleRevision ruleRevision,
        RuleDistributionJob job,
        RuleDistributionAttempt attempt,
        RuleDistributionTarget target,
        CancellationToken cancellationToken)
    {
        _ = connectionSecret;
        _ = ruleArtifact;
        _ = ruleRevision;
        _ = job;
        _ = attempt;
        _ = target;
        _ = cancellationToken;

        if (targetServer.ConnectionProtocol is not (ConnectionProtocol.Ssh or ConnectionProtocol.Agent))
        {
            return Task.FromResult(new RuleDistributionDispatchResult(
                Status: RuleDistributionTargetStatus.ValidationFailed,
                IsRetryable: false,
                Transport: "test-stub",
                Diagnostic: "Unsupported protocol for stubbed distribution.",
                RemoteCorrelationId: null));
        }

        if (_responsesByServerId.TryGetValue(targetServer.Id, out var queue)
            && queue.TryDequeue(out var scripted))
        {
            return Task.FromResult(scripted);
        }

        return Task.FromResult(new RuleDistributionDispatchResult(
            Status: RuleDistributionTargetStatus.Success,
            IsRetryable: false,
            Transport: "test-stub",
            Diagnostic: "Stubbed success.",
            RemoteCorrelationId: null));
    }
}
