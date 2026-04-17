using Backend.Api.Infrastructure;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Tests.Integration;

public sealed class ScanExecutionWorkerPersistenceTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private readonly TestWebApplicationFactory _factory;

    public ScanExecutionWorkerPersistenceTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task ProcessScanJob_SuccessfulDispatch_CreatesJobAttemptAndPersistsEvidence()
    {
        var scenario = await SeedQueuedScanJobAsync(ScannerCapability.Yara);
        _factory.GetScanExecutionDispatcher().SetSequence(
            scenario.TargetServerId,
            new ScanExecutionDispatchResult(
                Status: ScanJobTargetExecutionStatus.Completed,
                Summary: "Connector execution succeeded.",
                ErrorMessage: null,
                CorrelationId: "corr-success-1",
                RawOutput: "{\"matches\":1}",
                ResultFiles:
                [
                    new ScanExecutionResultFile("output.json", "/tmp/output.json", 128, "abc123")
                ],
                Findings:
                [
                    new ScanExecutionDispatchFinding(
                        RuleRevisionId: scenario.RuleRevisionId,
                        IocId: null,
                        Disposition: ScanResultDisposition.Detection,
                        Confidence: 0.93m,
                        EvidenceJson: "{\"indicator\":\"malicious.example\"}")
                ]));

        await EnqueueAsync(scenario.ScanJobId);
        var completedJob = await WaitForScanJobCompletionAsync(scenario.ScanJobId);

        completedJob.Status.Should().Be(ScanJobStatus.Completed);
        completedJob.StartedAtUtc.Should().NotBeNull();
        completedJob.CompletedAtUtc.Should().NotBeNull();

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var target = await dbContext.ScanJobTargetExecutions
            .AsNoTracking()
            .SingleAsync(x => x.ScanJobId == scenario.ScanJobId && x.TargetServerId == scenario.TargetServerId);
        target.Status.Should().Be(ScanJobTargetExecutionStatus.Completed);
        target.StartedAtUtc.Should().NotBeNull();
        target.CompletedAtUtc.Should().NotBeNull();
        target.ErrorMessage.Should().BeNull();

        var attempt = await dbContext.JobAttempts
            .AsNoTracking()
            .SingleAsync(x => x.ScanJobId == scenario.ScanJobId);
        attempt.Status.Should().Be(JobAttemptStatus.Succeeded);
        attempt.CompletedAtUtc.Should().NotBeNull();

        var results = await dbContext.ScanResults
            .AsNoTracking()
            .Where(x => x.JobAttemptId == attempt.Id && x.TargetServerId == scenario.TargetServerId)
            .ToArrayAsync();
        results.Should().HaveCountGreaterThanOrEqualTo(2);
        results.Should().Contain(x => x.Disposition == ScanResultDisposition.Detection && x.Confidence == 0.93m);
        results.Should().Contain(x => x.EvidenceJson.Contains("scan_execution_artifact", StringComparison.Ordinal));

        var ingestionRuns = await dbContext.ScanResultIngestionRuns
            .AsNoTracking()
            .ToArrayAsync();
        ingestionRuns.Should().HaveCountGreaterThanOrEqualTo(1);

        var provenanceCount = await dbContext.ScanResultProvenances
            .AsNoTracking()
            .CountAsync();
        provenanceCount.Should().BeGreaterThanOrEqualTo(2);
    }

    [Fact]
    public async Task ProcessScanJob_FailedDispatch_RecordsFailureReasonAndAttemptFailure()
    {
        var scenario = await SeedQueuedScanJobAsync(ScannerCapability.Snort);
        _factory.GetScanExecutionDispatcher().SetSequence(
            scenario.TargetServerId,
            new ScanExecutionDispatchResult(
                Status: ScanJobTargetExecutionStatus.Failed,
                Summary: "Connector unreachable while dispatching scan.",
                ErrorMessage: "Connector unreachable while dispatching scan.",
                CorrelationId: "corr-failure-1",
                RawOutput: null,
                ResultFiles: [],
                Findings: []));

        await EnqueueAsync(scenario.ScanJobId);
        var completedJob = await WaitForScanJobCompletionAsync(scenario.ScanJobId);
        completedJob.Status.Should().Be(ScanJobStatus.Failed);

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var target = await dbContext.ScanJobTargetExecutions
            .AsNoTracking()
            .SingleAsync(x => x.ScanJobId == scenario.ScanJobId && x.TargetServerId == scenario.TargetServerId);
        target.Status.Should().Be(ScanJobTargetExecutionStatus.Failed);
        target.StartedAtUtc.Should().NotBeNull();
        target.CompletedAtUtc.Should().NotBeNull();
        target.ErrorMessage.Should().Contain("Connector unreachable");

        var attempt = await dbContext.JobAttempts
            .AsNoTracking()
            .SingleAsync(x => x.ScanJobId == scenario.ScanJobId);
        attempt.Status.Should().Be(JobAttemptStatus.Failed);
        attempt.CompletedAtUtc.Should().NotBeNull();

        var evidenceRows = await dbContext.ScanResults
            .AsNoTracking()
            .Where(x => x.JobAttemptId == attempt.Id)
            .ToArrayAsync();
        evidenceRows.Should().HaveCountGreaterThanOrEqualTo(1);
        evidenceRows.Should().Contain(x => x.EvidenceJson.Contains("Connector unreachable", StringComparison.Ordinal));
    }

    [Fact]
    public async Task ProcessScanJob_SigmaFailure_DoesNotBreakExecutableFamilies()
    {
        var sigmaScenario = await SeedQueuedScanJobAsync(ScannerCapability.Sigma);
        var yaraScenario = await SeedQueuedScanJobAsync(ScannerCapability.Yara);

        _factory.GetScanExecutionDispatcher().SetSequence(
            yaraScenario.TargetServerId,
            new ScanExecutionDispatchResult(
                Status: ScanJobTargetExecutionStatus.Completed,
                Summary: "Yara completed.",
                ErrorMessage: null,
                CorrelationId: "corr-yara",
                RawOutput: "{\"matches\":0}",
                ResultFiles: [],
                Findings: []));

        await EnqueueAsync(sigmaScenario.ScanJobId);
        await EnqueueAsync(yaraScenario.ScanJobId);

        var sigmaJob = await WaitForScanJobCompletionAsync(sigmaScenario.ScanJobId);
        var yaraJob = await WaitForScanJobCompletionAsync(yaraScenario.ScanJobId);

        sigmaJob.Status.Should().Be(ScanJobStatus.Failed);
        yaraJob.Status.Should().Be(ScanJobStatus.Completed);

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var sigmaTarget = await dbContext.ScanJobTargetExecutions
            .AsNoTracking()
            .SingleAsync(x => x.ScanJobId == sigmaScenario.ScanJobId);
        var yaraTarget = await dbContext.ScanJobTargetExecutions
            .AsNoTracking()
            .SingleAsync(x => x.ScanJobId == yaraScenario.ScanJobId);

        sigmaTarget.Status.Should().Be(ScanJobTargetExecutionStatus.Failed);
        sigmaTarget.ErrorMessage.Should().Contain("Sigma execution contract");
        yaraTarget.Status.Should().Be(ScanJobTargetExecutionStatus.Completed);
        yaraTarget.ErrorMessage.Should().BeNull();
    }

    private async Task EnqueueAsync(Guid scanJobId)
    {
        var queue = _factory.Services.GetRequiredService<IScanJobQueue>();
        await queue.EnqueueAsync(scanJobId, CancellationToken.None);
    }

    private async Task<ScanJob> WaitForScanJobCompletionAsync(Guid scanJobId)
    {
        var deadline = DateTimeOffset.UtcNow.AddSeconds(20);
        while (DateTimeOffset.UtcNow < deadline)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
            var job = await dbContext.ScanJobs
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == scanJobId);
            job.Should().NotBeNull();
            if (job!.Status is not (ScanJobStatus.Queued or ScanJobStatus.Running))
            {
                return job;
            }

            await Task.Delay(120);
        }

        throw new TimeoutException($"Timed out waiting for scan job {scanJobId} to complete.");
    }

    private async Task<QueuedScenario> SeedQueuedScanJobAsync(ScannerCapability capability)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var protector = scope.ServiceProvider.GetRequiredService<TargetServerConnectionSecretProtector>();
        var nowUtc = DateTimeOffset.UtcNow;
        var actor = "integration-scan-worker";
        var hostOctet = 10 + await dbContext.TargetServers.CountAsync();

        var network = Network.Create($"net-{Guid.NewGuid():N}", "10.200.0.0/16", "integration", actor, nowUtc);
        var subnet = Subnet.Create(network.Id, $"subnet-{Guid.NewGuid():N}", "10.200.1.0/24", "10.200.1.1", actor, nowUtc);
        dbContext.Networks.Add(network);
        dbContext.Subnets.Add(subnet);

        var targetServer = TargetServer.Create(
            subnetId: subnet.Id,
            hostname: $"srv-{Guid.NewGuid():N}",
            ipAddress: $"10.200.1.{hostOctet}",
            operatingSystem: "Linux",
            environment: "lab",
            actorUserId: actor,
            nowUtc: nowUtc,
            connectionProtocol: ConnectionProtocol.Agent,
            connectionHost: "connector.lab.local",
            connectionPort: 8100,
            connectionAuthMode: ConnectionAuthMode.Token,
            connectionUsername: "svc_scan");
        targetServer.UpdateStatus(TargetServerStatus.Active, actor, nowUtc);
        targetServer.UpdateConnectivity(ConnectivityStatus.Online, nowUtc, nowUtc, actor, nowUtc);
        dbContext.TargetServers.Add(targetServer);

        var scanner = Scanner.Create(
            name: $"scanner-{Guid.NewGuid():N}",
            engineType: capability.ToString().ToLowerInvariant(),
            version: "1.0.0",
            actorUserId: actor,
            nowUtc: nowUtc);
        scanner.Heartbeat(ScannerHealthStatus.Healthy, actor, nowUtc);
        dbContext.Scanners.Add(scanner);
        dbContext.ScannerCapabilityBindings.Add(ScannerCapabilityBinding.Create(scanner.Id, capability, actor, nowUtc));
        dbContext.TargetServerScannerAssignments.Add(
            TargetServerScannerAssignment.Create(
                targetServer.Id,
                scanner.Id,
                ConnectivityStatus.Online,
                nowUtc,
                nowUtc,
                isEnabled: true,
                actorUserId: actor,
                nowUtc: nowUtc));

        var ruleFamily = ResolveRuleFamily(capability);
        var artifact = RuleArtifact.CreateRepository(
            name: $"rule-{Guid.NewGuid():N}",
            ruleFamily: ruleFamily,
            source: "integration",
            description: "integration scan rule",
            tags: ["integration"],
            severity: "medium",
            lifecycleStatus: "approved",
            scopeType: RuleScopeType.Global,
            scopeValue: null,
            actorUserId: actor,
            nowUtc: nowUtc);
        var revisionNumber = artifact.ReserveNextRevision("v1", actor, nowUtc);
        var revision = RuleRevision.CreateRepository(
            ruleArtifactId: artifact.Id,
            revisionNumber: revisionNumber,
            versionLabel: "v1",
            originalContent: "rule integration_scan { condition: true }",
            metadataJson: "{}",
            changeType: "created",
            changeReason: null,
            lifecycleStatus: "approved",
            validationResultJson: "{}",
            canPersistValidation: true,
            isDeploymentReady: true,
            validatedAtUtc: nowUtc,
            actorUserId: actor,
            nowUtc: nowUtc);
        dbContext.RuleArtifacts.Add(artifact);
        dbContext.RuleRevisionsV2.Add(revision);

        var plan = ScanPlan.Create(
            name: $"plan-{Guid.NewGuid():N}",
            description: "integration plan",
            scannerCapability: capability,
            ruleSelectionMode: ScanRuleSelectionMode.RuleSet,
            ruleScopeType: null,
            ruleScopeValue: null,
            cadenceType: ScanCadenceType.Manual,
            intervalMinutes: null,
            runAtHourUtc: null,
            runAtMinuteUtc: null,
            weeklyDayOfWeek: null,
            operatorNotes: "integration",
            status: ScanPlanStatus.Active,
            actorUserId: actor,
            nowUtc: nowUtc);
        dbContext.ScanPlans.Add(plan);
        dbContext.ScanPlanTargetServers.Add(ScanPlanTargetServer.Create(plan.Id, targetServer.Id, actor, nowUtc));
        dbContext.ScanPlanRuleRevisions.Add(ScanPlanRuleRevision.Create(plan.Id, revision.Id, actor, nowUtc));

        var scanJob = ScanJob.Queue(plan.Id, "Manual", actor, nowUtc);
        dbContext.ScanJobs.Add(scanJob);
        dbContext.ScanJobTargetExecutions.Add(
            ScanJobTargetExecution.QueueSnapshot(
                scanJob.Id,
                targetServer.Id,
                targetServer.Hostname,
                targetServer.IpAddress,
                actor,
                nowUtc));

        var encryptedPayload = protector.Protect("{\"agent\":{\"endpointUrl\":\"http://connector.lab.local/api/v1/scans/execute\",\"token\":\"integration-token\"}}");
        dbContext.TargetServerConnectionSecrets.Add(
            TargetServerConnectionSecret.Create(targetServer.Id, encryptedPayload, actor, nowUtc));

        await dbContext.SaveChangesAsync();
        return new QueuedScenario(scanJob.Id, targetServer.Id, revision.Id);
    }

    private static string ResolveRuleFamily(ScannerCapability capability)
    {
        return capability switch
        {
            ScannerCapability.Yara => "yara",
            ScannerCapability.Sigma => "sigma",
            ScannerCapability.Snort => "snort",
            ScannerCapability.Suricata => "suricata",
            _ => throw new ArgumentOutOfRangeException(nameof(capability), capability, "Unsupported capability"),
        };
    }

    private sealed record QueuedScenario(Guid ScanJobId, Guid TargetServerId, Guid RuleRevisionId);
}
