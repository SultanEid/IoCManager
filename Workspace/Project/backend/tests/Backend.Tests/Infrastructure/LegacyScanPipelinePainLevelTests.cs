using Backend.Api.Infrastructure;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using FluentAssertions;

namespace Backend.Tests.Infrastructure;

public sealed class LegacyScanPipelinePainLevelTests
{
    [Fact]
    public void ResolvePainLevel_YaraFileHash_UsesHashTier()
    {
        var ioc = BuildIoc(
            scannerType: "YARA",
            ruleName: "Known malware file",
            yaraDetail: new LegacyPipelineYaraDetailEntity
            {
                FilePath = @"C:\IOC\dropper.exe",
                FileHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            });

        ResolvePainLevel(ioc).Should().Be("Hash");
    }

    [Fact]
    public void ExtractYaraFileHash_ReadsPayloadHash()
    {
        const string rawPayload = """
            {"rule":"IOCManager_ZombieVM_Mixed_Indicators","file":"C:\\IOC\\ZombieVM\\configs\\bluefin.json","strings":[],"file_hash":"30d82fca708abf90288aef2fc876ff57e90fcb4bd76833f738597d9ca611cef9"}
            """;

        LegacyScanPipelineService.ExtractYaraFileHash(rawPayload)
            .Should()
            .Be("30d82fca708abf90288aef2fc876ff57e90fcb4bd76833f738597d9ca611cef9");
    }

    [Theory]
    [InlineData("""{"level":"High"}""")]
    [InlineData("""{"Level":"High"}""")]
    [InlineData("""{"rule":{"level":"High"}}""")]
    public void ResolveSigmaFindingSeverity_ReadsSigmaRuleLevel(string rawPayload)
    {
        var ioc = BuildIoc(
            scannerType: "SIGMA",
            ruleName: "IOC Manager Test - CMD Marker",
            rawPayload: rawPayload,
            sigmaDetail: new LegacyPipelineSigmaDetailEntity());

        LegacyScanPipelineService.ResolveSigmaFindingSeverity(ioc)
            .Should()
            .Be("High");
    }

    [Fact]
    public void ResolvePainLevel_NetworkSourceOrDestinationIp_UsesIpTier()
    {
        var ioc = BuildIoc(
            scannerType: "SURICATA",
            ruleName: "Outbound connection",
            networkDetail: new LegacyPipelineNetworkDetailEntity
            {
                SourceIP = "10.10.1.25",
                DestIP = "203.0.113.44",
                Protocol = "tcp",
                Severity = "High",
            });

        ResolvePainLevel(ioc).Should().Be("IP");
    }

    [Fact]
    public void ResolvePainLevel_BareDomain_UsesDomainTier()
    {
        var ioc = BuildIoc(
            scannerType: "SIGMA",
            ruleName: "Suspicious DNS lookup",
            rawPayload: "beacon.bad-domain.example");

        ResolvePainLevel(ioc).Should().Be("Domain");
    }

    [Theory]
    [InlineData("http://malicious.example/download/payload.exe")]
    [InlineData(@"C:\Windows\Temp\payload.exe")]
    [InlineData("/tmp/payload.sh")]
    public void ResolvePainLevel_UrlsAndPaths_UseHostArtifactTier(string value)
    {
        var ioc = BuildIoc(scannerType: "CUSTOM", ruleName: "Artifact indicator", rawPayload: value);

        ResolvePainLevel(ioc).Should().Be("HostArtifact");
    }

    [Fact]
    public void ResolvePainLevel_PowerShellCommandLine_UsesHostArtifactTier()
    {
        var ioc = BuildIoc(
            scannerType: "SIGMA",
            ruleName: "Encoded PowerShell behavior",
            sigmaDetail: new LegacyPipelineSigmaDetailEntity
            {
                CommandLine = "powershell -NoProfile -EncodedCommand SQBFAFgA",
                Severity = "High",
            });

        ResolvePainLevel(ioc).Should().Be("HostArtifact");
    }

    [Fact]
    public void ResolvePainLevel_ToolOnlyRow_UsesToolTier()
    {
        var ioc = BuildIoc(scannerType: "SIGMA", ruleName: "Mimikatz credential dumping observed");

        ResolvePainLevel(ioc).Should().Be("Tool");
    }

    [Fact]
    public void ResolvePainLevel_BehaviorOnlyRow_UsesTtpTier()
    {
        var ioc = BuildIoc(scannerType: "SIGMA", ruleName: "ATT&CK T1059 execution technique observed");

        ResolvePainLevel(ioc).Should().Be("Ttp");
    }

    [Fact]
    public void ResolvePainLevel_SigmaIpPayload_IsNotForcedToTtp()
    {
        var ioc = BuildIoc(scannerType: "SIGMA", ruleName: "Suspicious remote host", rawPayload: "198.51.100.25");

        ResolvePainLevel(ioc).Should().Be("IP");
    }

