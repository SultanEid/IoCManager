using Backend.Api.Infrastructure;
using FluentAssertions;

namespace Backend.Tests.Infrastructure.Discovery;

public sealed class DiscoveryTargetRangeParserTests
{
    private static readonly DiscoveryExecutionOptions DiscoveryOptions = new()
    {
        TimeoutMilliseconds = 750,
        MaxParallelism = 8,
        MaxHostsPerRun = 256,
    };

    [Fact]
    public void Parse_FullSubnet_UsesHostRange()
    {
        var parser = new DiscoveryTargetRangeParser(Microsoft.Extensions.Options.Options.Create(DiscoveryOptions));

        var result = parser.Parse("10.20.30.0/30", null, null);

        result.RequestedCidr.Should().Be("10.20.30.0/30");
        result.RangeStartIp.Should().BeNull();
        result.RangeEndIp.Should().BeNull();
        result.Targets.Select(x => x.ToString()).Should().Equal("10.20.30.1", "10.20.30.2");
    }

    [Fact]
    public void Parse_BoundedRangeWithinSubnet_ReturnsRequestedRange()
    {
        var parser = new DiscoveryTargetRangeParser(Microsoft.Extensions.Options.Options.Create(DiscoveryOptions));

        var result = parser.Parse("192.168.10.0/24", "192.168.10.40", "192.168.10.42");

        result.RangeStartIp.Should().Be("192.168.10.40");
        result.RangeEndIp.Should().Be("192.168.10.42");
        result.Targets.Select(x => x.ToString()).Should().Equal("192.168.10.40", "192.168.10.41", "192.168.10.42");
    }

    [Fact]
    public void Parse_InvalidRangeInputs_AreRejected()
    {
        var parser = new DiscoveryTargetRangeParser(Microsoft.Extensions.Options.Options.Create(DiscoveryOptions));

        var invalidIp = () => parser.Parse("10.10.1.0/24", "10.10.1.999", "10.10.1.100");
        var reversed = () => parser.Parse("10.10.1.0/24", "10.10.1.50", "10.10.1.40");
        var outOfSubnet = () => parser.Parse("10.10.1.0/24", "10.10.2.5", "10.10.2.10");
        var nonPrivate = () => parser.Parse("8.8.8.0/24", null, null);
        var tooManyHosts = () => parser.Parse("10.10.0.0/23", null, null);

        invalidIp.Should().Throw<ArgumentException>();
        reversed.Should().Throw<ArgumentException>();
        outOfSubnet.Should().Throw<ArgumentException>();
        nonPrivate.Should().Throw<ArgumentException>();
        tooManyHosts.Should().Throw<ArgumentException>();
    }
}
