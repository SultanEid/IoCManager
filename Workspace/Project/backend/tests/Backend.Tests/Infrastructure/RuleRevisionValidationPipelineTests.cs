using Backend.Api.Infrastructure;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests.Infrastructure;

public sealed class RuleRevisionValidationPipelineTests
{
    [Fact]
    public async Task ValidateAsync_ReturnsBlockingErrors_ForInvalidSyntaxAndMetadata()
    {
        using var dbContext = CreateDbContext();
        var pipeline = new RuleRevisionValidationPipeline(dbContext);

        var result = await pipeline.ValidateAsync(
            CreateRequest(
                ruleFamily: "yara",
                originalContent: string.Empty,
                name: string.Empty,
                source: string.Empty,
                severity: string.Empty,
                status: string.Empty,
                versionLabel: string.Empty,
                tags: []),
            CancellationToken.None);

        result.CanPersist.Should().BeFalse();
        result.HasBlockingPersistenceErrors().Should().BeTrue();
        result.Stages.Single(x => x.Stage == "syntax").Diagnostics.Should().Contain(x => x.Severity == "error");
        result.Stages.Single(x => x.Stage == "metadata").Diagnostics.Should().Contain(x => x.Severity == "error");
    }

    [Fact]
    public async Task ValidateAsync_LeavesPersistenceTrue_WhenOnlyReadinessWarningsExist()
    {
        using var dbContext = CreateDbContext();
        var pipeline = new RuleRevisionValidationPipeline(dbContext);

        var result = await pipeline.ValidateAsync(
            CreateRequest(ruleFamily: "sigma", originalContent: "title: test\ndetection:\n  condition: selection"),
            CancellationToken.None);

        result.CanPersist.Should().BeTrue();
        result.IsDeploymentReady.Should().BeFalse();
        result.HasBlockingPersistenceErrors().Should().BeFalse();
        result.Stages.Single(x => x.Stage == "deployment_readiness").Diagnostics.Should().Contain(x => x.Severity == "warning");
    }

    [Fact]
    public async Task ValidateAsync_MarksDeploymentReady_WhenCapabilityHealthyAndAssigned()
    {
        using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var scanner = Scanner.Create("scanner-yara-1", "yara", "4.0.0", "lead.ops", now);
        var scannerId = scanner.Id;

        dbContext.Scanners.Add(scanner);
        dbContext.ScannerCapabilityBindings.Add(
            ScannerCapabilityBinding.Create(scannerId, ScannerCapability.Yara, "lead.ops", now));
        dbContext.TargetServerScannerAssignments.Add(
            TargetServerScannerAssignment.Create(
                targetServerId: Guid.NewGuid(),
                scannerId: scannerId,
                connectivityStatus: ConnectivityStatus.Online,
                lastHeartbeatUtc: now,
                lastContactUtc: now,
                isEnabled: true,
                actorUserId: "lead.ops",
                nowUtc: now));
        await dbContext.SaveChangesAsync();

        var pipeline = new RuleRevisionValidationPipeline(dbContext);
        var result = await pipeline.ValidateAsync(
            CreateRequest(ruleFamily: "yara", originalContent: "rule test { condition: true }"),
            CancellationToken.None);

        result.CanPersist.Should().BeTrue();
        result.IsDeploymentReady.Should().BeTrue();
        result.Stages.Single(x => x.Stage == "deployment_readiness").Passed.Should().BeTrue();
        result.Stages.Single(x => x.Stage == "deployment_readiness").Diagnostics.Should().Contain(x => x.Code == "readiness.ready");
    }

    [Fact]
    public async Task ValidateAsync_ReportsUnhealthyScanner_WhenCapabilityExistsButHealthIsNotHealthy()
    {
        using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var scanner = Scanner.Create("scanner-sigma-1", "sigma", "2.0.0", "lead.ops", now);
        scanner.Heartbeat(ScannerHealthStatus.Offline, "lead.ops", now.AddMinutes(1));

        dbContext.Scanners.Add(scanner);
        dbContext.ScannerCapabilityBindings.Add(
            ScannerCapabilityBinding.Create(scanner.Id, ScannerCapability.Sigma, "lead.ops", now));
        await dbContext.SaveChangesAsync();

        var pipeline = new RuleRevisionValidationPipeline(dbContext);
        var result = await pipeline.ValidateAsync(
            CreateRequest(ruleFamily: "sigma", originalContent: "title: test\ndetection:\n  condition: selection"),
            CancellationToken.None);

        result.IsDeploymentReady.Should().BeFalse();
        result.Stages.Single(x => x.Stage == "deployment_readiness").Diagnostics.Should()
            .Contain(x => x.Code == "readiness.scanner.none_healthy" && x.Severity == "warning");
    }