    [Fact]
    public void BuildFindingAlertCandidates_IncludesEverySupportedFinding()
    {
        var target = new LegacyPipelineTargetEntity
        {
            TargetId = 159,
            DisplayName = "Zombie",
            IPAddress = "192.168.207.130",
        };
        var yaraFinding = new LegacyPipelinePersistedIoc(
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            "YARA",
            "Zombie",
            "Windows",
            "IOCManager_ZombieVM_Mixed_Indicators",
            "{}",
            new LegacyPipelinePersistedYaraDetail(@"C:\IOC\bluefin.json", "30d82fca708abf90288aef2fc876ff57e90fcb4bd76833f738597d9ca611cef9"),
            null,
            null);
        var lowNetworkFinding = new LegacyPipelinePersistedIoc(
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            "SURICATA",
            "Zombie",
            "Windows",
            "Low priority network match",
            "{}",
            null,
            null,
            new LegacyPipelinePersistedNetworkDetail("192.168.207.130", "203.0.113.25", "tcp", "Low", 42));

        var candidates = LegacyScanPipelineService.BuildFindingAlertCandidates(target, [yaraFinding, lowNetworkFinding]);

        candidates.Should().HaveCount(2);
        candidates.Should().Contain(candidate => candidate.Ioc.Id == yaraFinding.Id && candidate.Severity == AlertSeverity.Medium);
        candidates.Should().Contain(candidate => candidate.Ioc.Id == lowNetworkFinding.Id && candidate.Severity == AlertSeverity.Low);
    }

    [Fact]
    public void CreateScanAlert_GroupsSupportedFindingsIntoOneCase()
    {
        var target = BuildAlertTarget();
        var firstFinding = new LegacyPipelinePersistedIoc(
            Guid.NewGuid(),
            DateTimeOffset.Parse("2026-04-20T00:00:00Z"),
            "SIGMA",
            "Zombie",
            "Windows",
            "IOCManager_ZombieVM_Mixed_Indicators",
            "{}",
            null,
            new LegacyPipelinePersistedSigmaDetail("process_creation", "Medium", "cmd.exe /c bluefin"),
            null);
        var highSigmaFinding = new LegacyPipelinePersistedIoc(
            Guid.NewGuid(),
            DateTimeOffset.Parse("2026-04-20T00:03:00Z"),
            "SIGMA",
            "Zombie",
            "Windows",
            "Suspicious PowerShell",
            "{}",
            null,
            new LegacyPipelinePersistedSigmaDetail("process_creation", "High", "powershell -nop"),
            null);
        var lowSigmaFinding = new LegacyPipelinePersistedIoc(
            Guid.NewGuid(),
            DateTimeOffset.Parse("2026-04-20T00:01:00Z"),
            "SIGMA",
            "Zombie",
            "Windows",
            "Low priority process match",
            "{}",
            null,
            new LegacyPipelinePersistedSigmaDetail("process_creation", "Low", "whoami.exe"),
            null);
        var candidates = LegacyScanPipelineService.BuildFindingAlertCandidates(
            target,
            [firstFinding, highSigmaFinding, lowSigmaFinding]);

        var alert = LegacyScanPipelineService.CreateScanAlert(
            batchId: null,
            jobId: 44,
            candidates,
            DateTimeOffset.Parse("2026-04-20T00:05:00Z"));

        candidates.Should().HaveCount(3);
        alert.Title.Should().Be("SIGMA findings on Zombie (192.168.207.130) (scan job 44)");
        alert.Severity.Should().Be(AlertSeverity.High);
        alert.RuleName.Should().Be("Multiple rules");
        alert.Summary.Should().Contain("3 IOC finding(s)");
        alert.Summary.Should().Contain("SIGMA");
        alert.Summary.Should().Contain("Highest severity: High");
        alert.Summary.Should().Contain("Suspicious PowerShell");
        alert.FirstDetectedAtUtc.Should().Be(DateTimeOffset.Parse("2026-04-20T00:00:00Z"));
        alert.LastDetectedAtUtc.Should().Be(DateTimeOffset.Parse("2026-04-20T00:03:00Z"));
    }

    [Fact]
    public void CreateScanAlert_OneFindingKeepsRuleName()
    {
        var target = BuildAlertTarget();
        var finding = BuildPersistedYaraIoc("IOCManager_ZombieVM_Mixed_Indicators", DateTimeOffset.Parse("2026-04-20T00:00:00Z"));
        var candidates = LegacyScanPipelineService.BuildFindingAlertCandidates(target, [finding]);

        var alert = LegacyScanPipelineService.CreateScanAlert(
            batchId: null,
            jobId: null,
            candidates,
            DateTimeOffset.Parse("2026-04-20T00:05:00Z"));

        alert.Title.Should().Be("YARA findings on Zombie (192.168.207.130) (scan)");
        alert.RuleName.Should().Be("IOCManager_ZombieVM_Mixed_Indicators");
        alert.Severity.Should().Be(AlertSeverity.Medium);
    }

