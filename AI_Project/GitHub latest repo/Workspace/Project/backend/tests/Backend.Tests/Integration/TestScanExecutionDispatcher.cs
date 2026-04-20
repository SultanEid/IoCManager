using System.Collections.Concurrent;
using Backend.Api.Infrastructure;
using Backend.Domain.IocManager;

namespace Backend.Tests.Integration;

public sealed class TestScanExecutionDispatcher : IScanExecutionDispatcher
{
    private readonly ConcurrentDictionary<Guid, ConcurrentQueue<ScanExecutionDispatchResult>> _responsesByServerId = new();

    public void Reset()
    {
        _responsesByServerId.Clear();
    }

    public void SetSequence(Guid targetServerId, params ScanExecutionDispatchResult[] results)
    {
        _responsesByServerId[targetServerId] = new ConcurrentQueue<ScanExecutionDispatchResult>(results);
    }

    public Task<ScanExecutionDispatchResult> DispatchAsync(
        ScanJob scanJob,
        ScanJobTargetExecution targetExecution,
        TargetServer targetServer,
        Scanner scanner,
        TargetServerScannerAssignment assignment,
        ScannerCapability capability,
        TargetServerConnectionSecret? connectionSecret,
        IReadOnlyList<RuleRevision> effectiveRules,
        CancellationToken cancellationToken)
    {
        _ = scanJob;
        _ = targetExecution;
        _ = scanner;
        _ = assignment;
        _ = connectionSecret;
        _ = effectiveRules;
        _ = cancellationToken;

        if (capability == ScannerCapability.Sigma)
        {
            return Task.FromResult(new ScanExecutionDispatchResult(
                Status: ScanJobTargetExecutionStatus.Failed,
                Summary: "Sigma execution contract is defined, but runtime execution is not available in lab v1.",
                ErrorMessage: "Sigma execution contract is defined, but runtime execution is not available in lab v1.",
                CorrelationId: null,
                RawOutput: null,
                ResultFiles: [],
                Findings: []));
        }

        if (targetServer.ConnectionProtocol != ConnectionProtocol.Agent)
        {
            return Task.FromResult(new ScanExecutionDispatchResult(
                Status: ScanJobTargetExecutionStatus.Failed,
                Summary: "Only Agent protocol is executable for scan dispatch in lab v1.",
                ErrorMessage: "Only Agent protocol is executable for scan dispatch in lab v1.",
                CorrelationId: null,
                RawOutput: null,
                ResultFiles: [],
                Findings: []));
        }

        if (_responsesByServerId.TryGetValue(targetServer.Id, out var queue)
            && queue.TryDequeue(out var scripted))
        {
            return Task.FromResult(scripted);
        }

        return Task.FromResult(new ScanExecutionDispatchResult(
            Status: ScanJobTargetExecutionStatus.Completed,
            Summary: "Stubbed scan execution succeeded.",
            ErrorMessage: null,
            CorrelationId: "stub-correlation",
            RawOutput: "{\"status\":\"ok\"}",
            ResultFiles: [],
            Findings: []));
    }
}
