using Backend.Domain.Common;
using Backend.Domain.Rules;
using FluentAssertions;

namespace Backend.Tests.Domain;

public sealed class RuleFamilyNormalizationTests
{
    [Fact]
    public void Catalog_ExposesOnlyPdfScopeFamilies()
    {
        RuleFamilyCatalog.SupportedFamilies.Should().BeEquivalentTo(["yara", "sigma", "snort", "suricata"], options => options.WithStrictOrdering());
    }

    [Fact]
    public void Catalog_AcceptsCanonicalSuricata()
    {
        RuleFamilyCatalog.TryNormalize("suricata", out var normalized).Should().BeTrue();
        normalized.Should().Be("suricata");
    }

    [Fact]
    public void RuleRecord_Create_PersistsCanonicalSuricata()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 15, 00, 00, 00, TimeSpan.Zero);
        var record = RuleRecord.Create(
            Guid.NewGuid(),
            "Legacy Signature",
            "suricata",
            "alert tls any any -> any any (msg:\"legacy\"; sid:1;)",
            "v1",
            "migration-test",
            "analyst-1",
            [],
            null,
            null,
            0.71m,
            0.20m,
            "Unspecified",
            "fingerprint",
            "analyst-1",
            nowUtc);

        record.RuleFamily.Should().Be("suricata");
    }
}
