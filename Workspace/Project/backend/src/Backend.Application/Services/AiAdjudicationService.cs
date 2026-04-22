using System.Globalization;
using System.Text;
using System.Text.Json;
using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.V2;
using Backend.Domain.AiAdjudication;

namespace Backend.Application.Services;

public sealed class AiAdjudicationService : IAiAdjudicationService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IAiAdjudicationRepository _repository;
    private readonly IAiAdjudicationOrchestrator _orchestrator;

    public AiAdjudicationService(
        IAiAdjudicationRepository repository,
        IAiAdjudicationOrchestrator orchestrator)
    {
        _repository = repository;
        _orchestrator = orchestrator;
    }

    public async Task<SubmitAdjudicationAcceptedDto> SubmitAsync(SubmitAdjudicationRequestDto request, CancellationToken cancellationToken)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        Guid? detectionRecordId = Guid.TryParse(request.DetectionId, out var parsedDetectionId) ? parsedDetectionId : null;
        var row = AiAdjudicationRequest.Queue(
            caseId: request.CaseId,
            detectionId: request.DetectionId,
            detectionRecordId: detectionRecordId,
            iocType: request.IocType,
            iocValue: request.IocValue,
            observedAtUtc: request.ObservedAtUtc,
            detectionPackageJson: request.DetectionPackage.GetRawText(),
            submittedByUserId: request.SubmittedByUserId,
            submittedAtUtc: nowUtc);

        await _repository.AddRequestAsync(row, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        await _orchestrator.EnqueueAsync(row.Id, cancellationToken);

        return new SubmitAdjudicationAcceptedDto(
            AdjudicationId: row.Id,
            Status: row.Status.ToString(),
            SubmittedAtUtc: row.SubmittedAtUtc,
            Links: BuildLinks(row.Id));
    }

    public async Task<IocLatestDecisionDto?> GetLatestResultByIocAsync(Guid iocId, CancellationToken cancellationToken)
    {
        var reference = await _repository.GetLatestDecisionReferenceByIocAsync(iocId, cancellationToken);
        reference ??= await _repository.GetLatestDecisionReferenceByLegacyIocAsync(iocId, cancellationToken);
        if (reference is null)
        {
            return null;
        }

        var result = await GetResultAsync(reference.AdjudicationRequestId, cancellationToken);
        if (result is null)
        {
            return null;
        }

        return new IocLatestDecisionDto(
            IocId: reference.IocId,
            DetectionId: reference.DetectionId,
            Result: result);
    }

    public async Task<AdjudicationResultDto?> GetLatestResultByDetectionAsync(Guid detectionId, CancellationToken cancellationToken)
    {
        var request = await _repository.GetLatestRequestByDetectionAsync(detectionId.ToString("D"), cancellationToken);
        if (request is null)
        {
            return null;
        }

        return await GetResultAsync(request.Id, cancellationToken);
    }

    public async Task<AdjudicationResultDto?> GetResultAsync(Guid adjudicationId, CancellationToken cancellationToken)
    {
        var request = await _repository.GetRequestAsync(adjudicationId, asTracking: false, cancellationToken);
        if (request is null)
        {
            return null;
        }

        var result = await _repository.GetResultAsync(adjudicationId, asTracking: false, cancellationToken);
        var explanation = await _repository.GetExplanationAsync(adjudicationId, asTracking: false, cancellationToken);
        var actionPlan = await _repository.GetActionPlanAsync(adjudicationId, asTracking: false, cancellationToken);
        var similarSlice = await _repository.ListSimilarDetectionsAsync(adjudicationId, skip: 0, take: 1, cancellationToken);
        var evidenceSlice = await _repository.ListEvidenceSourcesAsync(adjudicationId, skip: 0, take: 1, cancellationToken);

        return new AdjudicationResultDto(
            AdjudicationId: request.Id,
            Status: request.Status.ToString(),
            SubmittedAtUtc: request.SubmittedAtUtc,
            StartedAtUtc: request.StartedAtUtc,
            CompletedAtUtc: request.CompletedAtUtc,
            FailureCode: request.FailureCode,
            FailureMessage: request.FailureMessage,
            ModelVersion: request.ModelVersion,
            DatasetVersion: request.DatasetVersion,
            Decision: result is null ? null : ToDecisionDto(result),
            ExplanationAvailable: explanation is not null,
            ActionPlanAvailable: actionPlan is not null,
            SimilarDetectionsAvailable: similarSlice.Items.Count > 0,
            EvidenceSourcesAvailable: evidenceSlice.Items.Count > 0);
    }

    public async Task<ExplanationDetailDto?> GetExplanationAsync(Guid adjudicationId, CancellationToken cancellationToken)
    {
        var request = await _repository.GetRequestAsync(adjudicationId, asTracking: false, cancellationToken);
        if (request is null)
        {
            return null;
        }

        var explanation = await _repository.GetExplanationAsync(adjudicationId, asTracking: false, cancellationToken);
        if (explanation is null)
        {
            return new ExplanationDetailDto(
                AdjudicationId: adjudicationId,
                Status: request.Status.ToString(),
                Summary: null,
                DecisionState: null,
                RecommendedAction: null,
                Rationale: Array.Empty<string>(),
                Citations: Array.Empty<ExplanationCitationDto>(),
                NextBestEvidence: Array.Empty<string>(),
                PolicyVersion: null,
                ModelVersion: request.ModelVersion,
                DatasetVersion: request.DatasetVersion,
                GeneratedAtUtc: null,
                Raw: null,
                PhrasingDiagnostics: null);
        }

        var raw = ParseJsonElement(explanation.RawPayloadJson);

        return new ExplanationDetailDto(
            AdjudicationId: adjudicationId,
            Status: request.Status.ToString(),
            Summary: explanation.Summary,
            DecisionState: explanation.DecisionState,
            RecommendedAction: explanation.RecommendedAction,
            Rationale: ParseStringArray(explanation.RationaleJson),
            Citations: ParseCitations(explanation.CitationsJson),
            NextBestEvidence: ParseStringArray(explanation.NextBestEvidenceJson),
            PolicyVersion: explanation.PolicyVersion,
            ModelVersion: explanation.ModelVersion,
            DatasetVersion: explanation.DatasetVersion,
            GeneratedAtUtc: explanation.GeneratedAtUtc,
            Raw: raw,
            PhrasingDiagnostics: ParseExplanationPhrasingDiagnostics(raw));
    }

    public async Task<RecommendedActionPlanDto?> GetActionPlanAsync(Guid adjudicationId, CancellationToken cancellationToken)
    {
        var request = await _repository.GetRequestAsync(adjudicationId, asTracking: false, cancellationToken);
        if (request is null)
        {
            return null;
        }

        var plan = await _repository.GetActionPlanAsync(adjudicationId, asTracking: false, cancellationToken);
        if (plan is null)
        {
            return new RecommendedActionPlanDto(
                AdjudicationId: adjudicationId,
                Status: request.Status.ToString(),
                Summary: null,
                RecommendedActions: Array.Empty<RecommendedActionDto>(),
                Prerequisites: Array.Empty<string>(),
                Cautions: Array.Empty<string>(),
                NeverAutoExecutes: null,
                PolicyConstrained: null,
                EvidenceBased: null,
                GeneratedAtUtc: null,
                Raw: null,
                PhrasingDiagnostics: null);
        }

        var raw = ParseJsonElement(plan.RawPayloadJson);

        return new RecommendedActionPlanDto(
            AdjudicationId: adjudicationId,
            Status: request.Status.ToString(),
            Summary: plan.Summary,
            RecommendedActions: ParseRecommendedActions(plan.RecommendedActionsJson),
            Prerequisites: ParseStringArray(plan.PrerequisitesJson),
            Cautions: ParseStringArray(plan.CautionsJson),
            NeverAutoExecutes: plan.NeverAutoExecutes,
            PolicyConstrained: plan.PolicyConstrained,
            EvidenceBased: plan.EvidenceBased,
            GeneratedAtUtc: plan.GeneratedAtUtc,
            Raw: raw,
            PhrasingDiagnostics: ParseActionPlanPhrasingDiagnostics(raw));
    }

    public async Task<OverrideOrClosureResponseDto> SubmitOverrideOrClosureAsync(
        Guid adjudicationId,
        OverrideOrClosureRequestDto request,
        CancellationToken cancellationToken)
    {
        var row = await _repository.GetRequestAsync(adjudicationId, asTracking: true, cancellationToken);
        if (row is null)
        {
            throw new NotFoundException($"Decision {adjudicationId} was not found.");
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var actionType = string.Equals(request.ActionType, "Close", StringComparison.OrdinalIgnoreCase)
            ? AiAnalystActionType.Close
            : string.Equals(request.ActionType, "Override", StringComparison.OrdinalIgnoreCase)
                ? AiAnalystActionType.Override
                : throw new ArgumentException("ActionType must be Override or Close.", nameof(request.ActionType));
        var previousStatus = row.Status.ToString();
        var isFinal = request.IsFinal ?? actionType == AiAnalystActionType.Close;

        row.ApplyAnalystAction(
            actionType,
            actorUserId: request.SubmittedByUserId,
            nowUtc: nowUtc,
            failureMessage: request.Reason);

        var item = AiAdjudicationOverride.Create(
            adjudicationRequestId: adjudicationId,
            actionType: actionType,
            reason: request.Reason,
            notes: request.Notes,
            overrideVerdict: request.OverrideVerdict,
            closureDisposition: request.ClosureDisposition,
            isFinal: isFinal,
            previousStatus: previousStatus,
            newStatus: row.Status.ToString(),
            submittedByUserId: request.SubmittedByUserId,
            submittedAtUtc: nowUtc);

        await _repository.AddOverrideAsync(item, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return new OverrideOrClosureResponseDto(
            AdjudicationId: adjudicationId,
            OverrideId: item.Id,
            ActionType: actionType.ToString(),
            PreviousStatus: previousStatus,
            NewStatus: row.Status.ToString(),
            Reason: item.Reason,
            Notes: item.Notes,
            OverrideVerdict: item.OverrideVerdict,
            ClosureDisposition: item.ClosureDisposition,
            IsFinal: item.IsFinal,
            SubmittedByUserId: item.SubmittedByUserId,
            SubmittedAtUtc: item.SubmittedAtUtc);
    }

    public async Task<SimilarDetectionsResponseDto?> GetSimilarDetectionsAsync(
        Guid adjudicationId,
        int limit,
        string? cursor,
        CancellationToken cancellationToken)
    {
        var row = await _repository.GetRequestAsync(adjudicationId, asTracking: false, cancellationToken);
        if (row is null)
        {
            return null;
        }

        var boundedLimit = Math.Clamp(limit, 1, 100);
        var offset = ParseCursor(cursor);
        var slice = await _repository.ListSimilarDetectionsAsync(adjudicationId, offset, boundedLimit, cancellationToken);
        var nextCursor = slice.HasMore ? EncodeCursor(offset + boundedLimit) : null;

        return new SimilarDetectionsResponseDto(
            AdjudicationId: adjudicationId,
            Limit: boundedLimit,
            NextCursor: nextCursor,
            Items: slice.Items.Select(ToSimilarDetectionDto).ToArray());
    }

    public async Task<EvidenceSourcesResponseDto?> GetEvidenceSourcesAsync(
        Guid adjudicationId,
        int limit,
        string? cursor,
        CancellationToken cancellationToken)
    {
        var row = await _repository.GetRequestAsync(adjudicationId, asTracking: false, cancellationToken);
        if (row is null)
        {
            return null;
        }

        var boundedLimit = Math.Clamp(limit, 1, 100);
        var offset = ParseCursor(cursor);
        var slice = await _repository.ListEvidenceSourcesAsync(adjudicationId, offset, boundedLimit, cancellationToken);
        var nextCursor = slice.HasMore ? EncodeCursor(offset + boundedLimit) : null;

        return new EvidenceSourcesResponseDto(
            AdjudicationId: adjudicationId,
            Limit: boundedLimit,
            NextCursor: nextCursor,
            Items: slice.Items.Select(ToEvidenceDto).ToArray());
    }

    private static AdjudicationLinksDto BuildLinks(Guid adjudicationId)
    {
        var root = $"/api/v2/ai/adjudications/{adjudicationId:D}";
        return new AdjudicationLinksDto(
            Result: root,
            Explanation: $"{root}/explanation",
            ActionPlan: $"{root}/action-plan",
            SimilarDetections: $"{root}/similar-detections",
            EvidenceSources: $"{root}/evidence-sources",
            OverrideClosure: $"{root}/override-closure");
    }

    private static AdjudicationDecisionDto ToDecisionDto(AiAdjudicationResult result)
    {
        var raw = ParseJsonElement(result.RawPayloadJson);
        var decisionNode = TryGetProperty(raw, out var nestedDecisionNode, "groundedDecision", "grounded_decision")
            ? nestedDecisionNode
            : raw;

        return new AdjudicationDecisionDto(
            Verdict: result.Verdict,
            Action: result.Action,
            Confidence: result.Confidence,
            FalsePositiveRisk: result.FalsePositiveRisk,
            ReviewPriority: result.ReviewPriority,
            ShouldPromoteToIndicator: result.ShouldPromoteToIndicator,
            ShouldSuppress: result.ShouldSuppress,
            ShouldAllowlist: result.ShouldAllowlist,
            ShouldEscalate: result.ShouldEscalate,
            Reasons: ParseStringArray(result.ReasonsJson),
            Provenance: ParseProvenance(result.ProvenanceJson),
            NextBestEvidence: ParseStringArray(result.NextBestEvidenceJson),
            AbstainReason: result.AbstainReason,
            ScoredAtUtc: result.ScoredAtUtc,
            SafetyDiagnostics: ParseSafetyDiagnostics(decisionNode, result.FalsePositiveRisk),
            Raw: raw);
    }

    private static SimilarDetectionDto ToSimilarDetectionDto(AiAdjudicationSimilarDetection item)
    {
        return new SimilarDetectionDto(
            Id: item.Id,
            DetectionId: item.DetectionId,
            RuleFamily: item.RuleFamily,
            RuleId: item.RuleId,
            RelationType: item.RelationType,
            ObservedAtUtc: item.ObservedAtUtc,
            Confidence: item.Confidence,
            SimilarityScore: item.SimilarityScore,
            SimilarityReasons: ParseStringArray(item.SimilarityReasonsJson),
            PriorVerdicts: ParseStringArray(item.PriorVerdictsJson),
            PriorAcceptedActions: ParseStringArray(item.PriorAcceptedActionsJson),
            PriorOutcomes: ParseStringArray(item.PriorOutcomesJson),
            Rank: item.Rank);
    }

    private static EvidenceSourceDto ToEvidenceDto(AiAdjudicationEvidenceSource item)
    {
        return new EvidenceSourceDto(
            Id: item.Id,
            Channel: item.Channel,
            Source: item.Source,
            EvidenceId: item.EvidenceId,
            Reference: item.Reference,
            Category: item.Category,
            Polarity: item.Polarity,
            Confidence: item.Confidence,
            Summary: item.Summary,
            Anchor: item.Anchor,
            Rank: item.Rank);
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

    private static IReadOnlyList<DecisionProvenanceDto> ParseProvenance(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return Array.Empty<DecisionProvenanceDto>();
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<DecisionProvenanceDto[]>(json, JsonOptions);
            return parsed ?? Array.Empty<DecisionProvenanceDto>();
        }
        catch (JsonException)
        {
            return Array.Empty<DecisionProvenanceDto>();
        }
    }

    private static IReadOnlyList<ExplanationCitationDto> ParseCitations(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return Array.Empty<ExplanationCitationDto>();
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<ExplanationCitationDto[]>(json, JsonOptions);
            return parsed ?? Array.Empty<ExplanationCitationDto>();
        }
        catch (JsonException)
        {
            return Array.Empty<ExplanationCitationDto>();
        }
    }

    private static IReadOnlyList<RecommendedActionDto> ParseRecommendedActions(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return Array.Empty<RecommendedActionDto>();
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<RecommendedActionDto[]>(json, JsonOptions);
            return parsed ?? Array.Empty<RecommendedActionDto>();
        }
        catch (JsonException)
        {
            return Array.Empty<RecommendedActionDto>();
        }
    }

    private static JsonElement ParseJsonElement(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            using var fallback = JsonDocument.Parse("{}");
            return fallback.RootElement.Clone();
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }
        catch (JsonException)
        {
            using var escaped = JsonDocument.Parse(JsonSerializer.Serialize(new { raw = json }));
            return escaped.RootElement.Clone();
        }
    }

    private static PhrasingDiagnosticsDto? ParseExplanationPhrasingDiagnostics(JsonElement root)
    {
        return TryGetProperty(root, out var diagnosticsNode, "llmAssist", "llm_assist")
            ? BuildPhrasingDiagnostics(diagnosticsNode)
            : null;
    }

    private static PhrasingDiagnosticsDto? ParseActionPlanPhrasingDiagnostics(JsonElement root)
    {
        var actionPlanNode = root;
        if (TryGetProperty(root, out var nestedActionPlanNode, "actionPlan", "action_plan"))
        {
            actionPlanNode = nestedActionPlanNode;
        }

        if (!TryGetProperty(actionPlanNode, out var machineReadableNode, "machineReadable", "machine_readable"))
        {
            return null;
        }

        if (!TryGetProperty(machineReadableNode, out var inputSnapshotNode, "inputSnapshot", "input_snapshot"))
        {
            return null;
        }

        return TryGetProperty(inputSnapshotNode, out var diagnosticsNode, "llmAssist", "llm_assist")
            ? BuildPhrasingDiagnostics(diagnosticsNode)
            : null;
    }

    private static PhrasingDiagnosticsDto BuildPhrasingDiagnostics(JsonElement diagnosticsNode)
    {
        var status = ReadOptionalString(diagnosticsNode, "status");
        var origin = string.Equals(status, "applied", StringComparison.OrdinalIgnoreCase)
            ? "llm_assist"
            : "deterministic";

        return new PhrasingDiagnosticsDto(
            Origin: origin,
            Status: status,
            Enabled: ReadOptionalBoolean(diagnosticsNode, "enabled"),
            Provider: ReadOptionalString(diagnosticsNode, "provider"),
            Model: ReadOptionalString(diagnosticsNode, "model"),
            Raw: diagnosticsNode.Clone());
    }

    private static SafetyDiagnosticsDto? ParseSafetyDiagnostics(JsonElement decisionNode, decimal fallbackFalsePositiveRisk)
    {
        if (!TryGetProperty(decisionNode, out var diagnosticsNode, "safetyDiagnostics", "safety_diagnostics")
            || diagnosticsNode.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        return new SafetyDiagnosticsDto(
            AutoRemediationAllowed: ReadOptionalBoolean(diagnosticsNode, "autoRemediationAllowed", "auto_remediation_allowed") ?? false,
            WeakEvidence: ReadOptionalBoolean(diagnosticsNode, "weakEvidence", "weak_evidence") ?? false,
            ContradictoryEvidence: ReadOptionalBoolean(diagnosticsNode, "contradictoryEvidence", "contradictory_evidence") ?? false,
            ContradictionScore: ReadOptionalDecimal(diagnosticsNode, "contradictionScore", "contradiction_score") ?? 0m,
            MissingCriticalFields: ReadStringArray(diagnosticsNode, "missingCriticalFields", "missing_critical_fields"),
            PartialEvidence: ReadOptionalBoolean(diagnosticsNode, "partialEvidence", "partial_evidence") ?? false,
            EnrichmentStatus: ReadOptionalString(diagnosticsNode, "enrichmentStatus", "enrichment_status") ?? "available",
            FalsePositiveRisk: ReadOptionalDecimal(diagnosticsNode, "falsePositiveRisk", "false_positive_risk") ?? fallbackFalsePositiveRisk,
            SeverityCapApplied: ReadOptionalBoolean(diagnosticsNode, "severityCapApplied", "severity_cap_applied") ?? false,
            MaxRecommendationSeverity: ReadOptionalString(diagnosticsNode, "maxRecommendationSeverity", "max_recommendation_severity")
                ?? "containment_allowed",
            DegradationReasons: ReadStringArray(diagnosticsNode, "degradationReasons", "degradation_reasons"));
    }

    private static bool TryGetProperty(JsonElement node, out JsonElement value, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (node.ValueKind == JsonValueKind.Object && node.TryGetProperty(propertyName, out value))
            {
                return true;
            }
        }

        value = default;
        return false;
    }

    private static string? ReadOptionalString(JsonElement node, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (TryGetProperty(node, out var value, propertyName) && value.ValueKind == JsonValueKind.String)
            {
                var text = value.GetString();
                return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
            }
        }

        return null;
    }

    private static decimal? ReadOptionalDecimal(JsonElement node, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (!TryGetProperty(node, out var value, propertyName))
            {
                continue;
            }

            if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var parsed))
            {
                return parsed;
            }

            if (value.ValueKind == JsonValueKind.String
                && decimal.TryParse(value.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out parsed))
            {
                return parsed;
            }
        }

        return null;
    }

    private static IReadOnlyList<string> ReadStringArray(JsonElement node, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (!TryGetProperty(node, out var value, propertyName) || value.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var items = new List<string>();
            foreach (var element in value.EnumerateArray())
            {
                if (element.ValueKind != JsonValueKind.String)
                {
                    continue;
                }

                var text = element.GetString();
                if (!string.IsNullOrWhiteSpace(text))
                {
                    items.Add(text.Trim());
                }
            }

            return items;
        }

        return Array.Empty<string>();
    }

    private static bool? ReadOptionalBoolean(JsonElement node, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (TryGetProperty(node, out var value, propertyName))
            {
                if (value.ValueKind is JsonValueKind.True or JsonValueKind.False)
                {
                    return value.GetBoolean();
                }
            }
        }

        return null;
    }

    private static int ParseCursor(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor))
        {
            return 0;
        }

        try
        {
            var bytes = Convert.FromBase64String(cursor.Trim());
            var raw = Encoding.UTF8.GetString(bytes);
            return int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value) && value >= 0
                ? value
                : 0;
        }
        catch (FormatException)
        {
            return 0;
        }
    }

    private static string EncodeCursor(int value)
    {
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(value.ToString(CultureInfo.InvariantCulture)));
    }
}
