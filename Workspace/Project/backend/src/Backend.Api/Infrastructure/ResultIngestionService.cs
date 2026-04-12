using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Backend.Domain.Common;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Infrastructure;

public interface IResultIngestionService
{
    Task<ResultIngestionBatchResult> IngestAsync(ResultIngestionBatchRequest request, CancellationToken cancellationToken);
}

public sealed record ResultIngestionBatchRequest(
    string Source,
    string ActorUserId,
    IReadOnlyList<ResultIngestionInputRow> Rows);

public sealed record ResultIngestionInputRow(
    string ScannerFamily,
    JsonElement Payload);

public sealed record ResultIngestionBatchResult(
    Guid IngestionRunId,
    int TotalRows,
    int AcceptedRows,
    int DeduplicatedRows,
    int RejectedRows,
    IReadOnlyList<ResultIngestionAcceptedRow> Accepted,
    IReadOnlyList<ResultIngestionDiagnosticRow> Diagnostics);

public sealed record ResultIngestionAcceptedRow(
    int RowIndex,
    Guid ScanResultId,
    bool Deduplicated,
    string Fingerprint);

public sealed record ResultIngestionDiagnosticRow(
    int RowIndex,
    string Code,
    string Field,
    string Message,
    string RawSnippetHash);

public sealed class ResultIngestionService : IResultIngestionService
{
    private const int AcceptedRawSampleMaxChars = 4000;

    private readonly CtiDbContext _dbContext;
    private readonly IReadOnlyDictionary<string, IFamilyResultNormalizer> _normalizers;

    public ResultIngestionService(CtiDbContext dbContext)
    {
        _dbContext = dbContext;
        _normalizers = new Dictionary<string, IFamilyResultNormalizer>(StringComparer.OrdinalIgnoreCase)
        {
            ["yara"] = new YaraResultNormalizer(),
            ["sigma"] = new SigmaResultNormalizer(),
            ["snort"] = new SnortResultNormalizer(),
            ["suricata"] = new SuricataResultNormalizer(),
        };
    }

