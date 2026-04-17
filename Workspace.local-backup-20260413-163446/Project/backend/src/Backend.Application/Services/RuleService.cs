using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.Rules;
using Backend.Domain.Common;
using Backend.Domain.Rules;

namespace Backend.Application.Services;

public sealed class RuleService : IRuleService
{
    private static readonly Regex TokenRegex = new("[a-zA-Z0-9_]{3,}", RegexOptions.Compiled);

    private readonly ICasesRepository _casesRepository;
    private readonly IRulesRepository _rulesRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;

    public RuleService(
        ICasesRepository casesRepository,
        IRulesRepository rulesRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider)
    {
        _casesRepository = casesRepository;
        _rulesRepository = rulesRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<RuleResponse> CreateAsync(CreateRuleRequest request, CancellationToken cancellationToken)
    {
        await EnsureCaseExistsAsync(request.CaseId, cancellationToken);

        var nowUtc = _dateTimeProvider.UtcNow;
        var normalizedFamily = RuleFamilyCatalog.NormalizeOrThrow(request.RuleFamily, nameof(request.RuleFamily));
        var bodyFingerprint = ComputeBodyFingerprint(request.RuleBody);
        var actor = request.ActorUserId.Trim();

        var rule = RuleRecord.Create(
            request.CaseId,
            request.Name,
            normalizedFamily,
            request.RuleBody,
            request.Version,
            request.SourceOfOrigin?.Trim() ?? "Unknown",
            request.AuthorUserId?.Trim() ?? actor,
            request.LinkedAttackTechniques?.ToArray() ?? [],
            request.LinkedCampaign,
            request.LinkedMalwareFamily,
            request.PredictedCoverage ?? EstimateCoverage(normalizedFamily),
            request.PredictedFalsePositiveRisk ?? EstimateFalsePositiveRisk(normalizedFamily, request.RuleBody),
            request.BlastRadius?.Trim() ?? "Unspecified",
            bodyFingerprint,
            actor,
            nowUtc);

        if (!string.IsNullOrWhiteSpace(request.ReviewerUserId))
        {
            rule.AssignReviewer(request.ReviewerUserId, actor, nowUtc);
        }

        if (TryParseRule(rule.RuleFamily, rule.RuleBody))
        {
            rule.MarkParsed(actor, nowUtc);
        }

        await _rulesRepository.AddAsync(rule, cancellationToken);
        await AppendRevisionAsync(rule, "created", actor, "Initial creation.", cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(rule, cancellationToken);
    }

    public async Task<RuleResponse?> GetByIdAsync(Guid ruleId, CancellationToken cancellationToken)
    {
        var rule = await _rulesRepository.GetByIdAsync(ruleId, cancellationToken);
        if (rule is null)
        {
            return null;
        }

        return await ToResponseAsync(rule, cancellationToken);
    }

    public async Task<RuleResponse?> UpdateAsync(Guid ruleId, UpdateRuleRequest request, CancellationToken cancellationToken)
    {
        var rule = await _rulesRepository.GetByIdAsync(ruleId, cancellationToken);
        if (rule is null)
        {
            return null;
        }

        var nowUtc = _dateTimeProvider.UtcNow;
        var actor = request.ActorUserId.Trim();
        var family = RuleFamilyCatalog.NormalizeOrThrow(request.RuleFamily, nameof(request.RuleFamily));
        var bodyFingerprint = ComputeBodyFingerprint(request.RuleBody);

        rule.UpdateContent(
            request.Name,
            family,
            request.RuleBody,
            request.Version,
            request.SourceOfOrigin?.Trim() ?? rule.SourceOfOrigin,
            request.AuthorUserId?.Trim() ?? rule.AuthorUserId,
            request.LinkedAttackTechniques?.ToArray() ?? rule.LinkedAttackTechniques,
            request.LinkedCampaign,
            request.LinkedMalwareFamily,
            request.PredictedCoverage ?? rule.PredictedCoverage,
            request.PredictedFalsePositiveRisk ?? rule.PredictedFalsePositiveRisk,
            request.BlastRadius?.Trim() ?? rule.BlastRadius,
            bodyFingerprint,
            actor,
            nowUtc);

        if (!string.IsNullOrWhiteSpace(request.ReviewerUserId))
        {
            rule.AssignReviewer(request.ReviewerUserId, actor, nowUtc);
        }

        if (TryParseRule(rule.RuleFamily, rule.RuleBody))
        {
            rule.MarkParsed(actor, nowUtc);
        }

        await AppendRevisionAsync(rule, "updated", actor, request.ChangeReason, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ToResponseAsync(rule, cancellationToken);
    }

    public async Task<RuleResponse?> UpdateStatusAsync(Guid ruleId, UpdateRuleStatusRequest request, CancellationToken cancellationToken)
    {
        var rule = await _rulesRepository.GetByIdAsync(ruleId, cancellationToken);
        if (rule is null)
        {
            return null;
        }

        var status = EnumParser.Parse<RuleStatus>(request.Status, nameof(request.Status));
        var nowUtc = _dateTimeProvider.UtcNow;
        rule.UpdateStatus(status, request.ActorUserId, nowUtc);

        await AppendRevisionAsync(rule, "status-updated", request.ActorUserId, request.Reason, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ToResponseAsync(rule, cancellationToken);
    }

    public async Task<RuleResponse?> ReviewAsync(Guid ruleId, ReviewRuleRequest request, CancellationToken cancellationToken)
    {
        var rule = await _rulesRepository.GetByIdAsync(ruleId, cancellationToken);
        if (rule is null)
        {
            return null;
        }

        var nowUtc = _dateTimeProvider.UtcNow;
        rule.Review(request.Decision, request.ReviewerUserId, request.ActorUserId, nowUtc);

        await AppendRevisionAsync(rule, "reviewed", request.ActorUserId, request.Reason, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ToResponseAsync(rule, cancellationToken);
    }

    public async Task<RuleValidationResultResponse?> ValidateAsync(Guid ruleId, ValidateRuleRequest request, CancellationToken cancellationToken)
    {
        var rule = await _rulesRepository.GetByIdAsync(ruleId, cancellationToken);
        if (rule is null)
        {
            return null;
        }

        var issues = ValidateByFamily(rule.RuleFamily, rule.RuleBody);
        var isValid = issues.All(x => x.Severity != "Error");
        var nowUtc = _dateTimeProvider.UtcNow;

        if (request.PersistResult)
        {
            var summary = isValid
                ? "Validation passed with no blocking issues."
                : string.Join("; ", issues.Where(x => x.Severity == "Error").Select(x => x.Message));

            rule.RecordValidation(isValid, summary, request.ActorUserId, nowUtc);
            await AppendRevisionAsync(rule, "validated", request.ActorUserId, summary, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return new RuleValidationResultResponse(
            rule.Id,
            isValid,
            issues.Select(x => new RuleValidationIssueResponse(x.Severity, x.Message)).ToArray(),
            nowUtc);
    }

    public async Task<RuleResponse?> RecordUsefulHitAsync(Guid ruleId, RecordRuleHitRequest request, CancellationToken cancellationToken)
    {
        var rule = await _rulesRepository.GetByIdAsync(ruleId, cancellationToken);
        if (rule is null)
        {
            return null;
        }

        var nowUtc = _dateTimeProvider.UtcNow;
        rule.RecordUsefulHit(request.LastUsefulHitAtUtc, request.ActorUserId, nowUtc);
        await AppendRevisionAsync(rule, "useful-hit", request.ActorUserId, "Updated last useful hit timestamp.", cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(rule, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid ruleId, string actorUserId, CancellationToken cancellationToken)
    {
        var rule = await _rulesRepository.GetByIdAsync(ruleId, cancellationToken);
        if (rule is null)
        {
            return false;
        }

        await AppendRevisionAsync(rule, "deleted", actorUserId, "Rule deleted.", cancellationToken);
        await _rulesRepository.RemoveAsync(rule, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<RuleResponse>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        await EnsureCaseExistsAsync(caseId, cancellationToken);
        var items = await _rulesRepository.ListByCaseAsync(caseId, cancellationToken);

        var responses = new List<RuleResponse>(items.Count);
        foreach (var item in items)
        {
            responses.Add(await ToResponseAsync(item, cancellationToken));
        }

        return responses;
    }

    public async Task<IReadOnlyList<RuleRevisionResponse>> ListRevisionsAsync(Guid ruleId, CancellationToken cancellationToken)
    {
        var items = await _rulesRepository.ListRevisionsAsync(ruleId, cancellationToken);
        return items
            .Select(x => new RuleRevisionResponse(
                x.Id,
                x.RuleId,
                x.CaseId,
                x.RevisionNumber,
                x.ChangeType,
                x.ChangeReason,
                x.Name,
                x.RuleFamily,
                x.RuleBody,
                x.Version,
                x.Status.ToString(),
                x.SourceOfOrigin,
                x.AuthorUserId,
                x.ReviewerUserId,
                x.LinkedAttackTechniques,
                x.LinkedCampaign,
                x.LinkedMalwareFamily,
                x.PredictedCoverage,
                x.PredictedFalsePositiveRisk,
                x.BlastRadius,
                x.LastUsefulHitAtUtc,
                x.LastDeploymentAtUtc,
                x.CreatedAtUtc,
                x.CreatedByUserId))
            .ToArray();
    }

    private async Task EnsureCaseExistsAsync(Guid caseId, CancellationToken cancellationToken)
    {
        var caseRecord = await _casesRepository.GetByIdAsync(caseId, cancellationToken);
        if (caseRecord is null)
        {
            throw new NotFoundException($"Case {caseId} was not found.");
        }
    }

    private async Task AppendRevisionAsync(
        RuleRecord rule,
        string changeType,
        string actorUserId,
        string? changeReason,
        CancellationToken cancellationToken)
    {
        var revisionNumber = await _rulesRepository.GetNextRevisionNumberAsync(rule.Id, cancellationToken);
        var revision = RuleRevisionRecord.Capture(rule, revisionNumber, changeType, actorUserId, changeReason, _dateTimeProvider.UtcNow);
        await _rulesRepository.AddRevisionAsync(revision, cancellationToken);
    }

    private async Task<RuleResponse> ToResponseAsync(RuleRecord item, CancellationToken cancellationToken)
    {
        var duplicate = await _rulesRepository.FindDuplicateAsync(
            item.CaseId,
            item.RuleFamily,
            item.BodyFingerprint,
            item.Id,
            cancellationToken);

        var overlapCandidates = await _rulesRepository.ListOverlapCandidatesAsync(item.CaseId, item.RuleFamily, item.Id, cancellationToken);
        var overlaps = ComputeOverlaps(item, overlapCandidates);
        var revisions = await _rulesRepository.ListRevisionsAsync(item.Id, cancellationToken);

        return new RuleResponse(
            item.Id,
            item.CaseId,
            item.Name,
            item.RuleFamily,
            item.RuleBody,
            item.Version,
            item.Status.ToString(),
            item.SourceOfOrigin,
            item.AuthorUserId,
            item.ReviewerUserId,
            item.LinkedAttackTechniques,
            item.LinkedCampaign,
            item.LinkedMalwareFamily,
            item.PredictedCoverage,
            item.PredictedFalsePositiveRisk,
            item.BlastRadius,
            item.LastUsefulHitAtUtc,
            item.LastDeploymentAtUtc,
            item.LastParsedAtUtc,
            item.LastValidatedAtUtc,
            item.LastValidationPassed,
            item.LastValidationSummary,
            duplicate?.Id,
            overlaps,
            revisions.Count,
            item.CreatedAtUtc,
            item.UpdatedAtUtc);
    }

    private static IReadOnlyList<RuleOverlapResponse> ComputeOverlaps(RuleRecord source, IReadOnlyList<RuleRecord> candidates)
    {
        var sourceTokens = ExtractTokens(source.RuleBody);
        if (sourceTokens.Count == 0)
        {
            return [];
        }

        return candidates
            .Select(candidate =>
            {
                var candidateTokens = ExtractTokens(candidate.RuleBody);
                var unionCount = sourceTokens.Union(candidateTokens).Count();
                var intersectionCount = sourceTokens.Intersect(candidateTokens).Count();
                var similarity = unionCount == 0
                    ? 0m
                    : decimal.Round((decimal)intersectionCount / unionCount, 4, MidpointRounding.AwayFromZero);

                return new RuleOverlapResponse(candidate.Id, similarity);
            })
            .Where(x => x.SimilarityScore >= 0.45m)
            .OrderByDescending(x => x.SimilarityScore)
            .Take(5)
            .ToArray();
    }

    private static HashSet<string> ExtractTokens(string ruleBody)
    {
        return TokenRegex.Matches(ruleBody.ToLowerInvariant())
            .Select(x => x.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static IReadOnlyList<ValidationIssue> ValidateByFamily(string ruleFamily, string body)
    {
        var issues = new List<ValidationIssue>();
        if (!RuleFamilyCatalog.TryNormalize(ruleFamily, out var normalized))
        {
            issues.Add(new ValidationIssue("Error", "Unsupported rule family."));
            return issues;
        }

        var trimmedBody = body.Trim();

        if (string.IsNullOrWhiteSpace(trimmedBody))
        {
            issues.Add(new ValidationIssue("Error", "Rule body cannot be empty."));
            return issues;
        }

        switch (normalized)
        {
            case "yara":
                if (!trimmedBody.Contains("rule ", StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new ValidationIssue("Error", "YARA rule must declare a rule name."));
                }

                if (!trimmedBody.Contains("condition:", StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new ValidationIssue("Error", "YARA rule must include a condition section."));
                }

                break;
            case "sigma":
                if (!trimmedBody.Contains("title:", StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new ValidationIssue("Error", "Sigma rule should include a title."));
                }

                if (!trimmedBody.Contains("detection:", StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new ValidationIssue("Error", "Sigma rule must include detection logic."));
                }

                if (!trimmedBody.Contains("logsource:", StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new ValidationIssue("Warning", "Sigma rule should include logsource details."));
                }

                break;
            case "snort":
                if (!trimmedBody.Contains("alert ", StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new ValidationIssue("Error", "Snort rule must start with an alert action."));
                }

                if (!trimmedBody.Contains("sid:", StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new ValidationIssue("Error", "Snort rule must include sid."));
                }

                break;
            case "suricata":
                if (!trimmedBody.Contains("alert ", StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new ValidationIssue("Error", "Suricata rule must include an alert action."));
                }

                if (!trimmedBody.Contains("msg:", StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new ValidationIssue("Warning", "Suricata rule should include msg metadata."));
                }

                if (!trimmedBody.Contains("sid:", StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add(new ValidationIssue("Error", "Suricata rule must include sid."));
                }

                break;
            default:
                issues.Add(new ValidationIssue("Error", "Unsupported rule family."));
                break;
        }

        return issues;
    }

    private static bool TryParseRule(string ruleFamily, string ruleBody)
    {
        var issues = ValidateByFamily(ruleFamily, ruleBody);
        return issues.All(x => x.Severity != "Error");
    }

    private static decimal EstimateCoverage(string ruleFamily)
    {
        var normalized = RuleFamilyCatalog.NormalizeOrThrow(ruleFamily, nameof(ruleFamily));
        return normalized switch
        {
            "yara" => 0.64m,
            "sigma" => 0.58m,
            "snort" => 0.69m,
            "suricata" => 0.71m,
            _ => 0.50m,
        };
    }

    private static decimal EstimateFalsePositiveRisk(string ruleFamily, string ruleBody)
    {
        var complexityPenalty = Math.Min(0.24m, ruleBody.Length / 12_000m);
        var normalized = RuleFamilyCatalog.NormalizeOrThrow(ruleFamily, nameof(ruleFamily));
        var familyBaseline = normalized switch
        {
            "yara" => 0.18m,
            "sigma" => 0.26m,
            "snort" => 0.22m,
            "suricata" => 0.20m,
            _ => 0.30m,
        };

        var value = familyBaseline + complexityPenalty;
        return decimal.Round(Math.Min(1m, Math.Max(0m, value)), 4, MidpointRounding.AwayFromZero);
    }

    private static string ComputeBodyFingerprint(string ruleBody)
    {
        var normalizedBody = string.Join(
            '\n',
            ruleBody.Split('\n', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries));

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalizedBody));
        var builder = new StringBuilder(bytes.Length * 2);
        foreach (var b in bytes)
        {
            builder.Append(b.ToString("x2"));
        }

        return builder.ToString();
    }

    private sealed record ValidationIssue(string Severity, string Message);
}
