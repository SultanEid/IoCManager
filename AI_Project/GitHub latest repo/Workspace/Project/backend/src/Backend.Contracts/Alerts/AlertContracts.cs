using Backend.Contracts.Cases;

namespace Backend.Contracts.Alerts;

public sealed record CreateAlertRequest(
    string Title,
    string Summary,
    string Priority,
    string OwnerUserId,
    string ApprovalTierRequired,
    string RequestedByUserId);

public sealed record UpdateAlertStatusRequest(string Status, string ActorUserId);

public sealed record AlertResponse(
    Guid Id,
    string Title,
    string Summary,
    string Priority,
    string Status,
    string OwnerUserId,
    string ApprovalTierRequired,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset UpdatedAtUtc);

public static class AlertContractsMapper
{
    public static AlertResponse ToAlertResponse(this CaseResponse source)
    {
        return new AlertResponse(
            source.Id,
            source.Title,
            source.Summary,
            source.Priority,
            source.Status,
            source.OwnerUserId,
            source.ApprovalTierRequired,
            source.CreatedAtUtc,
            source.UpdatedAtUtc);
    }

    public static CreateCaseRequest ToCreateCaseRequest(this CreateAlertRequest source)
    {
        return new CreateCaseRequest(
            source.Title,
            source.Summary,
            source.Priority,
            source.OwnerUserId,
            source.ApprovalTierRequired,
            source.RequestedByUserId);
    }

    public static UpdateCaseStatusRequest ToUpdateCaseStatusRequest(this UpdateAlertStatusRequest source)
    {
        return new UpdateCaseStatusRequest(source.Status, source.ActorUserId);
    }
}