    [Fact]
    public async Task ValidateAsync_ReportsMissingAssignments_WhenCapabilityIsHealthyButUnassigned()
    {
        using var dbContext = CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var scanner = Scanner.Create("scanner-suricata-1", "suricata", "1.0.0", "lead.ops", now);

        dbContext.Scanners.Add(scanner);
        dbContext.ScannerCapabilityBindings.Add(
            ScannerCapabilityBinding.Create(scanner.Id, ScannerCapability.Suricata, "lead.ops", now));
        await dbContext.SaveChangesAsync();

        var pipeline = new RuleRevisionValidationPipeline(dbContext);
        var result = await pipeline.ValidateAsync(
            CreateRequest(ruleFamily: "suricata", originalContent: "alert tls any any -> any any (msg:\"test\"; sid:1;)"),
            CancellationToken.None);

        result.IsDeploymentReady.Should().BeFalse();
        result.Stages.Single(x => x.Stage == "deployment_readiness").Diagnostics.Should()
            .Contain(x => x.Code == "readiness.assignment.none_enabled" && x.Severity == "warning");
    }

    [Fact]
    public async Task ValidateAsync_ReportsLimitedSyntaxCapability_WhenEngineValidationUnavailable()
    {
        using var dbContext = CreateDbContext();
        var pipeline = new RuleRevisionValidationPipeline(dbContext);

        var result = await pipeline.ValidateAsync(
            CreateRequest(ruleFamily: "snort", originalContent: "alert tcp any any -> any any (sid:1;)"),
            CancellationToken.None);

        var syntax = result.Stages.Single(x => x.Stage == "syntax");
        syntax.CapabilityDepth.Should().Be("heuristic");
        syntax.Limitation.Should().NotBeNullOrWhiteSpace();
        syntax.Diagnostics.Should().Contain(x => x.Code == "syntax.engine_validation.unavailable" && x.Severity == "note");
    }

    [Fact]
    public async Task ValidateAsync_UsesNotAvailableDepth_ForUnsupportedFamily()
    {
        using var dbContext = CreateDbContext();
        var pipeline = new RuleRevisionValidationPipeline(dbContext);

        var result = await pipeline.ValidateAsync(
            CreateRequest(ruleFamily: "elastic", originalContent: "alert ..."),
            CancellationToken.None);

        result.CanPersist.Should().BeFalse();
        result.IsDeploymentReady.Should().BeFalse();

        var syntax = result.Stages.Single(x => x.Stage == "syntax");
        syntax.CapabilityDepth.Should().Be("not_available");
        syntax.Diagnostics.Should().Contain(x => x.Code == "syntax.family.unsupported" && x.Severity == "error");
    }

    private static CtiDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CtiDbContext>()
            .UseInMemoryDatabase($"validation-pipeline-{Guid.NewGuid():N}")
            .Options;

        return new CtiDbContext(options);
    }

    private static RuleValidationPipelineRequest CreateRequest(
        string ruleFamily,
        string originalContent,
        string name = "Sample Rule",
        string source = "manual",
        string severity = "medium",
        string status = "draft",
        RuleScopeType scopeType = RuleScopeType.Global,
        string? scopeValue = null,
        string versionLabel = "v1",
        IReadOnlyList<string>? tags = null)
    {
        return new RuleValidationPipelineRequest(
            RuleFamily: ruleFamily,
            OriginalContent: originalContent,
            Name: name,
            Source: source,
            Severity: severity,
            Status: status,
            ScopeType: scopeType,
            ScopeValue: scopeValue,
            VersionLabel: versionLabel,
            Tags: tags ?? ["tag-1"],
            FileName: null,
            ActorUserId: "lead.ops");
    }
}
