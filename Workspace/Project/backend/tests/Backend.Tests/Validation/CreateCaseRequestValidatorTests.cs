using Backend.Application.Validation;
using Backend.Contracts.Cases;
using FluentAssertions;

namespace Backend.Tests.Validation;

public sealed class CreateCaseRequestValidatorTests
{
    [Fact]
    public void Validate_ReturnsError_WhenPriorityIsInvalid()
    {
        var validator = new CreateCaseRequestValidator();
        var request = new CreateCaseRequest(
            Title: "Case A",
            Summary: "Summary",
            Priority: "UrgentPlus",
            OwnerUserId: "analyst-1",
            ApprovalTierRequired: "Lead",
            RequestedByUserId: "analyst-1");

        var result = validator.Validate(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(x => x.PropertyName == nameof(CreateCaseRequest.Priority));
    }
}