    public async Task<ResultIngestionBatchResult> IngestAsync(ResultIngestionBatchRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var source = string.IsNullOrWhiteSpace(request.Source) ? "unknown" : request.Source.Trim().ToLowerInvariant();
        var actorUserId = string.IsNullOrWhiteSpace(request.ActorUserId) ? "system-result-ingestion" : request.ActorUserId.Trim();
        var rows = request.Rows ?? Array.Empty<ResultIngestionInputRow>();
        var nowUtc = DateTimeOffset.UtcNow;

        var requestPayloadHash = ComputeSha256Hex(
            string.Join('\n', rows.Select(static row => $"{row.ScannerFamily}:{GetRawTextOrEmpty(row.Payload)}")));

        var ingestionRun = ScanResultIngestionRun.Start(
            source,
            rows.Count,
            requestPayloadHash,
            actorUserId,
            nowUtc);
        _dbContext.ScanResultIngestionRuns.Add(ingestionRun);

        var diagnostics = new List<ResultIngestionDiagnosticRow>();
        var diagnosticEntities = new List<ScanResultIngestionDiagnostic>();
        var candidateRows = new List<CandidateRow>();

        for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
        {
            var row = rows[rowIndex];
            var rawPayloadJson = GetRawTextOrEmpty(row.Payload);
            var rawPayloadHash = ComputeSha256Hex(rawPayloadJson);
            if (!RuleFamilyCatalog.TryNormalize(row.ScannerFamily, out var normalizedFamily))
            {
                AddDiagnostic(
                    rowIndex,
                    "invalid_family",
                    nameof(ResultIngestionInputRow.ScannerFamily),
                    $"Scanner family '{row.ScannerFamily}' is not supported.",
                    rawPayloadHash,
                    rawPayloadJson,
                    diagnostics,
                    diagnosticEntities,
                    ingestionRun.Id,
                    actorUserId,
                    nowUtc);
                continue;
            }

            if (!_normalizers.TryGetValue(normalizedFamily, out var normalizer))
            {
                AddDiagnostic(
                    rowIndex,
                    "unsupported_family",
                    nameof(ResultIngestionInputRow.ScannerFamily),
                    $"No normalizer is registered for scanner family '{normalizedFamily}'.",
                    rawPayloadHash,
                    rawPayloadJson,
                    diagnostics,
                    diagnosticEntities,
                    ingestionRun.Id,
                    actorUserId,
                    nowUtc);
                continue;
            }

            if (!normalizer.TryNormalize(row.Payload, out var candidate, out var error))
            {
                AddDiagnostic(
                    rowIndex,
                    error.Code,
                    error.Field,
                    error.Message,
                    rawPayloadHash,
                    rawPayloadJson,
                    diagnostics,
                    diagnosticEntities,
                    ingestionRun.Id,
                    actorUserId,
                    nowUtc);
                continue;
            }

            candidateRows.Add(new CandidateRow(rowIndex, candidate, rawPayloadJson, rawPayloadHash));
        }

        var accepted = new List<ResultIngestionAcceptedRow>();
        if (candidateRows.Count > 0)
        {
            var validServerIds = await _dbContext.TargetServers
                .AsNoTracking()
                .Where(x => candidateRows.Select(row => row.Candidate.ServerId).Contains(x.Id))
                .Select(x => x.Id)
                .ToListAsync(cancellationToken);
            var serverSet = validServerIds.ToHashSet();

            var iocCandidates = candidateRows
                .Where(row => row.Candidate.IocId.HasValue)
                .Select(row => row.Candidate.IocId!.Value)
                .Distinct()
                .ToArray();
            var validIocSet = await _dbContext.Iocs
                .AsNoTracking()
                .Where(x => iocCandidates.Contains(x.Id))
                .Select(x => x.Id)
                .ToListAsync(cancellationToken);
            var validIocHashSet = validIocSet.ToHashSet();

            var scanJobCandidates = candidateRows
                .Where(row => row.Candidate.ScanJobId.HasValue)
                .Select(row => row.Candidate.ScanJobId!.Value)
                .Distinct()
                .ToArray();
            var validScanJobSet = await _dbContext.ScanJobs
                .AsNoTracking()
                .Where(x => scanJobCandidates.Contains(x.Id))
                .Select(x => x.Id)
                .ToListAsync(cancellationToken);
            var validScanJobHashSet = validScanJobSet.ToHashSet();

            var attemptCandidates = candidateRows
                .Where(row => row.Candidate.JobAttemptId.HasValue)
                .Select(row => row.Candidate.JobAttemptId!.Value)
                .Distinct()
                .ToArray();
            var validAttemptSet = await _dbContext.JobAttempts
                .AsNoTracking()
                .Where(x => attemptCandidates.Contains(x.Id))
                .Select(x => x.Id)
                .ToListAsync(cancellationToken);
            var validAttemptHashSet = validAttemptSet.ToHashSet();

            var targetExecutionCandidates = candidateRows
                .Where(row => row.Candidate.TargetExecutionId.HasValue)
                .Select(row => row.Candidate.TargetExecutionId!.Value)
                .Distinct()
                .ToArray();
            var validTargetExecutionSet = await _dbContext.ScanJobTargetExecutions
                .AsNoTracking()
                .Where(x => targetExecutionCandidates.Contains(x.Id))
                .Select(x => x.Id)
                .ToListAsync(cancellationToken);
            var validTargetExecutionHashSet = validTargetExecutionSet.ToHashSet();

            var explicitRevisionIds = candidateRows
                .Where(row => row.Candidate.RuleRevisionId.HasValue)
                .Select(row => row.Candidate.RuleRevisionId!.Value)
                .Distinct()
                .ToArray();

            var explicitRevisionRows = await (
                from revision in _dbContext.RuleRevisionsV2.AsNoTracking()
                join artifact in _dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id
                where explicitRevisionIds.Contains(revision.Id)
                select new RuleRevisionResolution(
                    revision.Id,
                    revision.RuleArtifactId,
                    artifact.Name,
                    artifact.RuleFamily))
                .ToArrayAsync(cancellationToken);
            var explicitRevisionById = explicitRevisionRows.ToDictionary(x => x.RuleRevisionId);

            var artifactIdCandidates = candidateRows
                .Where(row => row.Candidate.RuleArtifactId.HasValue)
                .Select(row => row.Candidate.RuleArtifactId!.Value)
                .Distinct()
                .ToArray();
            var artifactNameCandidates = candidateRows
                .Where(row => !string.IsNullOrWhiteSpace(row.Candidate.RuleName))
                .Select(row => row.Candidate.RuleName!.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var artifactRows = await _dbContext.RuleArtifacts
                .AsNoTracking()
                .Where(x => !x.IsDeleted
                    && (artifactIdCandidates.Contains(x.Id)
                        || artifactNameCandidates.Contains(x.Name)))
                .ToArrayAsync(cancellationToken);
            var artifactById = artifactRows.ToDictionary(x => x.Id);

            var artifactIdsForRevisionLookup = artifactRows.Select(x => x.Id).Distinct().ToArray();
            var revisionByArtifactRows = await _dbContext.RuleRevisionsV2
                .AsNoTracking()
                .Where(x => artifactIdsForRevisionLookup.Contains(x.RuleArtifactId))
                .Select(x => new { x.Id, x.RuleArtifactId, x.RevisionNumber })
                .ToArrayAsync(cancellationToken);
            var latestRevisionByArtifactId = revisionByArtifactRows
                .GroupBy(x => x.RuleArtifactId)
                .ToDictionary(
                    group => group.Key,
                    group => group.OrderByDescending(x => x.RevisionNumber).First().Id);

            var artifactByNameAndFamily = artifactRows
                .GroupBy(x => $"{x.Name.Trim().ToLowerInvariant()}::{x.RuleFamily}", StringComparer.Ordinal)
                .ToDictionary(
                    group => group.Key,
                    group => group.OrderByDescending(x => x.CurrentRevisionNumber).First(),
                    StringComparer.Ordinal);

            var acceptedCandidates = new List<ResolvedRow>();
            foreach (var row in candidateRows)
            {
                if (!serverSet.Contains(row.Candidate.ServerId))
                {
                    AddDiagnostic(
                        row.RowIndex,
                        "unresolved_server",
                        "serverId",
                        $"Target server '{row.Candidate.ServerId}' was not found.",
                        row.RawPayloadHash,
                        row.RawPayloadJson,
                        diagnostics,
                        diagnosticEntities,
                        ingestionRun.Id,
                        actorUserId,
                        nowUtc);
                    continue;
                }

                if (row.Candidate.IocId.HasValue && !validIocHashSet.Contains(row.Candidate.IocId.Value))
                {
                    AddDiagnostic(
                        row.RowIndex,
                        "unresolved_ioc",
                        "iocId",
                        $"IoC '{row.Candidate.IocId}' was not found.",
                        row.RawPayloadHash,
                        row.RawPayloadJson,
                        diagnostics,
                        diagnosticEntities,
                        ingestionRun.Id,
                        actorUserId,
                        nowUtc);
                    continue;
                }

                if (row.Candidate.ScanJobId.HasValue && !validScanJobHashSet.Contains(row.Candidate.ScanJobId.Value))
                {
                    AddDiagnostic(
                        row.RowIndex,
                        "unresolved_scan_job",
                        "scanJobId",
                        $"Scan job '{row.Candidate.ScanJobId}' was not found.",
                        row.RawPayloadHash,
                        row.RawPayloadJson,
                        diagnostics,
                        diagnosticEntities,
                        ingestionRun.Id,
                        actorUserId,
                        nowUtc);
                    continue;
                }

                if (row.Candidate.JobAttemptId.HasValue && !validAttemptHashSet.Contains(row.Candidate.JobAttemptId.Value))
                {
                    AddDiagnostic(
                        row.RowIndex,
                        "unresolved_job_attempt",
                        "jobAttemptId",
                        $"Job attempt '{row.Candidate.JobAttemptId}' was not found.",
                        row.RawPayloadHash,
                        row.RawPayloadJson,
                        diagnostics,
                        diagnosticEntities,
                        ingestionRun.Id,
                        actorUserId,
                        nowUtc);
                    continue;
                }

                if (row.Candidate.TargetExecutionId.HasValue && !validTargetExecutionHashSet.Contains(row.Candidate.TargetExecutionId.Value))
                {
                    AddDiagnostic(
                        row.RowIndex,
                        "unresolved_target_execution",
                        "targetExecutionId",
                        $"Target execution '{row.Candidate.TargetExecutionId}' was not found.",
                        row.RawPayloadHash,
                        row.RawPayloadJson,
                        diagnostics,
                        diagnosticEntities,
                        ingestionRun.Id,
                        actorUserId,
                        nowUtc);
                    continue;
                }

                if (!TryResolveRuleRevisionId(
                        row.Candidate,
                        explicitRevisionById,
                        artifactById,
                        latestRevisionByArtifactId,
                        artifactByNameAndFamily,
                        out var resolvedRuleRevisionId,
                        out var resolutionError))
                {
                    AddDiagnostic(
                        row.RowIndex,
                        resolutionError.Code,
                        resolutionError.Field,
                        resolutionError.Message,
                        row.RawPayloadHash,
                        row.RawPayloadJson,
                        diagnostics,
                        diagnosticEntities,
                        ingestionRun.Id,
                        actorUserId,
                        nowUtc);
                    continue;
                }

                var normalizedObservedAt = NormalizeObservedTimestamp(row.Candidate.ObservedAtUtc);
                var evidenceHash = ComputeSha256Hex(row.Candidate.EvidenceJson);
                var fingerprint = ComputeFingerprint(
                    row.Candidate.ScannerFamily,
                    row.Candidate.ServerId,
                    resolvedRuleRevisionId,
                    row.Candidate.IocId,
                    normalizedObservedAt,
                    row.Candidate.Disposition,
                    evidenceHash);

                acceptedCandidates.Add(new ResolvedRow(
                    row.RowIndex,
                    row.Candidate,
                    resolvedRuleRevisionId,
                    fingerprint,
                    row.RawPayloadJson,
                    row.RawPayloadHash));
            }

            if (acceptedCandidates.Count > 0)
            {
                var fingerprints = acceptedCandidates.Select(x => x.Fingerprint).Distinct().ToArray();
                var existingByFingerprint = await _dbContext.ScanResults
                    .Where(x => fingerprints.Contains(x.Fingerprint))
                    .ToDictionaryAsync(x => x.Fingerprint, cancellationToken);

                var provenanceEntities = new List<ScanResultProvenance>(acceptedCandidates.Count);
                var acceptedCount = 0;
                var dedupedCount = 0;

                foreach (var row in acceptedCandidates)
                {
                    var rawSample = row.Candidate.IsExecutionArtifact
                        ? row.RawPayloadJson
                        : Truncate(row.RawPayloadJson, AcceptedRawSampleMaxChars);
                    var isDuplicate = existingByFingerprint.TryGetValue(row.Fingerprint, out var canonical);
                    if (!isDuplicate)
                    {
                        canonical = ScanResult.Create(
                            scannerFamily: row.Candidate.ScannerFamily,
                            scanJobId: row.Candidate.ScanJobId,
                            jobAttemptId: row.Candidate.JobAttemptId,
                            targetExecutionId: row.Candidate.TargetExecutionId,
                            targetServerId: row.Candidate.ServerId,
                            ruleRevisionId: row.ResolvedRuleRevisionId,
                            iocId: row.Candidate.IocId,
                            disposition: row.Candidate.Disposition,
                            confidence: row.Candidate.Confidence,
                            fingerprint: row.Fingerprint,
                            evidenceJson: row.Candidate.EvidenceJson,
                            rawSampleJson: rawSample,
                            rawPayloadHash: row.RawPayloadHash,
                            isExecutionArtifact: row.Candidate.IsExecutionArtifact,
                            observedAtUtc: row.Candidate.ObservedAtUtc,
                            actorUserId: actorUserId,
                            nowUtc: nowUtc);
                        _dbContext.ScanResults.Add(canonical);
                        existingByFingerprint[row.Fingerprint] = canonical;
                    }
                    else
                    {
                        canonical!.RegisterDuplicate(
                            row.Candidate.ObservedAtUtc,
                            row.Candidate.ScanJobId,
                            row.Candidate.JobAttemptId,
                            row.Candidate.TargetExecutionId,
                            row.Candidate.IocId,
                            rawSample,
                            row.RawPayloadHash,
                            actorUserId,
                            nowUtc);
                        dedupedCount += 1;
                    }

                    provenanceEntities.Add(
                        ScanResultProvenance.Create(
                            scanResultId: canonical!.Id,
                            ingestionRunId: ingestionRun.Id,
                            rowIndex: row.RowIndex,
                            isDuplicate: isDuplicate,
                            observedAtUtc: row.Candidate.ObservedAtUtc,
                            rawPayloadHash: row.RawPayloadHash,
                            rawSampleJson: rawSample,
                            correlationMetadataJson: row.Candidate.CorrelationMetadataJson,
                            scanJobId: row.Candidate.ScanJobId,
                            jobAttemptId: row.Candidate.JobAttemptId,
                            targetExecutionId: row.Candidate.TargetExecutionId,
                            actorUserId: actorUserId,
                            nowUtc: nowUtc));

                    accepted.Add(new ResultIngestionAcceptedRow(
                        row.RowIndex,
                        canonical.Id,
                        isDuplicate,
                        row.Fingerprint));
                    acceptedCount += 1;
                }

                _dbContext.ScanResultProvenances.AddRange(provenanceEntities);
                ingestionRun.Complete(
                    acceptedRows: acceptedCount,
                    deduplicatedRows: dedupedCount,
                    rejectedRows: diagnostics.Count,
                    actorUserId: actorUserId,
                    nowUtc: nowUtc);
            }
            else
            {
                ingestionRun.Complete(
                    acceptedRows: 0,
                    deduplicatedRows: 0,
                    rejectedRows: diagnostics.Count,
                    actorUserId: actorUserId,
                    nowUtc: nowUtc);
            }
        }
        else
        {
            ingestionRun.Complete(
                acceptedRows: 0,
                deduplicatedRows: 0,
                rejectedRows: diagnostics.Count,
                actorUserId: actorUserId,
                nowUtc: nowUtc);
        }

        if (diagnosticEntities.Count > 0)
        {
            _dbContext.ScanResultIngestionDiagnostics.AddRange(diagnosticEntities);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ResultIngestionBatchResult(
            ingestionRun.Id,
            rows.Count,
            ingestionRun.AcceptedRows,
            ingestionRun.DeduplicatedRows,
            ingestionRun.RejectedRows,
            accepted.OrderBy(x => x.RowIndex).ToArray(),
            diagnostics.OrderBy(x => x.RowIndex).ToArray());
    }

    private static DateTimeOffset NormalizeObservedTimestamp(DateTimeOffset observedAtUtc)
    {
        var utc = observedAtUtc.ToUniversalTime();
        var roundedTicks = utc.UtcTicks - (utc.UtcTicks % TimeSpan.TicksPerSecond);
        return new DateTimeOffset(roundedTicks, TimeSpan.Zero);
    }

    private static string ComputeFingerprint(
        string scannerFamily,
        Guid serverId,
        Guid? ruleRevisionId,
        Guid? iocId,
        DateTimeOffset normalizedObservedAtUtc,
        ScanResultDisposition disposition,
        string evidenceHash)
    {
        var fingerprintRaw =
            $"{scannerFamily}|{serverId:N}|{ruleRevisionId?.ToString("N") ?? "none"}|{iocId?.ToString("N") ?? "none"}|{normalizedObservedAtUtc:O}|{disposition}|{evidenceHash}";
        return ComputeSha256Hex(fingerprintRaw);
    }

    private static string ComputeSha256Hex(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= maxLength)
        {
            return value;
        }

        return value[..maxLength];
    }

    private static string GetRawTextOrEmpty(JsonElement payload)
    {
        try
        {
            return payload.ValueKind == JsonValueKind.Undefined ? string.Empty : payload.GetRawText();
        }
        catch
        {
            return string.Empty;
        }
    }

    private static void AddDiagnostic(
        int rowIndex,
        string code,
        string field,
        string message,
        string rawSnippetHash,
        string rawPayloadJson,
        ICollection<ResultIngestionDiagnosticRow> diagnostics,
        ICollection<ScanResultIngestionDiagnostic> diagnosticEntities,
        Guid ingestionRunId,
        string actorUserId,
        DateTimeOffset nowUtc)
    {
        diagnostics.Add(new ResultIngestionDiagnosticRow(rowIndex, code, field, message, rawSnippetHash));
        diagnosticEntities.Add(
            ScanResultIngestionDiagnostic.Create(
                ingestionRunId,
                rowIndex,
                code,
                field,
                message,
                rawSnippetHash,
                rawPayloadJson,
                actorUserId,
                nowUtc));
    }

    private static bool TryResolveRuleRevisionId(
        NormalizedCandidate candidate,
        IReadOnlyDictionary<Guid, RuleRevisionResolution> explicitRevisionById,
        IReadOnlyDictionary<Guid, RuleArtifact> artifactById,
        IReadOnlyDictionary<Guid, Guid> latestRevisionByArtifactId,
        IReadOnlyDictionary<string, RuleArtifact> artifactByNameAndFamily,
        out Guid? resolvedRuleRevisionId,
        out ValidationError error)
    {
        resolvedRuleRevisionId = null;

        if (candidate.RuleRevisionId.HasValue)
        {
            if (!explicitRevisionById.TryGetValue(candidate.RuleRevisionId.Value, out var revision))
            {
                error = new ValidationError("unresolved_rule", "ruleRevisionId", $"Rule revision '{candidate.RuleRevisionId}' was not found.");
                return false;
            }

            if (!revision.RuleFamily.Equals(candidate.ScannerFamily, StringComparison.OrdinalIgnoreCase))
            {
                error = new ValidationError(
                    "family_rule_mismatch",
                    "ruleRevisionId",
                    $"Rule revision '{candidate.RuleRevisionId}' belongs to family '{revision.RuleFamily}', not '{candidate.ScannerFamily}'.");
                return false;
            }

            resolvedRuleRevisionId = revision.RuleRevisionId;
            error = ValidationError.Empty;
            return true;
        }

        if (candidate.RuleArtifactId.HasValue)
        {
            if (!artifactById.TryGetValue(candidate.RuleArtifactId.Value, out var artifact))
            {
                error = new ValidationError("unresolved_rule", "ruleId", $"Rule artifact '{candidate.RuleArtifactId}' was not found.");
                return false;
            }

            if (!artifact.RuleFamily.Equals(candidate.ScannerFamily, StringComparison.OrdinalIgnoreCase))
            {
                error = new ValidationError(
                    "family_rule_mismatch",
                    "ruleId",
                    $"Rule artifact '{candidate.RuleArtifactId}' belongs to family '{artifact.RuleFamily}', not '{candidate.ScannerFamily}'.");
                return false;
            }

            if (!latestRevisionByArtifactId.TryGetValue(artifact.Id, out var latestRevisionId))
            {
                error = new ValidationError("unresolved_rule", "ruleId", $"Rule artifact '{artifact.Id}' does not have any revisions.");
                return false;
            }

            resolvedRuleRevisionId = latestRevisionId;
            error = ValidationError.Empty;
            return true;
        }

        if (!string.IsNullOrWhiteSpace(candidate.RuleName))
        {
            var key = $"{candidate.RuleName.Trim().ToLowerInvariant()}::{candidate.ScannerFamily}";
            if (!artifactByNameAndFamily.TryGetValue(key, out var artifact))
            {
                error = new ValidationError("unresolved_rule", "ruleIdentifier", $"Rule '{candidate.RuleName}' was not found.");
                return false;
            }

            if (!latestRevisionByArtifactId.TryGetValue(artifact.Id, out var latestRevisionId))
            {
                error = new ValidationError("unresolved_rule", "ruleIdentifier", $"Rule '{candidate.RuleName}' has no revisions.");
                return false;
            }

            resolvedRuleRevisionId = latestRevisionId;
            error = ValidationError.Empty;
            return true;
        }

        if (candidate.IsExecutionArtifact)
        {
            error = ValidationError.Empty;
            return true;
        }

        error = new ValidationError(
            "missing_required",
            "ruleRevisionId",
            "A resolvable rule link is required (ruleRevisionId or rule identifier).");
        return false;
    }

    private interface IFamilyResultNormalizer
    {
        bool TryNormalize(JsonElement payload, out NormalizedCandidate candidate, out ValidationError error);
    }

    private abstract class FamilyResultNormalizerBase : IFamilyResultNormalizer
    {
        private static readonly string[] ServerIdKeys = ["serverId", "targetServerId", "server_id", "target_id", "hostId", "host_id"];
        private static readonly string[] IocIdKeys = ["iocId", "ioc_id", "indicatorId", "indicator_id"];
        private static readonly string[] ScanJobIdKeys = ["scanJobId", "scan_job_id"];
        private static readonly string[] JobAttemptIdKeys = ["jobAttemptId", "job_attempt_id"];
        private static readonly string[] TargetExecutionIdKeys = ["targetExecutionId", "target_execution_id"];
        private static readonly string[] DispositionKeys = ["disposition", "resultDisposition", "result_disposition", "verdict"];
        private static readonly string[] ConfidenceKeys = ["confidence", "score"];
        private static readonly string[] CorrelationIdKeys = ["correlationId", "correlation_id", "requestId", "request_id", "traceId", "trace_id"];
        private static readonly string[] KindKeys = ["kind", "recordType", "record_type"];

        private readonly string _scannerFamily;
        private readonly string[] _timestampKeys;
        private readonly string[] _ruleRevisionKeys;
        private readonly string[] _ruleArtifactKeys;
        private readonly string[] _ruleNameKeys;
        private readonly string[] _evidenceKeys;

        protected FamilyResultNormalizerBase(
            string scannerFamily,
            string[] timestampKeys,
            string[] ruleRevisionKeys,
            string[] ruleArtifactKeys,
            string[] ruleNameKeys,
            string[] evidenceKeys)
        {
            _scannerFamily = scannerFamily;
            _timestampKeys = timestampKeys;
            _ruleRevisionKeys = ruleRevisionKeys;
            _ruleArtifactKeys = ruleArtifactKeys;
            _ruleNameKeys = ruleNameKeys;
            _evidenceKeys = evidenceKeys;
        }

        public bool TryNormalize(JsonElement payload, out NormalizedCandidate candidate, out ValidationError error)
        {
            candidate = default!;

            if (payload.ValueKind != JsonValueKind.Object)
            {
                error = new ValidationError("invalid_payload", "payload", "Payload must be a JSON object.");
                return false;
            }

            if (!TryReadGuidRequired(payload, ServerIdKeys, "serverId", out var serverId, out error))
            {
                return false;
            }

            if (!TryReadTimestampRequired(payload, _timestampKeys, "observedAtUtc", out var observedAtUtc, out error))
            {
                return false;
            }

            if (!TryReadGuidOptional(payload, _ruleRevisionKeys, "ruleRevisionId", out var ruleRevisionId, out error))
            {
                return false;
            }

            if (!TryReadGuidOptional(payload, _ruleArtifactKeys, "ruleId", out var ruleArtifactId, out error))
            {
                return false;
            }

            if (!TryReadGuidOptional(payload, IocIdKeys, "iocId", out var iocId, out error))
            {
                return false;
            }

            if (!TryReadGuidOptional(payload, ScanJobIdKeys, "scanJobId", out var scanJobId, out error))
            {
                return false;
            }

            if (!TryReadGuidOptional(payload, JobAttemptIdKeys, "jobAttemptId", out var jobAttemptId, out error))
            {
                return false;
            }

            if (!TryReadGuidOptional(payload, TargetExecutionIdKeys, "targetExecutionId", out var targetExecutionId, out error))
            {
                return false;
            }

            if (!TryReadStringOptional(payload, _ruleNameKeys, out var ruleName))
            {
                ruleName = null;
            }

            if (!TryReadDispositionRequired(payload, out var disposition, out error))
            {
                return false;
            }

            if (!TryReadConfidenceRequired(payload, out var confidence, out error))
            {
                return false;
            }

            var isExecutionArtifact = TryReadStringOptional(payload, KindKeys, out var kind)
                && kind.Equals("scan_execution_artifact", StringComparison.OrdinalIgnoreCase);

            if (!TryReadEvidence(payload, _evidenceKeys, out var evidenceJson))
            {
                evidenceJson = payload.GetRawText();
            }

            if (string.IsNullOrWhiteSpace(evidenceJson))
            {
                if (isExecutionArtifact)
                {
                    evidenceJson = payload.GetRawText();
                }
                else
                {
                    error = new ValidationError("missing_required", "evidence", "Evidence is required.");
                    return false;
                }
            }

            var correlationMetadataJson = BuildCorrelationMetadataJson(payload);

            candidate = new NormalizedCandidate(
                ScannerFamily: _scannerFamily,
                ServerId: serverId,
                ObservedAtUtc: observedAtUtc,
                RuleRevisionId: ruleRevisionId,
                RuleArtifactId: ruleArtifactId,
                RuleName: ruleName,
                IocId: iocId,
                ScanJobId: scanJobId,
                JobAttemptId: jobAttemptId,
                TargetExecutionId: targetExecutionId,
                Disposition: disposition,
                Confidence: confidence,
                EvidenceJson: evidenceJson,
                IsExecutionArtifact: isExecutionArtifact,
                CorrelationMetadataJson: correlationMetadataJson);
            error = ValidationError.Empty;
            return true;
        }

        private static bool TryReadEvidence(JsonElement payload, IEnumerable<string> keys, out string evidenceJson)
        {
            foreach (var key in keys)
            {
                if (!TryGetProperty(payload, key, out var value))
                {
                    continue;
                }

                evidenceJson = value.ValueKind switch
                {
                    JsonValueKind.String => value.GetString() ?? string.Empty,
                    JsonValueKind.Null => string.Empty,
                    _ => value.GetRawText(),
                };
                return true;
            }

            evidenceJson = string.Empty;
            return false;
        }

        private static bool TryReadDispositionRequired(JsonElement payload, out ScanResultDisposition disposition, out ValidationError error)
        {
            if (!TryReadStringOptional(payload, DispositionKeys, out var rawDisposition))
            {
                disposition = ScanResultDisposition.Informational;
                error = new ValidationError("missing_required", "disposition", "Disposition is required.");
                return false;
            }

            if (TryParseDisposition(rawDisposition, out disposition))
            {
                error = ValidationError.Empty;
                return true;
            }

            error = new ValidationError("invalid_enum", "disposition", $"Disposition '{rawDisposition}' is invalid.");
            return false;
        }

        private static bool TryReadConfidenceRequired(JsonElement payload, out decimal confidence, out ValidationError error)
        {
            if (!TryReadStringOptional(payload, ConfidenceKeys, out var rawConfidence))
            {
                confidence = 0m;
                error = new ValidationError("missing_required", "confidence", "Confidence is required.");
                return false;
            }

            if (!decimal.TryParse(rawConfidence, NumberStyles.Float, CultureInfo.InvariantCulture, out confidence))
            {
                error = new ValidationError("invalid_number", "confidence", $"Confidence '{rawConfidence}' is not a valid decimal.");
                return false;
            }

            if (confidence is < 0m or > 1m)
            {
                error = new ValidationError("invalid_number", "confidence", "Confidence must be between 0 and 1.");
                return false;
            }

            error = ValidationError.Empty;
            return true;
        }

        private static bool TryReadGuidRequired(
            JsonElement payload,
            IEnumerable<string> keys,
            string fieldName,
            out Guid guidValue,
            out ValidationError error)
        {
            if (!TryReadStringOptional(payload, keys, out var rawValue))
            {
                guidValue = Guid.Empty;
                error = new ValidationError("missing_required", fieldName, $"{fieldName} is required.");
                return false;
            }

            if (!Guid.TryParse(rawValue, out guidValue))
            {
                error = new ValidationError("invalid_guid", fieldName, $"{fieldName} '{rawValue}' is not a valid GUID.");
                return false;
            }

            if (guidValue == Guid.Empty)
            {
                error = new ValidationError("invalid_guid", fieldName, $"{fieldName} cannot be empty.");
                return false;
            }

            error = ValidationError.Empty;
            return true;
        }

        private static bool TryReadGuidOptional(
            JsonElement payload,
            IEnumerable<string> keys,
            string fieldName,
            out Guid? guidValue,
            out ValidationError error)
        {
            guidValue = null;
            if (!TryReadStringOptional(payload, keys, out var rawValue))
            {
                error = ValidationError.Empty;
                return true;
            }

            if (string.IsNullOrWhiteSpace(rawValue))
            {
                error = ValidationError.Empty;
                return true;
            }

            if (!Guid.TryParse(rawValue, out var parsed))
            {
                error = new ValidationError("invalid_guid", fieldName, $"{fieldName} '{rawValue}' is not a valid GUID.");
                return false;
            }

            if (parsed == Guid.Empty)
            {
                error = new ValidationError("invalid_guid", fieldName, $"{fieldName} cannot be empty.");
                return false;
            }

            guidValue = parsed;
            error = ValidationError.Empty;
            return true;
        }

        private static bool TryReadTimestampRequired(
            JsonElement payload,
            IEnumerable<string> keys,
            string fieldName,
            out DateTimeOffset timestamp,
            out ValidationError error)
        {
            if (!TryReadStringOptional(payload, keys, out var rawValue))
            {
                timestamp = default;
                error = new ValidationError("missing_required", fieldName, $"{fieldName} is required.");
                return false;
            }

            if (!DateTimeOffset.TryParse(rawValue, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out timestamp))
            {
                error = new ValidationError("invalid_timestamp", fieldName, $"Timestamp '{rawValue}' is invalid.");
                return false;
            }

            timestamp = timestamp.ToUniversalTime();
            error = ValidationError.Empty;
            return true;
        }

        private static bool TryReadStringOptional(JsonElement payload, IEnumerable<string> keys, out string value)
        {
            foreach (var key in keys)
            {
                if (!TryGetProperty(payload, key, out var propertyValue))
                {
                    continue;
                }

                value = propertyValue.ValueKind switch
                {
                    JsonValueKind.String => propertyValue.GetString() ?? string.Empty,
                    JsonValueKind.Number => propertyValue.GetRawText(),
                    JsonValueKind.True => bool.TrueString,
                    JsonValueKind.False => bool.FalseString,
                    JsonValueKind.Null => string.Empty,
                    _ => propertyValue.GetRawText(),
                };
                return true;
            }

            value = string.Empty;
            return false;
        }

        private static string BuildCorrelationMetadataJson(JsonElement payload)
        {
            if (!TryReadStringOptional(payload, CorrelationIdKeys, out var correlationId))
            {
                return "{}";
            }

            return JsonSerializer.Serialize(new { correlationId });
        }

        private static bool TryParseDisposition(string raw, out ScanResultDisposition disposition)
        {
            if (Enum.TryParse(raw.Trim(), ignoreCase: true, out disposition))
            {
                return true;
            }

            var normalized = raw.Trim().ToLowerInvariant().Replace("-", string.Empty, StringComparison.Ordinal).Replace("_", string.Empty, StringComparison.Ordinal);
            switch (normalized)
            {
                case "detection":
                case "detected":
                case "match":
                case "matched":
                case "hit":
                case "alert":
                case "positive":
                    disposition = ScanResultDisposition.Detection;
                    return true;
                case "informational":
                case "info":
                    disposition = ScanResultDisposition.Informational;
                    return true;
                case "falsepositive":
                case "benign":
                    disposition = ScanResultDisposition.FalsePositive;
                    return true;
                case "suppressed":
                case "ignored":
                    disposition = ScanResultDisposition.Suppressed;
                    return true;
                default:
                    disposition = ScanResultDisposition.Informational;
                    return false;
            }
        }

        private static bool TryGetProperty(JsonElement payload, string name, out JsonElement value)
        {
            foreach (var property in payload.EnumerateObject())
            {
                if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
                {
                    value = property.Value;
                    return true;
                }
            }

            value = default;
            return false;
        }
    }

    private sealed class YaraResultNormalizer : FamilyResultNormalizerBase
    {
        public YaraResultNormalizer()
            : base(
                scannerFamily: "yara",
                timestampKeys: ["observedAtUtc", "observedAt", "timestamp", "matchedAt", "createdAtUtc"],
                ruleRevisionKeys: ["ruleRevisionId", "rule_revision_id", "ruleRevision"],
                ruleArtifactKeys: ["ruleId", "rule_id", "ruleArtifactId", "rule_artifact_id"],
                ruleNameKeys: ["ruleName", "rule", "signature", "identifier"],
                evidenceKeys: ["evidenceJson", "evidence", "matchedStrings", "match", "filePath", "file_path"])
        {
        }
    }

    private sealed class SigmaResultNormalizer : FamilyResultNormalizerBase
    {
        public SigmaResultNormalizer()
            : base(
                scannerFamily: "sigma",
                timestampKeys: ["observedAtUtc", "observedAt", "timestamp", "eventTime", "timeGenerated"],
                ruleRevisionKeys: ["ruleRevisionId", "rule_revision_id", "ruleRevision"],
                ruleArtifactKeys: ["ruleId", "rule_id", "ruleArtifactId", "rule_artifact_id"],
                ruleNameKeys: ["ruleName", "title", "rule", "sigmaRuleId"],
                evidenceKeys: ["evidenceJson", "evidence", "event", "eventData", "log"])
        {
        }
    }

    private sealed class SnortResultNormalizer : FamilyResultNormalizerBase
    {
        public SnortResultNormalizer()
            : base(
                scannerFamily: "snort",
                timestampKeys: ["observedAtUtc", "observedAt", "timestamp", "alertTime", "eventTimestamp"],
                ruleRevisionKeys: ["ruleRevisionId", "rule_revision_id", "ruleRevision"],
                ruleArtifactKeys: ["ruleId", "rule_id", "ruleArtifactId", "rule_artifact_id"],
                ruleNameKeys: ["ruleName", "sid", "signature", "rule"],
                evidenceKeys: ["evidenceJson", "evidence", "alert", "packet", "message"])
        {
        }
    }

    private sealed class SuricataResultNormalizer : FamilyResultNormalizerBase
    {
        public SuricataResultNormalizer()
            : base(
                scannerFamily: "suricata",
                timestampKeys: ["observedAtUtc", "observedAt", "timestamp", "alertTime", "ts"],
                ruleRevisionKeys: ["ruleRevisionId", "rule_revision_id", "ruleRevision"],
                ruleArtifactKeys: ["ruleId", "rule_id", "ruleArtifactId", "rule_artifact_id"],
                ruleNameKeys: ["ruleName", "rule", "title", "signature"],
                evidenceKeys: ["evidenceJson", "evidence", "alert", "line", "match", "log"])
        {
        }
    }

    private sealed record CandidateRow(
        int RowIndex,
        NormalizedCandidate Candidate,
        string RawPayloadJson,
        string RawPayloadHash);

    private sealed record ResolvedRow(
        int RowIndex,
        NormalizedCandidate Candidate,
        Guid? ResolvedRuleRevisionId,
        string Fingerprint,
        string RawPayloadJson,
        string RawPayloadHash);

    private sealed record NormalizedCandidate(
        string ScannerFamily,
        Guid ServerId,
        DateTimeOffset ObservedAtUtc,
        Guid? RuleRevisionId,
        Guid? RuleArtifactId,
        string? RuleName,
        Guid? IocId,
        Guid? ScanJobId,
        Guid? JobAttemptId,
        Guid? TargetExecutionId,
        ScanResultDisposition Disposition,
        decimal Confidence,
        string EvidenceJson,
        bool IsExecutionArtifact,
        string CorrelationMetadataJson);

    private sealed record ValidationError(
        string Code,
        string Field,
        string Message)
    {
        public static ValidationError Empty { get; } = new(string.Empty, string.Empty, string.Empty);
    }

    private sealed record RuleRevisionResolution(
        Guid RuleRevisionId,
        Guid RuleArtifactId,
        string RuleName,
        string RuleFamily);
}
