using System.Text.Json;

namespace Backend.Infrastructure.Integrations;

public static class AiDecisionContractParser
{
    private static readonly HashSet<string> AllowedVerdicts =
    [
        "confirmed_malicious",
        "likely_malicious",
        "likely_benign",
        "insufficient_evidence",
    ];

    private static readonly HashSet<string> AllowedActions =
    [
        "deploy",
        "canary",
        "monitor",
        "hold",
        "rollback",
        "quarantine_for_review",
    ];

    public static AiGroundedDecisionContract ParseScoreCaseResponse(string responseBody)
    {
        using var document = JsonDocument.Parse(responseBody);
        return ParseFromRoot(document.RootElement, requireGroundedDecisionWrapper: true);
    }

    public static AiGroundedDecisionContract ParseRecommendActionResponse(string responseBody)
    {
        using var document = JsonDocument.Parse(responseBody);
        return ParseFromRoot(document.RootElement, requireGroundedDecisionWrapper: false);
    }

    public static AiGroundedDecisionContract ParseRequestMoreEvidenceResponse(string responseBody)
    {
        using var document = JsonDocument.Parse(responseBody);
        return ParseFromRoot(document.RootElement, requireGroundedDecisionWrapper: false);
    }

    private static AiGroundedDecisionContract ParseFromRoot(JsonElement root, bool requireGroundedDecisionWrapper)
    {
        var decision = ResolveDecisionElement(root, requireGroundedDecisionWrapper);

        var verdict = ReadRequiredString(decision, "verdict");
        if (!AllowedVerdicts.Contains(verdict))
        {
            throw new JsonException($"Unsupported grounded decision verdict '{verdict}'.");
        }

        var action = ReadRequiredString(decision, "action");
        if (!AllowedActions.Contains(action))
        {
            throw new JsonException($"Unsupported grounded decision action '{action}'.");
        }

        var confidence = ReadRequiredDecimal(decision, "confidence");
        if (confidence is < 0m or > 1m)
        {
            throw new JsonException("Grounded decision confidence must be between 0 and 1.");
        }

        var provenance = ReadRequiredArray(decision, "provenance")
            .EnumerateArray()
            .Select(ParseProvenanceItem)
            .ToArray();

        var reasons = ReadRequiredStringArray(decision, "reasons");
        var nextBestEvidence = ReadRequiredStringArray(decision, "next_best_evidence", "nextBestEvidence");
        var abstainReason = ReadOptionalString(decision, "abstain_reason", "abstainReason");

        if (verdict == "insufficient_evidence")
        {
            if (string.IsNullOrWhiteSpace(abstainReason))
            {
                throw new JsonException("abstain_reason is required when verdict is insufficient_evidence.");
            }
        }
        else if (abstainReason is not null)
        {
            throw new JsonException("abstain_reason must be null unless verdict is insufficient_evidence.");
        }

        return new AiGroundedDecisionContract(
            Verdict: verdict,
            Action: action,
            Confidence: confidence,
            Provenance: provenance,
            Reasons: reasons,
            AbstainReason: abstainReason,
            NextBestEvidence: nextBestEvidence);
    }

    private static JsonElement ResolveDecisionElement(JsonElement root, bool requireGroundedDecisionWrapper)
    {
        // grounded_decision is authoritative wherever it appears.
        if (TryGetProperty(root, out var snakeCaseDecision, "grounded_decision"))
        {
            EnsureObject(snakeCaseDecision, "grounded_decision");
            return snakeCaseDecision;
        }

        if (TryGetProperty(root, out var camelCaseDecision, "groundedDecision"))
        {
            EnsureObject(camelCaseDecision, "groundedDecision");
            return camelCaseDecision;
        }

        if (requireGroundedDecisionWrapper)
        {
            throw new JsonException("Missing grounded decision wrapper field 'grounded_decision'.");
        }

        EnsureObject(root, "root");
        return root;
    }

    private static AiGroundedDecisionProvenanceItem ParseProvenanceItem(JsonElement item)
    {
        EnsureObject(item, "provenance item");

        return new AiGroundedDecisionProvenanceItem(
            Source: ReadRequiredString(item, "source"),
            Key: ReadRequiredString(item, "key"),
            Value: ReadRequiredString(item, "value"),
            EvidenceId: ReadOptionalString(item, "evidence_id", "evidenceId"),
            CitationRef: ReadOptionalString(item, "citation_ref", "citationRef"));
    }

    private static string[] ReadRequiredStringArray(JsonElement element, params string[] propertyNames)
    {
        var array = ReadRequiredArray(element, propertyNames);
        var values = new List<string>();
        foreach (var item in array.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.String)
            {
                throw new JsonException($"Field '{propertyNames[0]}' must be an array of strings.");
            }

            var value = item.GetString();
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new JsonException($"Field '{propertyNames[0]}' cannot contain empty strings.");
            }

            values.Add(value);
        }

        return values.ToArray();
    }

    private static JsonElement ReadRequiredArray(JsonElement element, params string[] propertyNames)
    {
        var node = ReadRequiredProperty(element, propertyNames);
        if (node.ValueKind != JsonValueKind.Array)
        {
            throw new JsonException($"Field '{propertyNames[0]}' must be an array.");
        }

        return node;
    }

    private static decimal ReadRequiredDecimal(JsonElement element, params string[] propertyNames)
    {
        var node = ReadRequiredProperty(element, propertyNames);
        if (node.ValueKind != JsonValueKind.Number)
        {
            throw new JsonException($"Field '{propertyNames[0]}' must be a number.");
        }

        return node.GetDecimal();
    }

    private static string ReadRequiredString(JsonElement element, params string[] propertyNames)
    {
        var node = ReadRequiredProperty(element, propertyNames);
        if (node.ValueKind != JsonValueKind.String)
        {
            throw new JsonException($"Field '{propertyNames[0]}' must be a string.");
        }

        var value = node.GetString();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new JsonException($"Field '{propertyNames[0]}' cannot be empty.");
        }

        return value;
    }

    private static string? ReadOptionalString(JsonElement element, params string[] propertyNames)
    {
        if (!TryGetProperty(element, out var node, propertyNames))
        {
            return null;
        }

        if (node.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (node.ValueKind != JsonValueKind.String)
        {
            throw new JsonException($"Field '{propertyNames[0]}' must be a string or null.");
        }

        var value = node.GetString();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new JsonException($"Field '{propertyNames[0]}' cannot be empty when provided.");
        }

        return value;
    }

    private static JsonElement ReadRequiredProperty(JsonElement element, params string[] propertyNames)
    {
        if (!TryGetProperty(element, out var node, propertyNames))
        {
            throw new JsonException($"Missing required field '{propertyNames[0]}'.");
        }

        return node;
    }

    private static bool TryGetProperty(JsonElement element, out JsonElement node, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (element.TryGetProperty(propertyName, out node))
            {
                return true;
            }
        }

        node = default;
        return false;
    }

    private static void EnsureObject(JsonElement element, string fieldName)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            throw new JsonException($"Field '{fieldName}' must be an object.");
        }
    }
}

public sealed record AiGroundedDecisionContract(
    string Verdict,
    string Action,
    decimal Confidence,
    IReadOnlyList<AiGroundedDecisionProvenanceItem> Provenance,
    IReadOnlyList<string> Reasons,
    string? AbstainReason,
    IReadOnlyList<string> NextBestEvidence);

public sealed record AiGroundedDecisionProvenanceItem(
    string Source,
    string Key,
    string Value,
    string? EvidenceId,
    string? CitationRef);
