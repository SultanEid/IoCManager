using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.Reports;
using Backend.Domain.Cti.V1.Persistence;
using Backend.Domain.Evidence;
using Backend.Domain.Reports;

namespace Backend.Application.Services;

public sealed class ReportIngestionService : IReportIngestionService
{
    private const decimal AcceptedThreshold = 0.60m;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ICasesRepository _casesRepository;
    private readonly IEvidenceRepository _evidenceRepository;
    private readonly IReportIngestionRepository _reportIngestionRepository;
    private readonly IAiReportExtractionClient _aiReportExtractionClient;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;

    public ReportIngestionService(
        ICasesRepository casesRepository,
        IEvidenceRepository evidenceRepository,
        IReportIngestionRepository reportIngestionRepository,
        IAiReportExtractionClient aiReportExtractionClient,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider)
    {
        _casesRepository = casesRepository;
        _evidenceRepository = evidenceRepository;
        _reportIngestionRepository = reportIngestionRepository;
        _aiReportExtractionClient = aiReportExtractionClient;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<ReportIngestionResponse> IngestAsync(
        IngestReportRequest request,
        byte[]? uploadedFileBytes,
        string? uploadedFileName,
        string? uploadedContentType,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var nowUtc = _dateTimeProvider.UtcNow;
        var sourceType = NormalizeSourceType(request.SourceType);
        ValidatePayload(sourceType, request, uploadedFileBytes);

        var caseRecord = await _casesRepository.GetByIdAsync(request.CaseId, cancellationToken);
        if (caseRecord is null)
        {
            throw new NotFoundException($"Case {request.CaseId} was not found.");
        }

        await _reportIngestionRepository.EnsureCtiCaseExistsAsync(caseRecord, request.ActorUserId, nowUtc, cancellationToken);

        CtiDecisionBundleLookup? decisionBundle = null;
        if (request.DecisionBundleId.HasValue)
        {
            decisionBundle = await _reportIngestionRepository.GetDecisionBundleAsync(request.DecisionBundleId.Value, cancellationToken);
            if (decisionBundle is null)
            {
                throw new NotFoundException($"Decision bundle {request.DecisionBundleId.Value} was not found.");
            }

            if (decisionBundle.CaseId != request.CaseId)
            {
                throw new ArgumentException("Decision bundle does not belong to the provided case.", nameof(request.DecisionBundleId));
            }
        }

        var documentId = ResolveDocumentId(request.DocumentId, uploadedFileName, nowUtc);
        var bulletinJson = NormalizeBulletinJson(request.BulletinJson);
        var normalizedDocumentText = ResolveDocumentText(sourceType, request.DocumentText, uploadedFileBytes);
        var documentBytesBase64 = sourceType == "pdf" && uploadedFileBytes is not null
            ? Convert.ToBase64String(uploadedFileBytes)
            : null;
        var aiRequest = new AiReportExtractionRequest(
            SourceName: request.SourceName.Trim(),
            SourceType: sourceType,
            DocumentId: documentId,
            DocumentUrl: NormalizeOptional(request.DocumentUrl),
            DocumentText: normalizedDocumentText,
            DocumentBytesBase64: documentBytesBase64,
            BulletinJson: bulletinJson,
            EnableLlmFallback: request.EnableLlmFallback,
            IngestionTimeUtc: nowUtc);

        var aiResult = await _aiReportExtractionClient.ExtractAsync(aiRequest, cancellationToken);
        var inputPayloadJson = JsonSerializer.Serialize(
            new
            {
                request.CaseId,
                request.DecisionBundleId,
                request.SourceName,
                sourceType,
                documentId,
                request.DocumentUrl,
                documentText = normalizedDocumentText,
                bulletinJson,
                uploadedFileName,
                uploadedContentType,
                uploadedFileSizeBytes = uploadedFileBytes?.Length ?? 0,
                request.EnableLlmFallback,
                requestedAtUtc = nowUtc,
            },
            JsonOptions);

        var run = ReportIngestionRun.Create(
            caseId: request.CaseId,
            decisionBundleId: request.DecisionBundleId,
            reportId: aiResult.ReportId,
            sourceName: request.SourceName,
            sourceType: sourceType,
            documentId: documentId,
            documentUrl: request.DocumentUrl,
            humanReviewRequired: aiResult.HumanReviewRequired,
            weakEvidenceDetected: aiResult.WeakEvidenceDetected,
            processedAtUtc: aiResult.ProcessedAtUtc,
            inputPayloadJson: inputPayloadJson,
            outputPayloadJson: aiResult.OutputPayloadJson,
            actorUserId: request.ActorUserId,
            nowUtc: nowUtc);

        var reliability = await _reportIngestionRepository.GetOrCreateSourceReliabilityProfileAsync(
            request.SourceName,
            request.ActorUserId,
            nowUtc,
            cancellationToken);

        var assertions = new List<CtiEvidenceAssertion>();
        var claimRows = new List<ReportIngestionClaim>(aiResult.Claims.Count);
        var decisionEvidenceReferences = new List<CtiDecisionEvidenceReference>();
        foreach (var claim in aiResult.Claims)
        {
            var isAccepted = IsAcceptedClaim(claim);
            CtiEvidenceAssertion? assertion = null;
            if (isAccepted)
            {
                var observedAt = aiResult.ProcessedAtUtc;
                if (decisionBundle is not null && observedAt > decisionBundle.DecidedAtUtc)
                {
                    observedAt = decisionBundle.DecidedAtUtc;
                }

                assertion = CtiEvidenceAssertion.Create(
                    caseId: request.CaseId,
                    sourceReliabilityProfileId: reliability.Id,
                    evidenceReference: BuildEvidenceReference(run.Id, claim.ClaimId),
                    assertionType: Truncate(claim.ClaimType, 100),
                    statement: Truncate(claim.Statement, 4000),
                    confidence: Math.Clamp(claim.Confidence, 0m, 1m),
                    isConflicting: false,
                    sourceReference: Truncate($"report:{documentId}", 200),
                    observedAtUtc: observedAt,
                    actorUserId: request.ActorUserId,
                    nowUtc: nowUtc);

                assertions.Add(assertion);
                if (decisionBundle is not null)
                {
                    decisionEvidenceReferences.Add(
                        CtiDecisionEvidenceReference.Create(
                            decisionBundle.DecisionId,
                            assertion.Id,
                            decisionBundle.DecidedAtUtc));
                }
            }

            claimRows.Add(
                ReportIngestionClaim.Create(
                    ingestionRunId: run.Id,
                    evidenceAssertionId: assertion?.Id,
                    claimId: claim.ClaimId,
                    claimType: claim.ClaimType,
                    statement: claim.Statement,
                    snippet: claim.Snippet,
                    sourceStartOffset: claim.SourceStartOffset,
                    sourceEndOffset: claim.SourceEndOffset,
                    pageIndex: claim.PageIndex,
                    extractionMethod: claim.ExtractionMethod,
                    confidence: Math.Clamp(claim.Confidence, 0m, 1m),
                    isAccepted: isAccepted,
                    isPromptInjectionSuspected: claim.IsPromptInjectionSuspected,
                    abstainReasonCodesJson: claim.AbstainReasonCodesJson,
                    citationsJson: claim.CitationsJson,
                    actorUserId: request.ActorUserId,
                    nowUtc: nowUtc));
        }

        await _reportIngestionRepository.AddReportIngestionRunAsync(run, cancellationToken);
        await _reportIngestionRepository.AddReportIngestionClaimsAsync(claimRows, cancellationToken);
        await _reportIngestionRepository.AddEvidenceAssertionsAsync(assertions, cancellationToken);
        await _reportIngestionRepository.AddDecisionEvidenceReferencesAsync(decisionEvidenceReferences, cancellationToken);

        var evidencePayloadJson = JsonSerializer.Serialize(
            new
            {
                ingestionId = run.Id,
                run.ReportId,
                run.SourceName,
                run.SourceType,
                run.DocumentId,
                run.DocumentUrl,
                run.HumanReviewRequired,
                run.WeakEvidenceDetected,
                run.ProcessedAtUtc,
                inputPayload = ParseJsonObjectOrRaw(run.InputPayloadJson),
                outputPayload = ParseJsonObjectOrRaw(aiResult.OutputPayloadJson),
            },
            JsonOptions);

        var evidence = EvidenceItem.Create(
            caseId: request.CaseId,
            evidenceType: $"report_ingestion_{sourceType}",
            sourceSystem: request.SourceName,
            contentHash: ComputeSha256(evidencePayloadJson),
            payloadJson: evidencePayloadJson,
            confidence: CalculateEvidenceConfidence(aiResult.Claims),
            collectedAtUtc: aiResult.ProcessedAtUtc,
            actorUserId: request.ActorUserId,
            nowUtc: nowUtc);

        await _evidenceRepository.AddAsync(evidence, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var acceptedClaims = claimRows.Count(x => x.IsAccepted);
        return new ReportIngestionResponse(
            IngestionId: run.Id,
            CaseId: run.CaseId,
            DecisionBundleId: run.DecisionBundleId,
            ReportId: run.ReportId,
            SourceName: run.SourceName,
            SourceType: run.SourceType,
            HumanReviewRequired: run.HumanReviewRequired,
            WeakEvidenceDetected: run.WeakEvidenceDetected,
            AcceptedClaims: acceptedClaims,
            AbstainedClaims: claimRows.Count - acceptedClaims,
            ProcessedAtUtc: run.ProcessedAtUtc,
            CreatedAtUtc: run.CreatedAtUtc);
    }

    public async Task<ReportIngestionDetailResponse?> GetAsync(Guid ingestionId, CancellationToken cancellationToken)
    {
        var run = await _reportIngestionRepository.GetRunByIdAsync(ingestionId, cancellationToken);
        if (run is null)
        {
            return null;
        }

        var claims = await _reportIngestionRepository.ListClaimsByRunIdAsync(ingestionId, cancellationToken);
        var responseClaims = claims
            .OrderBy(x => x.CreatedAtUtc)
            .Select(x => new ReportIngestionClaimResponse(
                Id: x.Id,
                IngestionRunId: x.IngestionRunId,
                EvidenceAssertionId: x.EvidenceAssertionId,
                ClaimId: x.ClaimId,
                ClaimType: x.ClaimType,
                Statement: x.Statement,
                Snippet: x.Snippet,
                SourceStartOffset: x.SourceStartOffset,
                SourceEndOffset: x.SourceEndOffset,
                PageIndex: x.PageIndex,
                ExtractionMethod: x.ExtractionMethod,
                Confidence: x.Confidence,
                IsAccepted: x.IsAccepted,
                IsPromptInjectionSuspected: x.IsPromptInjectionSuspected,
                AbstainReasonCodesJson: x.AbstainReasonCodesJson,
                CitationsJson: x.CitationsJson,
                AbstainReasonCodes: ParseStringArray(x.AbstainReasonCodesJson),
                Citations: ParseCitations(x.CitationsJson),
                CreatedAtUtc: x.CreatedAtUtc))
            .ToArray();

        return new ReportIngestionDetailResponse(
            IngestionId: run.Id,
            CaseId: run.CaseId,
            DecisionBundleId: run.DecisionBundleId,
            ReportId: run.ReportId,
            SourceName: run.SourceName,
            SourceType: run.SourceType,
            DocumentId: run.DocumentId,
            DocumentUrl: run.DocumentUrl,
            HumanReviewRequired: run.HumanReviewRequired,
            WeakEvidenceDetected: run.WeakEvidenceDetected,
            InputPayloadJson: run.InputPayloadJson,
            OutputPayloadJson: run.OutputPayloadJson,
            ProcessedAtUtc: run.ProcessedAtUtc,
            CreatedAtUtc: run.CreatedAtUtc,
            Claims: responseClaims);
    }

    private static string NormalizeSourceType(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();
        return normalized switch
        {
            "pdf" => "pdf",
            "blog" => "blog",
            "bulletin" => "bulletin",
            _ => throw new ArgumentException("SourceType must be one of: pdf, blog, bulletin.", nameof(value)),
        };
    }

    private static void ValidatePayload(string sourceType, IngestReportRequest request, byte[]? fileBytes)
    {
        if (request.CaseId == Guid.Empty)
        {
            throw new ArgumentException("CaseId is required.", nameof(request.CaseId));
        }

        if (string.IsNullOrWhiteSpace(request.ActorUserId))
        {
            throw new ArgumentException("ActorUserId is required.", nameof(request.ActorUserId));
        }

        if (string.IsNullOrWhiteSpace(request.SourceName))
        {
            throw new ArgumentException("SourceName is required.", nameof(request.SourceName));
        }

        switch (sourceType)
        {
            case "pdf":
                if ((fileBytes is null || fileBytes.Length == 0) && string.IsNullOrWhiteSpace(request.DocumentText))
                {
                    throw new ArgumentException("PDF ingestion requires an uploaded file or document text.");
                }
                break;
            case "blog":
                if (string.IsNullOrWhiteSpace(request.DocumentText) && (fileBytes is null || fileBytes.Length == 0))
                {
                    throw new ArgumentException("Blog ingestion requires text content or uploaded file.");
                }
                break;
            case "bulletin":
                if (string.IsNullOrWhiteSpace(request.BulletinJson) && string.IsNullOrWhiteSpace(request.DocumentText))
                {
                    throw new ArgumentException("Bulletin ingestion requires bulletin JSON or text.");
                }
                break;
        }
    }

    private static string ResolveDocumentId(string? requestedDocumentId, string? uploadedFileName, DateTimeOffset nowUtc)
    {
        if (!string.IsNullOrWhiteSpace(requestedDocumentId))
        {
            return requestedDocumentId.Trim();
        }

        if (!string.IsNullOrWhiteSpace(uploadedFileName))
        {
            return $"upload-{nowUtc:yyyyMMddHHmmss}-{uploadedFileName.Trim()}";
        }

        return $"doc-{nowUtc:yyyyMMddHHmmssfff}";
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static string? NormalizeBulletinJson(string? bulletinJson)
    {
        if (string.IsNullOrWhiteSpace(bulletinJson))
        {
            return null;
        }

        using var parsed = JsonDocument.Parse(bulletinJson);
        return parsed.RootElement.GetRawText();
    }

    private static string? ResolveDocumentText(string sourceType, string? providedText, byte[]? uploadedFileBytes)
    {
        var normalizedProvided = NormalizeOptional(providedText);
        if (!string.IsNullOrWhiteSpace(normalizedProvided))
        {
            return normalizedProvided;
        }

        if (sourceType != "blog" || uploadedFileBytes is null || uploadedFileBytes.Length == 0)
        {
            return normalizedProvided;
        }

        try
        {
            var decoded = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true)
                .GetString(uploadedFileBytes)
                .Trim();
            return string.IsNullOrWhiteSpace(decoded) ? null : decoded;
        }
        catch (DecoderFallbackException)
        {
            throw new ArgumentException("Blog ingestion file must be UTF-8 encoded text.");
        }
    }

    private static bool IsAcceptedClaim(AiReportExtractedClaim claim)
    {
        if (claim.ExtractionMethod.Equals("abstained", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return claim.Confidence >= AcceptedThreshold;
    }

    private static string BuildEvidenceReference(Guid ingestionId, string claimId)
    {
        var claimHash = ComputeSha256(claimId).Substring(0, 24);
        return $"ing:{ingestionId:N}:{claimHash}";
    }

    private static string Truncate(string value, int maxLength)
    {
        if (value.Length <= maxLength)
        {
            return value;
        }

        return value[..maxLength];
    }

    private static string ComputeSha256(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes);
    }

    private static decimal CalculateEvidenceConfidence(IReadOnlyList<AiReportExtractedClaim> claims)
    {
        var accepted = claims.Where(IsAcceptedClaim).ToArray();
        if (accepted.Length == 0)
        {
            return 0.35m;
        }

        var average = accepted.Average(x => x.Confidence);
        return Math.Clamp(average, 0m, 1m);
    }

    private static IReadOnlyList<string> ParseStringArray(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return Array.Empty<string>();
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<string[]>(json, JsonOptions);
            return parsed ?? Array.Empty<string>();
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    private static IReadOnlyList<ReportIngestionCitationResponse> ParseCitations(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return Array.Empty<ReportIngestionCitationResponse>();
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<ReportIngestionCitationResponse[]>(json, JsonOptions);
            return parsed ?? Array.Empty<ReportIngestionCitationResponse>();
        }
        catch (JsonException)
        {
            return Array.Empty<ReportIngestionCitationResponse>();
        }
    }

    private static object ParseJsonObjectOrRaw(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return string.Empty;
        }

        try
        {
            using var parsed = JsonDocument.Parse(json);
            return parsed.RootElement.Clone();
        }
        catch (JsonException)
        {
            return json;
        }
    }
}
