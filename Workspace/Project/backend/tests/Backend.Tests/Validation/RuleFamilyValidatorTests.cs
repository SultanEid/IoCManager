using Backend.Application.Validation;
using Backend.Contracts.RuleLifecycle;
using Backend.Contracts.Rules;
using Backend.Contracts.V2;
using FluentAssertions;

namespace Backend.Tests.Validation;

public sealed class RuleFamilyValidatorTests
{
    [Fact]
    public void CreateRuleValidator_AcceptsLegacySuricataAlias()
    {
        var validator = new CreateRuleRequestValidator();
        var request = new CreateRuleRequest(
            Guid.NewGuid(),
            "Legacy Network Signature",
            "suricata",
            "alert tls any any -> any any (msg:\"legacy\"; sid:1;)",
            "v1",
            "analyst-1");

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateRuleProposalValidator_RejectsUnsupportedFamily()
    {
        var validator = new CreateRuleProposalRequestValidator();
        var request = new CreateRuleProposalRequest(
            Guid.NewGuid(),
            "Contain suspicious chain",
            "elastic",
            "title: test\ndetection:\n  selection:\n    test: true\n  condition: selection",
            "v1",
            "analyst-1",
            "Test rationale",
            0.25m);

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(x => x.PropertyName == nameof(CreateRuleProposalRequest.RuleFamily));
    }

    [Fact]
    public void CreateRuleProposalValidator_AcceptsCanonicalLoki()
    {
        var validator = new CreateRuleProposalRequestValidator();
        var request = new CreateRuleProposalRequest(
            Guid.NewGuid(),
            "Contain suspicious chain",
            "suricata",
            "alert tls any any -> any any (msg:\"test\"; sid:1;)",
            "v1",
            "analyst-1",
            "Test rationale",
            0.25m);

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CreateRuleArtifactValidator_AcceptsCanonicalSuricata()
    {
        var validator = new CreateRuleArtifactRequestValidator();
        var request = new CreateRuleArtifactRequest(
            "Suricata Burst Detector",
            "suricata",
            "IOC detector",
            "lead-1");

        var result = validator.Validate(request);

        result.IsValid.Should().BeTrue();
    }
}