    [Fact]
    public void CreateScanAlert_MixedFamiliesAndTargetsUsesScanLevelContext()
    {
        var webTarget = BuildAlertTarget();
        var dbTarget = new LegacyPipelineTargetEntity
        {
            TargetId = 160,
            DisplayName = "DB",
            IPAddress = "192.168.207.131",
        };
        var yaraFinding = BuildPersistedYaraIoc("Injected file marker", DateTimeOffset.Parse("2026-04-20T00:00:00Z"));
        var suricataFinding = new LegacyPipelinePersistedIoc(
            Guid.NewGuid(),
            DateTimeOffset.Parse("2026-04-20T00:01:00Z"),
            "SURICATA",
            "DB",
            "Linux",
            "Suspicious network marker",
            "{}",
            null,
            null,
            new LegacyPipelinePersistedNetworkDetail("192.168.207.25", "192.168.207.131", "tcp", "High", 42));
        var candidates = LegacyScanPipelineService.BuildFindingAlertCandidates(webTarget, [yaraFinding])
            .Concat(LegacyScanPipelineService.BuildFindingAlertCandidates(dbTarget, [suricataFinding]))
            .ToArray();

        var alert = LegacyScanPipelineService.CreateScanAlert(
            Guid.Parse("c4ad54fe-45c8-4ef6-8812-1a878863e942"),
            jobId: 44,
            candidates,
            DateTimeOffset.Parse("2026-04-20T00:05:00Z"));

        alert.Title.Should().Be("Mixed scanner findings on Multiple targets (scan c4ad54fe)");
        alert.ScannerFamily.Should().Be("mixed");
        alert.TargetId.Should().BeNull();
        alert.TargetDisplay.Should().Be("Multiple targets");
        alert.RuleName.Should().Be("Multiple rules");
        alert.Summary.Should().Contain("SURICATA");
        alert.Summary.Should().Contain("YARA");
        alert.Summary.Should().Contain("across 2 target(s)");
        alert.Severity.Should().Be(AlertSeverity.High);
    }

    [Fact]
    public void ExcludeLinkedCandidates_SkipsAlreadyLinkedIocs()
    {
        var target = BuildAlertTarget();
        var firstFinding = BuildPersistedYaraIoc("First rule", DateTimeOffset.Parse("2026-04-20T00:00:00Z"));
        var secondFinding = BuildPersistedYaraIoc("Second rule", DateTimeOffset.Parse("2026-04-20T00:01:00Z"));
        var candidates = LegacyScanPipelineService.BuildFindingAlertCandidates(target, [firstFinding, secondFinding]);

        var remaining = LegacyScanPipelineService.ExcludeLinkedCandidates(candidates, new HashSet<Guid> { firstFinding.Id });
        var allLinked = LegacyScanPipelineService.ExcludeLinkedCandidates(
            candidates,
            new HashSet<Guid> { firstFinding.Id, secondFinding.Id });

        remaining.Should().ContainSingle(candidate => candidate.Ioc.Id == secondFinding.Id);
        allLinked.Should().BeEmpty();
    }

    private static string ResolvePainLevel(LegacyPipelineIocEntity ioc)
    {
        var (indicatorValue, indicatorKind) = LegacyScanPipelineService.ResolveIndicator(ioc);
        return LegacyScanPipelineService.ResolvePainLevel(ioc, indicatorValue, indicatorKind);
    }

    private static LegacyPipelineTargetEntity BuildAlertTarget()
        => new()
        {
            TargetId = 159,
            DisplayName = "Zombie",
            IPAddress = "192.168.207.130",
        };

    private static LegacyPipelinePersistedIoc BuildPersistedYaraIoc(string ruleName, DateTimeOffset timestampUtc)
        => new(
            Guid.NewGuid(),
            timestampUtc,
            "YARA",
            "Zombie",
            "Windows",
            ruleName,
            "{}",
            new LegacyPipelinePersistedYaraDetail(@"C:\IOC\bluefin.json", "30d82fca708abf90288aef2fc876ff57e90fcb4bd76833f738597d9ca611cef9"),
            null,
            null);

    private static LegacyPipelineIocEntity BuildIoc(
        string scannerType,
        string ruleName,
        string? rawPayload = null,
        LegacyPipelineYaraDetailEntity? yaraDetail = null,
        LegacyPipelineSigmaDetailEntity? sigmaDetail = null,
        LegacyPipelineNetworkDetailEntity? networkDetail = null)
        => new()
        {
            Id = Guid.NewGuid(),
            TimestampUtc = DateTime.UtcNow,
            ScannerType = scannerType,
            TargetServer = "test-target",
            RuleName = ruleName,
            RawPayload = rawPayload,
            YaraDetail = yaraDetail,
            SigmaDetail = sigmaDetail,
            NetworkDetail = networkDetail,
        };
}
