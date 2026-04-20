namespace Backend.Contracts.Evidence;

public sealed record AddEvidenceRequest(
    Guid CaseId,
    string EvidenceType,
    string SourceSystem,
    string ContentHash,
    string PayloadJson,
    decimal Confidence,
    DateTimeOffset CollectedAtUtc,
    string ActorUserId);

public sealed record EvidenceResponse(
    Guid Id,
    Guid CaseId,
    string EvidenceType,
    string SourceSystem,
    string ContentHash,
    decimal Confidence,
    DateTimeOffset CollectedAtUtc,
    DateTimeOffset CreatedAtUtc);
