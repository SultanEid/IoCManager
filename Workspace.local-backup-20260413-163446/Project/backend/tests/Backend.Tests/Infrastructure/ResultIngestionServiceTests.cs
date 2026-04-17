using System.Text.Json;
using Backend.Api.Infrastructure;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Infrastructure;

public sealed class ResultIngestionServiceTests
{
    [Fact]
    public async Task IngestAsync_DuplicateRows_DeduplicatesAndPreservesProvenance()
    {
        await using var dbContext = CreateDbContext();
        var seeded = await SeedServerAndRuleAsync(dbContext, "yara");
        var service = new ResultIngestionService(dbContext);
        var observedAtUtc = DateTimeOffset.UtcNow;

        var payload = JsonSerializer.SerializeToElement(new
        {
            serverId = seeded.ServerId,
            observedAtUtc,
            ruleRevisionId = seeded.RuleRevisionId,
            disposition = "Detection",
            confidence = 0.92m,
            evidence = new
            {
                filePath = "/tmp/malware.bin",
                match = "evil_string",
            },
        });

        var result = await service.IngestAsync(
            new ResultIngestionBatchRequest(
                Source: "api",
                ActorUserId: "tester",
                Rows:
                [
                    new ResultIngestionInputRow("yara", payload),
                    new ResultIngestionInputRow("yara", payload),
                ]),
            CancellationToken.None);

        result.AcceptedRows.Should().Be(2);
        result.DeduplicatedRows.Should().Be(1);
        result.RejectedRows.Should().Be(0);
        result.Diagnostics.Should().BeEmpty();

        var canonical = await dbContext.ScanResults.SingleAsync();
        canonical.OccurrenceCount.Should().Be(2);
        canonical.ScannerFamily.Should().Be("yara");
        canonical.RuleRevisionId.Should().Be(seeded.RuleRevisionId);
        canonical.TargetServerId.Should().Be(seeded.ServerId);

        var provenanceRows = await dbContext.ScanResultProvenances
            .Where(x => x.ScanResultId == canonical.Id)
            .ToArrayAsync();
        provenanceRows.Should().HaveCount(2);
        provenanceRows.Count(x => x.IsDuplicate).Should().Be(1);
    }

    [Fact]
    public async Task IngestAsync_InvalidGuid_RejectsRowAndPersistsDiagnostic()
    {
        await using var dbContext = CreateDbContext();
        var seeded = await SeedServerAndRuleAsync(dbContext, "yara");
        var service = new ResultIngestionService(dbContext);

        var payload = JsonSerializer.SerializeToElement(new
        {
            serverId = "not-a-guid",
            observedAtUtc = DateTimeOffset.UtcNow,
            ruleRevisionId = seeded.RuleRevisionId,
            disposition = "Detection",
            confidence = 0.5m,
            evidence = "x",
        });

        var result = await service.IngestAsync(
            new ResultIngestionBatchRequest(
                Source: "api",
                ActorUserId: "tester",
                Rows: [new ResultIngestionInputRow("yara", payload)]),
            CancellationToken.None);

        result.AcceptedRows.Should().Be(0);
        result.RejectedRows.Should().Be(1);
        result.Diagnostics.Should().ContainSingle();
        result.Diagnostics[0].Code.Should().Be("invalid_guid");
        result.Diagnostics[0].Field.Should().Be("serverId");

        (await dbContext.ScanResultIngestionDiagnostics.CountAsync()).Should().Be(1);
        (await dbContext.ScanResults.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task IngestAsync_SigmaAliasFields_NormalizesAndResolvesRuleByName()
    {
        await using var dbContext = CreateDbContext();
        var seeded = await SeedServerAndRuleAsync(dbContext, "sigma", artifactName: "sigma-rule-login-anomaly");
        var service = new ResultIngestionService(dbContext);
        var observedAtUtc = DateTimeOffset.UtcNow;

        var payload = JsonSerializer.SerializeToElement(new
        {
            targetServerId = seeded.ServerId,
            timeGenerated = observedAtUtc,
            title = "sigma-rule-login-anomaly",
            disposition = "alert",
            score = "0.81",
            eventData = new
            {
                process = "powershell.exe",
                commandLine = "EncodedCommand ...",
            },
        });

        var result = await service.IngestAsync(
            new ResultIngestionBatchRequest(
                Source: "api",
                ActorUserId: "tester",
                Rows: [new ResultIngestionInputRow("sigma", payload)]),
            CancellationToken.None);

        result.AcceptedRows.Should().Be(1);
        result.RejectedRows.Should().Be(0);

        var row = await dbContext.ScanResults.SingleAsync();
        row.ScannerFamily.Should().Be("sigma");
        row.RuleRevisionId.Should().Be(seeded.RuleRevisionId);
        row.Disposition.Should().Be(ScanResultDisposition.Detection);
        row.Confidence.Should().Be(0.81m);
    }

    private static CtiDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CtiDbContext>()
            .UseInMemoryDatabase($"result-ingestion-tests-{Guid.NewGuid():N}")
            .Options;
        return new CtiDbContext(options);
    }

    private static async Task<SeededContext> SeedServerAndRuleAsync(
        CtiDbContext dbContext,
        string family,
        string? artifactName = null)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var actor = "test";

        var network = Network.Create($"net-{Guid.NewGuid():N}", "10.15.0.0/16", "test", actor, nowUtc);
        var subnet = Subnet.Create(network.Id, $"subnet-{Guid.NewGuid():N}", "10.15.1.0/24", "10.15.1.1", actor, nowUtc);
        var server = TargetServer.Create(
            subnet.Id,
            hostname: $"srv-{Guid.NewGuid():N}",
            ipAddress: $"10.15.1.{Random.Shared.Next(10, 220)}",
            operatingSystem: "Linux",
            environment: "lab",
            actorUserId: actor,
            nowUtc: nowUtc);

        dbContext.Networks.Add(network);
        dbContext.Subnets.Add(subnet);
        dbContext.TargetServers.Add(server);

        var artifact = RuleArtifact.CreateRepository(
            name: artifactName ?? $"rule-{family}-{Guid.NewGuid():N}",
            ruleFamily: family,
            source: "tests",
            description: "test",
            tags: [],
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
            originalContent: "rule sample { condition: true }",
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

        await dbContext.SaveChangesAsync();
        return new SeededContext(server.Id, revision.Id);
    }

    private sealed record SeededContext(Guid ServerId, Guid RuleRevisionId);
}
