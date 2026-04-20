using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Backend.Api.Infrastructure;
using Backend.Contracts.V2;
using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.Api.Controllers.V2;

[ApiController]
[Authorize(Policy = AuthorizationPolicies.AnalystAccess)]
[Route("api/v2/rules")]
public sealed partial class RulesController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private static readonly HashSet<string> SupportedScopeTypes =
    [
        "global",
        "environment",
        "subnet",
        "server",
        "scanner",
    ];

    private static readonly Regex YaraNameRegex = new(@"^\s*rule\s+(?<name>[A-Za-z0-9_\-\.]+)", RegexOptions.Multiline | RegexOptions.Compiled);
    private static readonly Regex YamlTitleRegex = new(@"^\s*title\s*:\s*(?<value>.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex DescriptionRegex = new(@"^\s*description\s*:\s*(?<value>.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SeverityRegex = new(@"^\s*(severity|level)\s*:\s*(?<value>.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex StatusRegex = new(@"^\s*status\s*:\s*(?<value>.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ScopeTypeRegex = new(@"^\s*scopeType\s*:\s*(?<value>.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ScopeValueRegex = new(@"^\s*scopeValue\s*:\s*(?<value>.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex VersionRegex = new(@"^\s*version\s*:\s*(?<value>.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SnortMessageRegex = new("msg\\s*:\\s*\"(?<value>[^\"]+)\"", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SnortPriorityRegex = new(@"priority\s*:\s*(?<value>\d+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly CtiDbContext _dbContext;
    private readonly IAuthSensitiveAuditService _auditService;
    private readonly IRuleRevisionValidationPipeline _validationPipeline;
    private readonly IRuleDistributionJobQueue _distributionJobQueue;
    private readonly IOptionsMonitor<RuleDistributionExecutionOptions> _distributionOptions;

    public RulesController(
        CtiDbContext dbContext,
        IAuthSensitiveAuditService auditService,
        IRuleRevisionValidationPipeline validationPipeline,
        IRuleDistributionJobQueue distributionJobQueue,
        IOptionsMonitor<RuleDistributionExecutionOptions> distributionOptions)
    {
        _dbContext = dbContext;
        _auditService = auditService;
        _validationPipeline = validationPipeline;
        _distributionJobQueue = distributionJobQueue;
        _distributionOptions = distributionOptions;
    }

    [HttpGet]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<RuleListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<RuleListResponse>> ListRepository(
        [FromQuery] RuleRepositoryQuery queryModel,
        CancellationToken cancellationToken = default)
    {
        var fromUtc = V2SearchHelpers.ParseOptionalUtc(queryModel.FromUtc, nameof(queryModel.FromUtc));
        var toUtc = V2SearchHelpers.ParseOptionalUtc(queryModel.ToUtc, nameof(queryModel.ToUtc));
        V2SearchHelpers.ValidateUtcRange(fromUtc, toUtc, nameof(queryModel.FromUtc), nameof(queryModel.ToUtc));

        var query = _dbContext.RuleArtifacts.AsNoTracking().AsQueryable();
        if (!queryModel.IncludeDeleted)
        {
            query = query.Where(x => !x.IsDeleted);
        }

        var normalizedFamily = NormalizeNullable(queryModel.Family);
        var normalizedSeverity = NormalizeNullable(queryModel.Severity);
        var normalizedStatus = NormalizeNullable(queryModel.Status);
        var normalizedScopeType = NormalizeNullable(queryModel.ScopeType);
        var normalizedSource = NormalizeNullable(queryModel.Source);
        var normalizedActor = NormalizeNullable(queryModel.Actor);
        var normalizedVersion = NormalizeNullable(queryModel.Version);
        var normalizedQuery = NormalizeNullable(queryModel.Q);
        var requestedTags = SplitTags(queryModel.Tags);

        if (normalizedFamily is not null)
        {
            query = query.Where(x => x.RuleFamily == normalizedFamily);
        }

        if (normalizedSeverity is not null)
        {
            query = query.Where(x => x.Severity == normalizedSeverity);
        }

        if (normalizedStatus is not null)
        {
            query = query.Where(x => x.LifecycleStatus == normalizedStatus);
        }

        if (normalizedScopeType is not null && Enum.TryParse<RuleScopeType>(normalizedScopeType, true, out var parsedScopeType))
        {
            query = query.Where(x => x.ScopeType == parsedScopeType);
        }

        if (normalizedSource is not null)
        {
            query = query.Where(x => x.Source == normalizedSource);
        }

        if (fromUtc.HasValue)
        {
            query = query.Where(x => x.UpdatedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(x => x.UpdatedAtUtc <= toUtc.Value);
        }

        if (normalizedActor is not null)
        {
            query = query.Where(x => x.CreatedByUserId == normalizedActor || x.UpdatedByUserId == normalizedActor);
        }

        if (normalizedVersion is not null)
        {
            query = query.Where(x => x.CurrentVersionLabel == normalizedVersion);
        }

        if (normalizedQuery is not null && !queryModel.IncludeContent)
        {
            var pattern = V2SearchHelpers.ToContainsPattern(normalizedQuery);
            query = query.Where(x =>
                EF.Functions.Like(x.Name, pattern)
                || EF.Functions.Like(x.RuleFamily, pattern)
                || EF.Functions.Like(x.Source, pattern)
                || EF.Functions.Like(x.Description, pattern)
                || EF.Functions.Like(x.Severity, pattern)
                || EF.Functions.Like(x.LifecycleStatus, pattern)
                || EF.Functions.Like(x.CurrentVersionLabel, pattern)
                || EF.Functions.Like(x.CreatedByUserId, pattern)
                || EF.Functions.Like(x.UpdatedByUserId, pattern));
        }

        var artifacts = await query.ToArrayAsync(cancellationToken);

        var revisionBodiesByRuleId = queryModel.IncludeContent && !string.IsNullOrWhiteSpace(normalizedQuery)
            ? (await _dbContext.RuleRevisionsV2
                .AsNoTracking()
                .Where(x => artifacts.Select(a => a.Id).Contains(x.RuleArtifactId))
                .Select(x => new { x.RuleArtifactId, x.OriginalContent })
                .ToArrayAsync(cancellationToken))
                .GroupBy(x => x.RuleArtifactId)
                .ToDictionary(
                    x => x.Key,
                    x => x.Select(y => y.OriginalContent).Where(y => !string.IsNullOrWhiteSpace(y)).ToArray())
            : new Dictionary<Guid, string[]>();

        var filtered = artifacts
            .Where(x => requestedTags.Length == 0 || requestedTags.All(tag => x.Tags.Contains(tag, StringComparer.OrdinalIgnoreCase)))
            .Where(x => IsMatch(x, normalizedQuery, queryModel.IncludeContent, revisionBodiesByRuleId))
            .ToArray();

        filtered = ApplySort(filtered, queryModel.Sort);

        var boundedPage = Math.Max(queryModel.Page, 1);
        var boundedPageSize = Math.Clamp(queryModel.PageSize, 1, 200);
        var total = filtered.Length;
        var items = filtered
            .Skip((boundedPage - 1) * boundedPageSize)
            .Take(boundedPageSize)
            .Select(x => x.ToRuleListItemResponse())
            .ToArray();

        return Ok(new RuleListResponse(items, total, boundedPage, boundedPageSize));
    }

    [HttpGet("{ruleId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<RuleDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleDetailResponse>> GetRepositoryRule(Guid ruleId, CancellationToken cancellationToken)
    {
        var response = await BuildRuleDetailAsync(ruleId, cancellationToken);
        if (response is null)
        {
            return NotFound();
        }

        return Ok(response);
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleDetailResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<RuleDetailResponse>> CreateRepositoryRule(
        [FromBody] CreateRuleRepositoryRequest request,
        CancellationToken cancellationToken)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var scopeType = V2Mappings.ParseRuleScopeType(request.ScopeType);
        var lifecycleStatus = NormalizeRequired(request.Status, "draft");
        var normalizedTags = NormalizeTags(request.Tags);
        var createValidation = await _validationPipeline.ValidateAsync(
            new RuleValidationPipelineRequest(
                RuleFamily: request.RuleFamily,
                OriginalContent: request.OriginalContent,
                Name: request.Name,
                Source: request.Source,
                Severity: request.Severity,
                Status: lifecycleStatus,
                ScopeType: scopeType,
                ScopeValue: request.ScopeValue,
                VersionLabel: request.VersionLabel,
                Tags: normalizedTags,
                ActorUserId: request.ActorUserId),
            cancellationToken);
        if (createValidation.HasBlockingPersistenceErrors())
        {
            return BadRequest(BuildValidationFailureResponse(createValidation));
        }

        var artifact = RuleArtifact.CreateRepository(
            request.Name,
            request.RuleFamily,
            request.Source,
            request.Description,
            normalizedTags,
            request.Severity,
            lifecycleStatus,
            scopeType,
            request.ScopeValue,
            request.ActorUserId,
            nowUtc);

        var revisionNumber = artifact.ReserveNextRevision(request.VersionLabel, request.ActorUserId, nowUtc);
        var metadataJson = SerializeMetadata(
            artifact.Name,
            artifact.RuleFamily,
            artifact.Source,
            artifact.Description,
            artifact.Tags,
            artifact.Severity,
            artifact.LifecycleStatus,
            artifact.ScopeType,
            artifact.ScopeValue);

        var revision = RuleRevision.CreateRepository(
            artifact.Id,
            revisionNumber,
            request.VersionLabel,
            request.OriginalContent,
            metadataJson,
            "created",
            request.ChangeReason,
            lifecycleStatus,
            SerializeValidationResult(createValidation),
            createValidation.CanPersist,
            createValidation.IsDeploymentReady,
            createValidation.EvaluatedAtUtc,
            request.ActorUserId,
            nowUtc);

        _dbContext.RuleArtifacts.Add(artifact);
        _dbContext.RuleRevisionsV2.Add(revision);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            "rules.repository.create",
            "rule_artifact",
            artifact.Id.ToString("N"),
            new { artifact.Name, artifact.RuleFamily, revision.RevisionNumber, revision.VersionLabel },
            cancellationToken);

        var response = await BuildRuleDetailAsync(artifact.Id, cancellationToken);
        return CreatedAtAction(nameof(GetRepositoryRule), new { ruleId = artifact.Id }, response);
    }

    [HttpPatch("{ruleId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleDetailResponse>> UpdateRepositoryRule(
        Guid ruleId,
        [FromBody] UpdateRuleRepositoryRequest request,
        CancellationToken cancellationToken)
    {
        var artifact = await _dbContext.RuleArtifacts.FirstOrDefaultAsync(x => x.Id == ruleId, cancellationToken);
        if (artifact is null)
        {
            return NotFound();
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var scopeType = V2Mappings.ParseRuleScopeType(request.ScopeType);
        var lifecycleStatus = NormalizeRequired(request.Status, "draft");
        var normalizedTags = NormalizeTags(request.Tags);
        var updateValidation = await _validationPipeline.ValidateAsync(
            new RuleValidationPipelineRequest(
                RuleFamily: request.RuleFamily,
                OriginalContent: request.OriginalContent,
                Name: request.Name,
                Source: request.Source,
                Severity: request.Severity,
                Status: lifecycleStatus,
                ScopeType: scopeType,
                ScopeValue: request.ScopeValue,
                VersionLabel: request.VersionLabel,
                Tags: normalizedTags,
                ActorUserId: request.ActorUserId),
            cancellationToken);
        if (updateValidation.HasBlockingPersistenceErrors())
        {
            return BadRequest(BuildValidationFailureResponse(updateValidation));
        }

        artifact.UpdateRepositoryMetadata(
            request.Name,
            request.RuleFamily,
            request.Source,
            request.Description,
            normalizedTags,
            request.Severity,
            lifecycleStatus,
            scopeType,
            request.ScopeValue,
            request.ActorUserId,
            nowUtc);

        var revisionNumber = artifact.ReserveNextRevision(request.VersionLabel, request.ActorUserId, nowUtc);
        var metadataJson = SerializeMetadata(
            artifact.Name,
            artifact.RuleFamily,
            artifact.Source,
            artifact.Description,
            artifact.Tags,
            artifact.Severity,
            artifact.LifecycleStatus,
            artifact.ScopeType,
            artifact.ScopeValue);

        var revision = RuleRevision.CreateRepository(
            artifact.Id,
            revisionNumber,
            request.VersionLabel,
            request.OriginalContent,
            metadataJson,
            "updated",
            request.ChangeReason,
            lifecycleStatus,
            SerializeValidationResult(updateValidation),
            updateValidation.CanPersist,
            updateValidation.IsDeploymentReady,
            updateValidation.EvaluatedAtUtc,
            request.ActorUserId,
            nowUtc);

        _dbContext.RuleRevisionsV2.Add(revision);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            "rules.repository.update",
            "rule_artifact",
            artifact.Id.ToString("N"),
            new { artifact.Name, artifact.RuleFamily, revision.RevisionNumber, revision.VersionLabel },
            cancellationToken);

        var response = await BuildRuleDetailAsync(artifact.Id, cancellationToken);
        return Ok(response);
    }

    [HttpDelete("{ruleId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ArchiveRepositoryRule(
        Guid ruleId,
        [FromBody] ArchiveRuleRequest request,
        CancellationToken cancellationToken)
    {
        var artifact = await _dbContext.RuleArtifacts.FirstOrDefaultAsync(x => x.Id == ruleId, cancellationToken);
        if (artifact is null)
        {
            return NotFound();
        }

        if (artifact.IsDeleted)
        {
            return NoContent();
        }

        var nowUtc = DateTimeOffset.UtcNow;
        artifact.Archive(request.ActorUserId, nowUtc, lifecycleStatus: "retired");
        var versionLabel = BuildSystemVersionLabel(artifact.CurrentVersionLabel, artifact.CurrentRevisionNumber + 1, "archive");
        var revisionNumber = artifact.ReserveNextRevision(versionLabel, request.ActorUserId, nowUtc);
        var latestContent = await GetLatestOriginalContentAsync(artifact.Id, cancellationToken);
        var archiveValidation = await _validationPipeline.ValidateAsync(
            new RuleValidationPipelineRequest(
                RuleFamily: artifact.RuleFamily,
                OriginalContent: latestContent,
                Name: artifact.Name,
                Source: artifact.Source,
                Severity: artifact.Severity,
                Status: artifact.LifecycleStatus,
                ScopeType: artifact.ScopeType,
                ScopeValue: artifact.ScopeValue,
                VersionLabel: versionLabel,
                Tags: artifact.Tags,
                ActorUserId: request.ActorUserId),
            cancellationToken);
        if (archiveValidation.HasBlockingPersistenceErrors())
        {
            return BadRequest(BuildValidationFailureResponse(archiveValidation));
        }
        var metadataJson = SerializeMetadata(
            artifact.Name,
            artifact.RuleFamily,
            artifact.Source,
            artifact.Description,
            artifact.Tags,
            artifact.Severity,
            artifact.LifecycleStatus,
            artifact.ScopeType,
            artifact.ScopeValue);

        _dbContext.RuleRevisionsV2.Add(
            RuleRevision.CreateRepository(
                artifact.Id,
                revisionNumber,
                versionLabel,
                latestContent,
                metadataJson,
                "archived",
                request.ChangeReason,
                artifact.LifecycleStatus,
                SerializeValidationResult(archiveValidation),
                archiveValidation.CanPersist,
                archiveValidation.IsDeploymentReady,
                archiveValidation.EvaluatedAtUtc,
                request.ActorUserId,
                nowUtc));

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            "rules.repository.archive",
            "rule_artifact",
            artifact.Id.ToString("N"),
            new { artifact.Name, artifact.RuleFamily, revisionNumber },
            cancellationToken);

        return NoContent();
    }

    [HttpPost("{ruleId:guid}/restore")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleDetailResponse>> RestoreRepositoryRule(
        Guid ruleId,
        [FromBody] RestoreRuleRequest request,
        CancellationToken cancellationToken)
    {
        var artifact = await _dbContext.RuleArtifacts.FirstOrDefaultAsync(x => x.Id == ruleId, cancellationToken);
        if (artifact is null)
        {
            return NotFound();
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var restoredStatus = NormalizeRequired(request.RestoredStatus, "draft");
        artifact.Restore(request.ActorUserId, nowUtc, restoredStatus);
        var versionLabel = BuildSystemVersionLabel(artifact.CurrentVersionLabel, artifact.CurrentRevisionNumber + 1, "restore");
        var revisionNumber = artifact.ReserveNextRevision(versionLabel, request.ActorUserId, nowUtc);
        var latestContent = await GetLatestOriginalContentAsync(artifact.Id, cancellationToken);
        var restoreValidation = await _validationPipeline.ValidateAsync(
            new RuleValidationPipelineRequest(
                RuleFamily: artifact.RuleFamily,
                OriginalContent: latestContent,
                Name: artifact.Name,
                Source: artifact.Source,
                Severity: artifact.Severity,
                Status: artifact.LifecycleStatus,
                ScopeType: artifact.ScopeType,
                ScopeValue: artifact.ScopeValue,
                VersionLabel: versionLabel,
                Tags: artifact.Tags,
                ActorUserId: request.ActorUserId),
            cancellationToken);
        if (restoreValidation.HasBlockingPersistenceErrors())
        {
            return BadRequest(BuildValidationFailureResponse(restoreValidation));
        }
        var metadataJson = SerializeMetadata(
            artifact.Name,
            artifact.RuleFamily,
            artifact.Source,
            artifact.Description,
            artifact.Tags,
            artifact.Severity,
            artifact.LifecycleStatus,
            artifact.ScopeType,
            artifact.ScopeValue);

        _dbContext.RuleRevisionsV2.Add(
            RuleRevision.CreateRepository(
                artifact.Id,
                revisionNumber,
                versionLabel,
                latestContent,
                metadataJson,
                "restored",
                request.ChangeReason,
                artifact.LifecycleStatus,
                SerializeValidationResult(restoreValidation),
                restoreValidation.CanPersist,
                restoreValidation.IsDeploymentReady,
                restoreValidation.EvaluatedAtUtc,
                request.ActorUserId,
                nowUtc));

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            "rules.repository.restore",
            "rule_artifact",
            artifact.Id.ToString("N"),
            new { artifact.Name, artifact.RuleFamily, revisionNumber },
            cancellationToken);

        var response = await BuildRuleDetailAsync(artifact.Id, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{ruleId:guid}/revisions")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RuleRevisionItemResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<RuleRevisionItemResponse>>> ListRepositoryRevisions(
        Guid ruleId,
        CancellationToken cancellationToken)
    {
        var exists = await _dbContext.RuleArtifacts.AnyAsync(x => x.Id == ruleId, cancellationToken);
        if (!exists)
        {
            return NotFound();
        }

        var revisions = await _dbContext.RuleRevisionsV2
            .AsNoTracking()
            .Where(x => x.RuleArtifactId == ruleId)
            .OrderByDescending(x => x.RevisionNumber)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);

        var items = revisions
            .Select(x => x.ToRuleRevisionItemResponse(ParseValidationResult(x.ValidationResultJson)))
            .ToArray();

        return Ok(items);
    }

    [HttpGet("{ruleId:guid}/imports")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RuleImportAttemptResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<RuleImportAttemptResponse>>> ListRepositoryImports(
        Guid ruleId,
        CancellationToken cancellationToken)
    {
        var exists = await _dbContext.RuleArtifacts.AnyAsync(x => x.Id == ruleId, cancellationToken);
        if (!exists)
        {
            return NotFound();
        }

        var imports = await _dbContext.RuleImportAttempts
            .AsNoTracking()
            .Where(x => x.RuleArtifactId == ruleId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);

        var responses = imports
            .Select(x => x.ToRuleImportAttemptResponse(
                ParseDiagnostics(x.DiagnosticsJson),
                ParseValidationResult(x.ValidationResultJson)))
            .ToArray();

        return Ok(responses);
    }

    [HttpPost("import")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleImportAttemptResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<RuleImportAttemptResponse>> ImportRepositoryRule(
        [FromForm] ImportRuleForm request,
        CancellationToken cancellationToken)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var actorUserId = NormalizeNullable(request.ActorUserId) ?? "unknown";
        var fileName = request.File?.FileName?.Trim();
        if (string.IsNullOrWhiteSpace(fileName))
        {
            fileName = "missing-file";
        }

        var fileBytes = request.File is null ? [] : await ReadBytesAsync(request.File, cancellationToken);
        var fileHash = ComputeSha256(fileBytes);
        var declaredFamilyRaw = NormalizeNullable(request.DeclaredRuleFamily) ?? "unknown";

        var sourceMetadataJson = JsonSerializer.Serialize(
            new
            {
                request.DeclaredRuleFamily,
                request.Name,
                request.Source,
                request.Description,
                request.Tags,
                request.Severity,
                request.Status,
                request.ScopeType,
                request.ScopeValue,
                request.VersionLabel,
                request.ChangeReason,
                request.ActorUserId,
                fileName,
            },
            JsonOptions);

        var attempt = RuleImportAttempt.Create(
            fileName,
            fileHash,
            declaredFamilyRaw,
            sourceMetadataJson,
            actorUserId,
            nowUtc);

        _dbContext.RuleImportAttempts.Add(attempt);
        await _dbContext.SaveChangesAsync(cancellationToken);

        RuleValidationResultResponse validationResult = BuildUnavailableValidationResult("Validation did not complete.");
        var diagnostics = new List<RuleValidationDiagnosticResponse>();
        try
        {
            string? normalizedFamily = null;
            if (!RuleFamilyCatalog.TryNormalize(request.DeclaredRuleFamily, out var parsedFamily))
            {
                normalizedFamily = null;
            }
            else
            {
                normalizedFamily = parsedFamily;
            }

            var content = fileBytes.Length == 0 ? string.Empty : Encoding.UTF8.GetString(fileBytes);
            var parsedMetadata = ParseMetadataSnapshot(content, normalizedFamily ?? declaredFamilyRaw);
            var parsedMetadataJson = JsonSerializer.Serialize(parsedMetadata, JsonOptions);
            var merged = MergeImportMetadata(request, parsedMetadata, fileName, normalizedFamily);
            validationResult = await _validationPipeline.ValidateAsync(
                new RuleValidationPipelineRequest(
                    RuleFamily: merged.RuleFamily,
                    OriginalContent: content,
                    Name: merged.Name,
                    Source: merged.Source,
                    Severity: merged.Severity,
                    Status: merged.Status,
                    ScopeType: merged.ScopeType,
                    ScopeValue: merged.ScopeValue,
                    VersionLabel: merged.VersionLabel,
                    Tags: merged.Tags,
                    FileName: fileName,
                    ActorUserId: request.ActorUserId ?? string.Empty),
                cancellationToken);
            diagnostics = validationResult.FlattenDiagnostics().ToList();

            if (validationResult.HasBlockingPersistenceErrors())
            {
                attempt.Complete(
                    wasSuccessful: false,
                    diagnosticsJson: SerializeDiagnostics(diagnostics),
                    validationResultJson: SerializeValidationResult(validationResult),
                    parsedMetadataJson: parsedMetadataJson,
                    failureReason: diagnostics.FirstOrDefault(x => string.Equals(x.Severity, "error", StringComparison.OrdinalIgnoreCase))?.Message
                        ?? "Import validation failed.",
                    ruleArtifactId: null,
                    ruleRevisionId: null,
                    actorUserId,
                    DateTimeOffset.UtcNow);
                await _dbContext.SaveChangesAsync(cancellationToken);
                return Ok(attempt.ToRuleImportAttemptResponse(
                    ParseDiagnostics(attempt.DiagnosticsJson),
                    ParseValidationResult(attempt.ValidationResultJson)));
            }

            var saveActor = string.IsNullOrWhiteSpace(request.ActorUserId) ? actorUserId : request.ActorUserId.Trim();
            var saveNow = DateTimeOffset.UtcNow;
            var artifact = RuleArtifact.CreateRepository(
                merged.Name,
                merged.RuleFamily,
                merged.Source,
                merged.Description,
                merged.Tags,
                merged.Severity,
                merged.Status,
                merged.ScopeType,
                merged.ScopeValue,
                saveActor,
                saveNow);

            var revisionNumber = artifact.ReserveNextRevision(merged.VersionLabel, saveActor, saveNow);
            var metadataJson = SerializeMetadata(
                artifact.Name,
                artifact.RuleFamily,
                artifact.Source,
                artifact.Description,
                artifact.Tags,
                artifact.Severity,
                artifact.LifecycleStatus,
                artifact.ScopeType,
                artifact.ScopeValue);

            var revision = RuleRevision.CreateRepository(
                artifact.Id,
                revisionNumber,
                merged.VersionLabel,
                content,
                metadataJson,
                "imported",
                merged.ChangeReason,
                merged.Status,
                SerializeValidationResult(validationResult),
                validationResult.CanPersist,
                validationResult.IsDeploymentReady,
                validationResult.EvaluatedAtUtc,
                saveActor,
                saveNow,
                importAttemptId: attempt.Id);

            _dbContext.RuleArtifacts.Add(artifact);
            _dbContext.RuleRevisionsV2.Add(revision);
            await _dbContext.SaveChangesAsync(cancellationToken);

            attempt.Complete(
                wasSuccessful: true,
                diagnosticsJson: SerializeDiagnostics(diagnostics),
                validationResultJson: SerializeValidationResult(validationResult),
                parsedMetadataJson: parsedMetadataJson,
                failureReason: null,
                ruleArtifactId: artifact.Id,
                ruleRevisionId: revision.Id,
                actorUserId: saveActor,
                nowUtc: DateTimeOffset.UtcNow);
            await _dbContext.SaveChangesAsync(cancellationToken);

            await _auditService.TryWriteAsync(
                User,
                "rules.repository.import",
                "rule_import_attempt",
                attempt.Id.ToString("N"),
                new
                {
                    attempt.FileName,
                    RuleArtifactId = artifact.Id,
                    RuleRevisionId = revision.Id,
                    attempt.WasSuccessful,
                },
                cancellationToken);
        }
        catch (DbUpdateException)
        {
            AddError(diagnostics, "import.persistence.failed", "Import persistence failed. Review metadata uniqueness and validation.");
            attempt.Complete(
                wasSuccessful: false,
                diagnosticsJson: SerializeDiagnostics(diagnostics),
                validationResultJson: SerializeValidationResult(validationResult),
                parsedMetadataJson: attempt.ParsedMetadataJson,
                failureReason: "Import persistence failed.",
                ruleArtifactId: null,
                ruleRevisionId: null,
                actorUserId,
                nowUtc: DateTimeOffset.UtcNow);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            AddError(diagnostics, "import.unexpected", ex.Message);
            attempt.Complete(
                wasSuccessful: false,
                diagnosticsJson: SerializeDiagnostics(diagnostics),
                validationResultJson: SerializeValidationResult(validationResult),
                parsedMetadataJson: attempt.ParsedMetadataJson,
                failureReason: ex.Message,
                ruleArtifactId: null,
                ruleRevisionId: null,
                actorUserId,
                nowUtc: DateTimeOffset.UtcNow);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        await _dbContext.Entry(attempt).ReloadAsync(cancellationToken);
        return Ok(attempt.ToRuleImportAttemptResponse(
            ParseDiagnostics(attempt.DiagnosticsJson),
            ParseValidationResult(attempt.ValidationResultJson)));
    }

    [HttpGet("artifacts")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RuleArtifactResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RuleArtifactResponse>>> ListArtifacts(
        [FromQuery] bool includeDeleted = false,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.RuleArtifacts.AsNoTracking().AsQueryable();
        if (!includeDeleted)
        {
            query = query.Where(x => !x.IsDeleted);
        }

        var items = await query
            .OrderBy(x => x.Name)
            .Select(x => x.ToRuleArtifactResponse())
            .ToArrayAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost("artifacts")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleArtifactResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<RuleArtifactResponse>> CreateArtifact(
        [FromBody] CreateRuleArtifactRequest request,
        CancellationToken cancellationToken)
    {
        var entity = RuleArtifact.Create(
            request.Name,
            request.RuleFamily,
            request.Description,
            request.ActorUserId,
            DateTimeOffset.UtcNow);

        _dbContext.RuleArtifacts.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            "rules.artifact.create",
            "rule_artifact",
            entity.Id.ToString("N"),
            new { entity.Name, entity.RuleFamily },
            cancellationToken);

        return CreatedAtAction(nameof(ListArtifacts), new { id = entity.Id }, entity.ToRuleArtifactResponse());
    }

    [HttpGet("revisions")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RuleRevisionResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RuleRevisionResponse>>> ListRevisionsLegacy(
        [FromQuery] Guid? ruleArtifactId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.RuleRevisionsV2.AsNoTracking().AsQueryable();
        if (ruleArtifactId.HasValue)
        {
            query = query.Where(x => x.RuleArtifactId == ruleArtifactId.Value);
        }

        var items = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => x.ToRuleRevisionResponse())
            .ToArrayAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost("revisions")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleRevisionResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleRevisionResponse>> CreateRevision(
        [FromBody] CreateRuleRevisionRequest request,
        CancellationToken cancellationToken)
    {
        var artifact = await _dbContext.RuleArtifacts.FirstOrDefaultAsync(x => x.Id == request.RuleArtifactId, cancellationToken);
        if (artifact is null)
        {
            return NotFound();
        }

        if (request.RevisionNumber != artifact.CurrentRevisionNumber + 1)
        {
            return BadRequest($"RevisionNumber must equal next revision ({artifact.CurrentRevisionNumber + 1}).");
        }

        var legacyStatus = V2Mappings.ParseEnum<RuleRevisionStatus>(request.Status, nameof(request.Status));
        var lifecycleStatus = LegacyToLifecycleStatus(legacyStatus);
        var revisionValidation = await _validationPipeline.ValidateAsync(
            new RuleValidationPipelineRequest(
                RuleFamily: artifact.RuleFamily,
                OriginalContent: request.RuleBody,
                Name: artifact.Name,
                Source: artifact.Source,
                Severity: artifact.Severity,
                Status: lifecycleStatus,
                ScopeType: artifact.ScopeType,
                ScopeValue: artifact.ScopeValue,
                VersionLabel: $"v{request.RevisionNumber}",
                Tags: artifact.Tags,
                ActorUserId: request.ActorUserId),
            cancellationToken);
        if (revisionValidation.HasBlockingPersistenceErrors())
        {
            return BadRequest(BuildValidationFailureResponse(revisionValidation));
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var nextVersionLabel = $"v{request.RevisionNumber}";
        var revisionNumber = artifact.ReserveNextRevision(nextVersionLabel, request.ActorUserId, nowUtc);
        var metadataJson = SerializeMetadata(
            artifact.Name,
            artifact.RuleFamily,
            artifact.Source,
            artifact.Description,
            artifact.Tags,
            artifact.Severity,
            artifact.LifecycleStatus,
            artifact.ScopeType,
            artifact.ScopeValue);

        var revision = RuleRevision.CreateRepository(
            artifact.Id,
            revisionNumber,
            nextVersionLabel,
            request.RuleBody,
            metadataJson,
            "updated",
            null,
            lifecycleStatus,
            SerializeValidationResult(revisionValidation),
            revisionValidation.CanPersist,
            revisionValidation.IsDeploymentReady,
            revisionValidation.EvaluatedAtUtc,
            request.ActorUserId,
            nowUtc,
            status: legacyStatus);

        _dbContext.RuleRevisionsV2.Add(revision);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.TryWriteAsync(
            User,
            "rules.revision.create",
            "rule_revision",
            revision.Id.ToString("N"),
            new { revision.RuleArtifactId, revision.RevisionNumber },
            cancellationToken);

        return CreatedAtAction(
            nameof(ListRevisionsLegacy),
            new { ruleArtifactId = revision.RuleArtifactId },
            revision.ToRuleRevisionResponse());
    }

    [HttpGet("distributions")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RuleDistributionResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RuleDistributionResponse>>> ListDistributions(
        [FromQuery] Guid? ruleRevisionId = null,
        [FromQuery] Guid? targetServerId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.RuleDistributions.AsNoTracking().AsQueryable();
        if (ruleRevisionId.HasValue)
        {
            query = query.Where(x => x.RuleRevisionId == ruleRevisionId.Value);
        }

        if (targetServerId.HasValue)
        {
            query = query.Where(x => x.TargetServerId == targetServerId.Value);
        }

        var items = await query
            .OrderByDescending(x => x.DistributedAtUtc)
            .Select(x => x.ToRuleDistributionResponse())
            .ToArrayAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost("distributions")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public async Task<ActionResult<RuleDistributionResponse>> CreateDistribution(
        [FromBody] CreateRuleDistributionRequest request,
        CancellationToken cancellationToken)
    {
        _ = request;
        await Task.CompletedTask;
        return StatusCode(
            StatusCodes.Status410Gone,
            "Legacy distribution mutation endpoint is retired. Use /api/v2/rules/distribution-jobs.");
    }

    [HttpPatch("distributions/{distributionId:guid}/status")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public async Task<ActionResult<RuleDistributionResponse>> UpdateDistributionStatus(
        Guid distributionId,
        [FromBody] UpdateRuleDistributionStatusRequest request,
        CancellationToken cancellationToken)
    {
        _ = distributionId;
        _ = request;
        await Task.CompletedTask;
        return StatusCode(
            StatusCodes.Status410Gone,
            "Legacy distribution mutation endpoint is retired. Use /api/v2/rules/distribution-jobs.");
    }

    private async Task<RuleDetailResponse?> BuildRuleDetailAsync(Guid ruleId, CancellationToken cancellationToken)
    {
        var artifact = await _dbContext.RuleArtifacts
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == ruleId, cancellationToken);
        if (artifact is null)
        {
            return null;
        }

        var revisions = await _dbContext.RuleRevisionsV2
            .AsNoTracking()
            .Where(x => x.RuleArtifactId == ruleId)
            .OrderByDescending(x => x.RevisionNumber)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);

        var revisionItems = revisions
            .Select(x => x.ToRuleRevisionItemResponse(ParseValidationResult(x.ValidationResultJson)))
            .ToArray();

        var currentRevision = revisionItems.FirstOrDefault(x => x.RevisionNumber == artifact.CurrentRevisionNumber)
            ?? revisionItems.FirstOrDefault()
            ?? new RuleRevisionItemResponse(
                Guid.Empty,
                artifact.Id,
                artifact.CurrentRevisionNumber,
                artifact.CurrentVersionLabel,
                string.Empty,
                SerializeMetadata(
                    artifact.Name,
                    artifact.RuleFamily,
                    artifact.Source,
                    artifact.Description,
                    artifact.Tags,
                    artifact.Severity,
                    artifact.LifecycleStatus,
                    artifact.ScopeType,
                    artifact.ScopeValue),
                "synthetic",
                null,
                artifact.LifecycleStatus,
                BuildUnavailableValidationResult("Synthetic revision does not contain persisted validation output."),
                null,
                artifact.UpdatedAtUtc,
                artifact.UpdatedByUserId);

        var imports = await _dbContext.RuleImportAttempts
            .AsNoTracking()
            .Where(x => x.RuleArtifactId == ruleId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);

        var importItems = imports
            .Select(x => x.ToRuleImportAttemptResponse(
                ParseDiagnostics(x.DiagnosticsJson),
                ParseValidationResult(x.ValidationResultJson)))
            .ToArray();

        return new RuleDetailResponse(
            artifact.ToRuleListItemResponse(),
            currentRevision,
            revisionItems,
            importItems);
    }

    private static RuleArtifact[] ApplySort(RuleArtifact[] source, string? sort)
    {
        var normalizedSort = NormalizeRequired(sort, "updated_desc");
        return normalizedSort switch
        {
            "updated_asc" => source
                .OrderBy(x => x.UpdatedAtUtc)
                .ThenBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
                .ToArray(),
            "name_asc" => source
                .OrderBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
                .ThenByDescending(x => x.UpdatedAtUtc)
                .ToArray(),
            "name_desc" => source
                .OrderByDescending(x => x.Name, StringComparer.OrdinalIgnoreCase)
                .ThenByDescending(x => x.UpdatedAtUtc)
                .ToArray(),
            "created_asc" => source
                .OrderBy(x => x.CreatedAtUtc)
                .ThenBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
                .ToArray(),
            "created_desc" => source
                .OrderByDescending(x => x.CreatedAtUtc)
                .ThenBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
                .ToArray(),
            _ => source
                .OrderByDescending(x => x.UpdatedAtUtc)
                .ThenBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
                .ToArray(),
        };
    }

    private static bool IsMatch(
        RuleArtifact artifact,
        string? normalizedQuery,
        bool includeContent,
        IReadOnlyDictionary<Guid, string[]> revisionBodiesByRuleId)
    {
        if (string.IsNullOrWhiteSpace(normalizedQuery))
        {
            return true;
        }

        var q = normalizedQuery.Trim();
        var fields = new[]
        {
            artifact.Name,
            artifact.RuleFamily,
            artifact.Source,
            artifact.Description,
            artifact.Severity,
            artifact.LifecycleStatus,
            artifact.ScopeType.ToString(),
            artifact.ScopeValue,
            artifact.CurrentVersionLabel,
            artifact.CreatedByUserId,
            artifact.UpdatedByUserId,
        };

        if (fields.Any(x => !string.IsNullOrWhiteSpace(x) && x.Contains(q, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        if (artifact.Tags.Any(x => x.Contains(q, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        if (includeContent
            && revisionBodiesByRuleId.TryGetValue(artifact.Id, out var bodies)
            && bodies.Any(x => x.Contains(q, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        return false;
    }

    private static string SerializeMetadata(
        string name,
        string ruleFamily,
        string source,
        string description,
        IReadOnlyList<string> tags,
        string severity,
        string status,
        RuleScopeType scopeType,
        string? scopeValue)
    {
        return JsonSerializer.Serialize(
            new
            {
                name,
                ruleFamily,
                source,
                description,
                tags,
                severity,
                status,
                scopeType = scopeType.ToString().ToLowerInvariant(),
                scopeValue,
            },
            JsonOptions);
    }

    private static string SerializeDiagnostics(IReadOnlyList<RuleValidationDiagnosticResponse> diagnostics)
    {
        return JsonSerializer.Serialize(diagnostics, JsonOptions);
    }

    private static IReadOnlyList<RuleValidationDiagnosticResponse> ParseDiagnostics(string diagnosticsJson)
    {
        if (string.IsNullOrWhiteSpace(diagnosticsJson))
        {
            return [];
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<RuleValidationDiagnosticResponse[]>(diagnosticsJson, JsonOptions);
            return parsed ?? [];
        }
        catch
        {
            return
            [
                new RuleValidationDiagnosticResponse(
                    "diagnostics.parse.failed",
                    "note",
                    "Stored diagnostics could not be parsed.",
                    null,
                    null),
            ];
        }
    }

    private static string SerializeValidationResult(RuleValidationResultResponse validationResult)
    {
        return JsonSerializer.Serialize(validationResult, JsonOptions);
    }

    private static RuleValidationResultResponse ParseValidationResult(string? validationResultJson)
    {
        if (string.IsNullOrWhiteSpace(validationResultJson))
        {
            return BuildUnavailableValidationResult("Validation snapshot is unavailable.");
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<RuleValidationResultResponse>(validationResultJson, JsonOptions);
            return parsed ?? BuildUnavailableValidationResult("Validation snapshot is unavailable.");
        }
        catch
        {
            return BuildUnavailableValidationResult("Stored validation snapshot could not be parsed.");
        }
    }

    private static RuleValidationResultResponse BuildUnavailableValidationResult(string message)
    {
        var diagnostic = new RuleValidationDiagnosticResponse(
            "validation.snapshot.unavailable",
            "note",
            message,
            null,
            null);

        return new RuleValidationResultResponse(
            CanPersist: false,
            IsDeploymentReady: false,
            EvaluatedAtUtc: DateTimeOffset.UnixEpoch,
            Stages:
            [
                new RuleValidationStageResultResponse("syntax", false, "not_available", message, [diagnostic]),
                new RuleValidationStageResultResponse("metadata", false, "not_available", message, []),
                new RuleValidationStageResultResponse("deployment_readiness", false, "not_available", message, []),
            ]);
    }

    private static object BuildValidationFailureResponse(RuleValidationResultResponse validation)
    {
        var blockingMessages = validation.Stages
            .Where(x => string.Equals(x.Stage, "syntax", StringComparison.OrdinalIgnoreCase)
                || string.Equals(x.Stage, "metadata", StringComparison.OrdinalIgnoreCase))
            .SelectMany(x => x.Diagnostics)
            .Where(x => string.Equals(x.Severity, "error", StringComparison.OrdinalIgnoreCase))
            .Select(x => x.Message)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new
        {
            code = "rule.validation.failed",
            message = "Rule validation failed.",
            blockingMessages,
            validation,
        };
    }

    private static ParsedImportMetadata ParseMetadataSnapshot(string content, string family)
    {
        var name = family switch
        {
            "yara" => ReadMatch(YaraNameRegex, content, "name"),
            "snort" => ReadMatch(SnortMessageRegex, content, "value"),
            _ => ReadMatch(YamlTitleRegex, content, "value"),
        };

        var description = ReadMatch(DescriptionRegex, content, "value");
        if (string.IsNullOrWhiteSpace(description) && family == "snort")
        {
            description = ReadMatch(SnortMessageRegex, content, "value");
        }

        var severity = ReadMatch(SeverityRegex, content, "value");
        if (string.IsNullOrWhiteSpace(severity) && family == "snort")
        {
            var priority = ReadMatch(SnortPriorityRegex, content, "value");
            severity = priority switch
            {
                "1" => "critical",
                "2" => "high",
                "3" => "medium",
                "4" => "low",
                _ => null,
            };
        }

        var status = ReadMatch(StatusRegex, content, "value");
        var scopeType = ReadMatch(ScopeTypeRegex, content, "value");
        var scopeValue = ReadMatch(ScopeValueRegex, content, "value");
        var versionLabel = ReadMatch(VersionRegex, content, "value");
        var tags = ParseTags(content);

        return new ParsedImportMetadata(
            NormalizeNullable(name),
            NormalizeNullable(description),
            tags,
            NormalizeNullable(severity),
            NormalizeNullable(status),
            NormalizeNullable(scopeType),
            NormalizeNullable(scopeValue),
            NormalizeNullable(versionLabel));
    }

    private static string? ReadMatch(Regex regex, string content, string groupName)
    {
        var match = regex.Match(content);
        if (!match.Success)
        {
            return null;
        }

        var value = match.Groups[groupName].Value;
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string[] ParseTags(string content)
    {
        var line = Regex.Match(content, @"^\s*tags?\s*:\s*(?<value>.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
        if (line.Success)
        {
            return SplitTags(line.Groups["value"].Value);
        }

        var list = new List<string>();
        var capture = false;
        foreach (var rawLine in content.Split('\n'))
        {
            var lineValue = rawLine.TrimEnd('\r');
            if (!capture && Regex.IsMatch(lineValue, @"^\s*tags?\s*:\s*$", RegexOptions.IgnoreCase))
            {
                capture = true;
                continue;
            }

            if (!capture)
            {
                continue;
            }

            var item = Regex.Match(lineValue, @"^\s*-\s*(?<value>.+)$");
            if (!item.Success)
            {
                break;
            }

            list.Add(item.Groups["value"].Value);
        }

        return NormalizeTags(list);
    }

    private static MergedImportMetadata MergeImportMetadata(
        ImportRuleForm request,
        ParsedImportMetadata parsed,
        string fileName,
        string? normalizedFamily)
    {
        var fallbackName = Path.GetFileNameWithoutExtension(fileName);
        var mergedName = NormalizeNullable(request.Name) ?? parsed.Name ?? fallbackName;
        var mergedFamily = normalizedFamily ?? (NormalizeNullable(request.DeclaredRuleFamily) ?? string.Empty);
        var mergedSource = NormalizeNullable(request.Source) ?? "import";
        var mergedDescription = NormalizeNullable(request.Description) ?? parsed.Description ?? string.Empty;
        var mergedTags = !string.IsNullOrWhiteSpace(request.Tags) ? SplitTags(request.Tags) : parsed.Tags;
        var mergedSeverity = NormalizeNullable(request.Severity) ?? parsed.Severity ?? "medium";
        var mergedStatus = NormalizeNullable(request.Status) ?? parsed.Status ?? "draft";
        var mergedScopeTypeRaw = NormalizeNullable(request.ScopeType) ?? parsed.ScopeType ?? "global";
        var mergedScopeValue = NormalizeNullable(request.ScopeValue) ?? parsed.ScopeValue;
        var mergedVersionLabel = NormalizeNullable(request.VersionLabel) ?? parsed.VersionLabel ?? "v1";
        var mergedChangeReason = NormalizeNullable(request.ChangeReason);

        var scopeType = SupportedScopeTypes.Contains(mergedScopeTypeRaw)
            ? V2Mappings.ParseRuleScopeType(mergedScopeTypeRaw)
            : RuleScopeType.Global;

        return new MergedImportMetadata(
            mergedName,
            mergedFamily,
            mergedSource,
            mergedDescription,
            mergedTags,
            mergedSeverity,
            mergedStatus,
            scopeType,
            mergedScopeValue,
            mergedVersionLabel,
            mergedChangeReason);
    }

    private async Task<string> GetLatestOriginalContentAsync(Guid ruleArtifactId, CancellationToken cancellationToken)
    {
        var latest = await _dbContext.RuleRevisionsV2
            .AsNoTracking()
            .Where(x => x.RuleArtifactId == ruleArtifactId)
            .OrderByDescending(x => x.RevisionNumber)
            .Select(x => x.OriginalContent)
            .FirstOrDefaultAsync(cancellationToken);

        return latest ?? string.Empty;
    }

    private static async Task<byte[]> ReadBytesAsync(IFormFile file, CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        using var memory = new MemoryStream();
        await stream.CopyToAsync(memory, cancellationToken);
        return memory.ToArray();
    }

    private static string ComputeSha256(byte[] bytes)
    {
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string BuildSystemVersionLabel(string? currentVersionLabel, int nextRevisionNumber, string changeKind)
    {
        var baseLabel = string.IsNullOrWhiteSpace(currentVersionLabel) ? $"v{nextRevisionNumber}" : currentVersionLabel.Trim();
        var combined = $"{baseLabel}-{changeKind}-{nextRevisionNumber}";
        return combined.Length <= 64 ? combined : $"v{nextRevisionNumber}";
    }

    private static void AddError(ICollection<RuleValidationDiagnosticResponse> diagnostics, string code, string message)
    {
        diagnostics.Add(new RuleValidationDiagnosticResponse(code, "error", message, null, null));
    }

    private static string LegacyToLifecycleStatus(RuleRevisionStatus status)
    {
        return status switch
        {
            RuleRevisionStatus.Published => "approved",
            RuleRevisionStatus.Deprecated => "retired",
            RuleRevisionStatus.Validated => "validated",
            _ => "draft",
        };
    }

    private static DateTimeOffset? ParseOptionalDate(string? rawValue, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return null;
        }

        if (DateTimeOffset.TryParse(
            rawValue,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AllowWhiteSpaces | DateTimeStyles.AssumeUniversal,
            out var parsed))
        {
            return parsed.ToUniversalTime();
        }

        throw new ArgumentException($"Invalid UTC date value for '{fieldName}'.", fieldName);
    }

    private static string NormalizeRequired(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim().ToLowerInvariant();
    }

    private static string? NormalizeNullable(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToLowerInvariant();
    }

    private static string[] NormalizeTags(IEnumerable<string>? tags)
    {
        if (tags is null)
        {
            return [];
        }

        return tags
            .Select(x => x.Trim().ToLowerInvariant())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string[] SplitTags(string? csv)
    {
        if (string.IsNullOrWhiteSpace(csv))
        {
            return [];
        }

        var normalized = csv
            .Replace("[", string.Empty, StringComparison.Ordinal)
            .Replace("]", string.Empty, StringComparison.Ordinal)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return NormalizeTags(normalized);
    }

    public sealed class ImportRuleForm
    {
        public IFormFile? File { get; init; }
        public string DeclaredRuleFamily { get; init; } = string.Empty;
        public string? Name { get; init; }
        public string? Source { get; init; }
        public string? Description { get; init; }
        public string? Tags { get; init; }
        public string? Severity { get; init; }
        public string? Status { get; init; }
        public string? ScopeType { get; init; }
        public string? ScopeValue { get; init; }
        public string? VersionLabel { get; init; }
        public string? ChangeReason { get; init; }
        public string? ActorUserId { get; init; }
    }

    private sealed record ParsedImportMetadata(
        string? Name,
        string? Description,
        string[] Tags,
        string? Severity,
        string? Status,
        string? ScopeType,
        string? ScopeValue,
        string? VersionLabel);

    private sealed record MergedImportMetadata(
        string Name,
        string RuleFamily,
        string Source,
        string Description,
        string[] Tags,
        string Severity,
        string Status,
        RuleScopeType ScopeType,
        string? ScopeValue,
        string VersionLabel,
        string? ChangeReason);
}
