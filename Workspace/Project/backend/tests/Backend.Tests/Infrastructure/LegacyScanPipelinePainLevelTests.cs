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

    private static string ResolvePainLevel(LegacyPipelineIocEntity ioc)
    {
        var (indicatorValue, indicatorKind) = LegacyScanPipelineService.ResolveIndicator(ioc);
        return LegacyScanPipelineService.ResolvePainLevel(ioc, indicatorValue, indicatorKind);
    }

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
