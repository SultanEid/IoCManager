using Backend.Contracts.V2;
using Backend.Domain.IocManager;
using Backend.Api.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.V2;

public sealed partial class RulesController
{
    [HttpPost("distribution-jobs")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleDistributionJobResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleDistributionJobResponse>> CreateDistributionJob(
        [FromBody] CreateRuleDistributionJobRequest request,
        CancellationToken cancellationToken)
    {
        var revisionWithRule = await (
            from revision in _dbContext.RuleRevisionsV2.AsNoTracking()
            join artifact in _dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id
            where revision.Id == request.RuleRevisionId
            select new { Revision = revision, Artifact = artifact })
            .FirstOrDefaultAsync(cancellationToken);
        if (revisionWithRule is null)
        {
            return NotFound($"Rule revision '{request.RuleRevisionId}' was not found.");
        }

        var explicitTargetIds = (request.TargetServerIds ?? []).Where(x => x != Guid.Empty).Distinct().ToArray();
        var selectedGroupIds = (request.TargetGroupIds ?? []).Where(x => x != Guid.Empty).Distinct().ToArray();
        if (explicitTargetIds.Length == 0 && selectedGroupIds.Length == 0)
        {
            return BadRequest("At least one target server id or target group id is required.");
        }

        var nowUtc = DateTimeOffset.UtcNow;
        var targetIdSet = explicitTargetIds.ToHashSet();

        if (selectedGroupIds.Length > 0)
        {
            var groups = await _dbContext.TargetGroups
                .AsNoTracking()
                .Where(x => selectedGroupIds.Contains(x.Id))
                .ToArrayAsync(cancellationToken);
            var missingGroupId = selectedGroupIds.Except(groups.Select(x => x.Id)).FirstOrDefault();
            if (missingGroupId != Guid.Empty)
            {
                return NotFound($"Target group '{missingGroupId}' was not found.");
            }

            var groupMemberIds = await _dbContext.TargetGroupMembers
                .AsNoTracking()
                .Where(x => selectedGroupIds.Contains(x.TargetGroupId))
                .Select(x => x.TargetServerId)
                .Distinct()
                .ToArrayAsync(cancellationToken);
            targetIdSet.UnionWith(groupMemberIds);
        }

        if (targetIdSet.Count == 0)
        {
            return BadRequest("Resolved target set is empty.");
        }

        var targets = await _dbContext.TargetServers
            .AsNoTracking()
            .Where(x => targetIdSet.Contains(x.Id))
            .OrderBy(x => x.Hostname)
            .ThenBy(x => x.IpAddress)
            .ToArrayAsync(cancellationToken);
        var missingTargetId = targetIdSet.Except(targets.Select(x => x.Id)).FirstOrDefault();
        if (missingTargetId != Guid.Empty)
        {
            return NotFound($"Target server '{missingTargetId}' was not found.");
        }

        var maxAttempts = request.MaxAttempts ?? _distributionOptions.CurrentValue.MaxAttempts;
        RuleDistributionJob job;
        try
        {
            job = RuleDistributionJob.Queue(
                ruleRevisionId: request.RuleRevisionId,
                operatorUserId: request.OperatorUserId,
                actorUserId: request.OperatorUserId,
                queuedAtUtc: nowUtc,
                notes: request.Notes,
                maxAttempts: maxAttempts);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(ex.Message);
        }

        _dbContext.RuleDistributionJobs.Add(job);
        foreach (var target in targets)
        {
            _dbContext.RuleDistributionTargets.Add(
                RuleDistributionTarget.CreateSnapshot(
                    ruleDistributionJobId: job.Id,
                    targetServerId: target.Id,
                    targetHostname: target.Hostname,
                    targetIpAddress: target.IpAddress,
                    actorUserId: request.OperatorUserId,
                    nowUtc: nowUtc));
        }

        foreach (var groupId in selectedGroupIds)
        {
            _dbContext.RuleDistributionJobTargetGroups.Add(
                RuleDistributionJobTargetGroup.Create(job.Id, groupId, request.OperatorUserId, nowUtc));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "rules.distribution-job.create",
            "rule_distribution_job",
            job.Id.ToString("N"),
            new
            {
                job.RuleRevisionId,
                job.OperatorUserId,
                targetCount = targets.Length,
                selectedGroupIds,
            },
            cancellationToken);

        await _distributionJobQueue.EnqueueAsync(job.Id, cancellationToken);

        var response = BuildJobResponse(
            job,
            revisionWithRule.Revision,
            revisionWithRule.Artifact,
            new DistributionJobCounts(
                TotalTargets: targets.Length,
                SuccessTargets: 0,
                FailureTargets: 0,
                UnreachableTargets: 0,
                ValidationFailedTargets: 0,
                PartiallyAppliedTargets: 0));

        return CreatedAtAction(nameof(GetDistributionJob), new { jobId = job.Id }, response);
    }

    [HttpGet("distribution-jobs")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RuleDistributionJobResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RuleDistributionJobResponse>>> ListDistributionJobs(
        [FromQuery] string? status,
        [FromQuery] string? operatorUserId,
        [FromQuery] Guid? ruleRevisionId,
        [FromQuery] string? ruleFamily,
        [FromQuery] Guid? targetServerId,
        [FromQuery] Guid? targetGroupId,
        [FromQuery] string? queuedFromUtc,
        [FromQuery] string? queuedToUtc,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        var parsedStatus = string.IsNullOrWhiteSpace(status)
            ? (RuleDistributionJobStatus?)null
            : V2Mappings.ParseEnum<RuleDistributionJobStatus>(status, nameof(status));
        var fromUtc = ParseOptionalDate(queuedFromUtc, nameof(queuedFromUtc));
        var toUtc = ParseOptionalDate(queuedToUtc, nameof(queuedToUtc));
        var boundedTake = Math.Clamp(take, 1, 500);

        var query =
            from job in _dbContext.RuleDistributionJobs.AsNoTracking()
            join revision in _dbContext.RuleRevisionsV2.AsNoTracking() on job.RuleRevisionId equals revision.Id
            join artifact in _dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id
            select new { Job = job, Revision = revision, Artifact = artifact };

        if (parsedStatus.HasValue)
        {
            query = query.Where(x => x.Job.Status == parsedStatus.Value);
        }

        if (!string.IsNullOrWhiteSpace(operatorUserId))
        {
            var normalizedOperator = operatorUserId.Trim();
            query = query.Where(x => x.Job.OperatorUserId == normalizedOperator);
        }

        if (ruleRevisionId.HasValue)
        {
            query = query.Where(x => x.Job.RuleRevisionId == ruleRevisionId.Value);
        }

        if (!string.IsNullOrWhiteSpace(ruleFamily))
        {
            var normalizedFamily = ruleFamily.Trim().ToLowerInvariant();
            query = query.Where(x => x.Artifact.RuleFamily == normalizedFamily);
        }

        if (fromUtc.HasValue)
        {
            query = query.Where(x => x.Job.QueuedAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(x => x.Job.QueuedAtUtc <= toUtc.Value);
        }

        if (targetServerId.HasValue)
        {
            var filterTargetId = targetServerId.Value;
            query = query.Where(x => _dbContext.RuleDistributionTargets
                .Any(target => target.RuleDistributionJobId == x.Job.Id && target.TargetServerId == filterTargetId));
        }

        if (targetGroupId.HasValue)
        {
            var filterGroupId = targetGroupId.Value;
            query = query.Where(x => _dbContext.RuleDistributionJobTargetGroups
                .Any(group => group.RuleDistributionJobId == x.Job.Id && group.TargetGroupId == filterGroupId));
        }

        var rows = await query
            .OrderByDescending(x => x.Job.QueuedAtUtc)
            .Take(boundedTake)
            .ToArrayAsync(cancellationToken);

        var countsByJobId = await LoadJobCountsAsync(rows.Select(x => x.Job.Id), cancellationToken);
        var response = rows
            .Select(x => BuildJobResponse(
                x.Job,
                x.Revision,
                x.Artifact,
                countsByJobId.TryGetValue(x.Job.Id, out var counts) ? counts : DistributionJobCounts.Empty))
            .ToArray();

        return Ok(response);
    }

    [HttpGet("distribution-jobs/{jobId:guid}")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<RuleDistributionJobResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleDistributionJobResponse>> GetDistributionJob(Guid jobId, CancellationToken cancellationToken)
    {
        var row = await (
            from job in _dbContext.RuleDistributionJobs.AsNoTracking()
            join revision in _dbContext.RuleRevisionsV2.AsNoTracking() on job.RuleRevisionId equals revision.Id
            join artifact in _dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id
            where job.Id == jobId
            select new { Job = job, Revision = revision, Artifact = artifact })
            .FirstOrDefaultAsync(cancellationToken);

        if (row is null)
        {
            return NotFound();
        }

        var countsByJobId = await LoadJobCountsAsync([jobId], cancellationToken);
        var response = BuildJobResponse(
            row.Job,
            row.Revision,
            row.Artifact,
            countsByJobId.TryGetValue(jobId, out var counts) ? counts : DistributionJobCounts.Empty);

        return Ok(response);
    }

    [HttpGet("distribution-jobs/{jobId:guid}/attempts")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RuleDistributionAttemptResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<RuleDistributionAttemptResponse>>> ListDistributionJobAttempts(
        Guid jobId,
        CancellationToken cancellationToken)
    {
        var jobExists = await _dbContext.RuleDistributionJobs
            .AsNoTracking()
            .AnyAsync(x => x.Id == jobId, cancellationToken);
        if (!jobExists)
        {
            return NotFound();
        }

        var attempts = await _dbContext.RuleDistributionAttempts
            .AsNoTracking()
            .Where(x => x.RuleDistributionJobId == jobId)
            .OrderByDescending(x => x.AttemptNumber)
            .Select(x => x.ToRuleDistributionAttemptResponse())
            .ToArrayAsync(cancellationToken);

        return Ok(attempts);
    }

    [HttpGet("distribution-jobs/{jobId:guid}/targets")]
    [EnableRateLimiting(RateLimitPolicies.Read)]
    [ProducesResponseType<IReadOnlyList<RuleDistributionTargetResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<RuleDistributionTargetResponse>>> ListDistributionJobTargets(
        Guid jobId,
        CancellationToken cancellationToken)
    {
        var jobExists = await _dbContext.RuleDistributionJobs
            .AsNoTracking()
            .AnyAsync(x => x.Id == jobId, cancellationToken);
        if (!jobExists)
        {
            return NotFound();
        }

        var targets = await _dbContext.RuleDistributionTargets
            .AsNoTracking()
            .Where(x => x.RuleDistributionJobId == jobId)
            .OrderBy(x => x.TargetHostname)
            .ThenBy(x => x.TargetIpAddress)
            .ToArrayAsync(cancellationToken);

        if (targets.Length == 0)
        {
            return Ok(Array.Empty<RuleDistributionTargetResponse>());
        }

        var targetIds = targets.Select(x => x.Id).ToArray();
        var targetAttemptRows = await (
            from targetAttempt in _dbContext.RuleDistributionTargetAttempts.AsNoTracking()
            join attempt in _dbContext.RuleDistributionAttempts.AsNoTracking() on targetAttempt.RuleDistributionAttemptId equals attempt.Id
            where attempt.RuleDistributionJobId == jobId && targetIds.Contains(targetAttempt.RuleDistributionTargetId)
            orderby attempt.AttemptNumber descending, targetAttempt.CompletedAtUtc descending
            select new
            {
                targetAttempt.RuleDistributionTargetId,
                Response = targetAttempt.ToRuleDistributionTargetAttemptResponse(),
            })
            .ToArrayAsync(cancellationToken);

        var attemptsByTargetId = targetAttemptRows
            .GroupBy(x => x.RuleDistributionTargetId)
            .ToDictionary(x => x.Key, x => (IReadOnlyList<RuleDistributionTargetAttemptResponse>)x.Select(row => row.Response).ToArray());

        var response = targets
            .Select(target => target.ToRuleDistributionTargetResponse(
                attempts: attemptsByTargetId.TryGetValue(target.Id, out var attempts)
                    ? attempts
                    : Array.Empty<RuleDistributionTargetAttemptResponse>()))
            .ToArray();

        return Ok(response);
    }

    [HttpPost("distribution-jobs/{jobId:guid}/retry")]
    [Authorize(Policy = AuthorizationPolicies.LeadAccess)]
    [EnableRateLimiting(RateLimitPolicies.Write)]
    [ProducesResponseType<RuleDistributionJobResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RuleDistributionJobResponse>> RetryDistributionJob(
        Guid jobId,
        [FromBody] RetryRuleDistributionJobRequest request,
        CancellationToken cancellationToken)
    {
        var row = await (
            from job in _dbContext.RuleDistributionJobs
            join revision in _dbContext.RuleRevisionsV2.AsNoTracking() on job.RuleRevisionId equals revision.Id
            join artifact in _dbContext.RuleArtifacts.AsNoTracking() on revision.RuleArtifactId equals artifact.Id
            where job.Id == jobId
            select new { Job = job, Revision = revision, Artifact = artifact })
            .FirstOrDefaultAsync(cancellationToken);
        if (row is null)
        {
            return NotFound();
        }

        var targets = await _dbContext.RuleDistributionTargets
            .Where(x => x.RuleDistributionJobId == jobId)
            .ToArrayAsync(cancellationToken);
        var retryableTargets = targets
            .Where(x => x.IsRetryable && x.Status is RuleDistributionTargetStatus.Failure or RuleDistributionTargetStatus.Unreachable or RuleDistributionTargetStatus.PartiallyApplied)
            .ToArray();
        if (retryableTargets.Length == 0)
        {
            return BadRequest("No retryable targets are available for this job.");
        }

        var nowUtc = DateTimeOffset.UtcNow;
        foreach (var retryableTarget in retryableTargets)
        {
            retryableTarget.ResetForRetry(request.ActorUserId, nowUtc);
        }

        try
        {
            row.Job.QueueManualRetry(
                actorUserId: request.ActorUserId,
                nowUtc: nowUtc,
                summary: request.Notes);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.TryWriteAsync(
            User,
            "rules.distribution-job.retry",
            "rule_distribution_job",
            jobId.ToString("N"),
            new { retryableTargetCount = retryableTargets.Length },
            cancellationToken);

        await _distributionJobQueue.EnqueueAsync(jobId, cancellationToken);

        var countsByJobId = await LoadJobCountsAsync([jobId], cancellationToken);
        var response = BuildJobResponse(
            row.Job,
            row.Revision,
            row.Artifact,
            countsByJobId.TryGetValue(jobId, out var counts) ? counts : DistributionJobCounts.Empty);

        return Ok(response);
    }

    private async Task<IReadOnlyDictionary<Guid, DistributionJobCounts>> LoadJobCountsAsync(
        IEnumerable<Guid> jobIds,
        CancellationToken cancellationToken)
    {
        var ids = jobIds.Distinct().ToArray();
        if (ids.Length == 0)
        {
            return new Dictionary<Guid, DistributionJobCounts>();
        }

        var rows = await _dbContext.RuleDistributionTargets
            .AsNoTracking()
            .Where(x => ids.Contains(x.RuleDistributionJobId))
            .GroupBy(x => x.RuleDistributionJobId)
            .Select(group => new
            {
                JobId = group.Key,
                TotalTargets = group.Count(),
                SuccessTargets = group.Count(x => x.Status == RuleDistributionTargetStatus.Success),
                FailureTargets = group.Count(x => x.Status == RuleDistributionTargetStatus.Failure),
                UnreachableTargets = group.Count(x => x.Status == RuleDistributionTargetStatus.Unreachable),
                ValidationFailedTargets = group.Count(x => x.Status == RuleDistributionTargetStatus.ValidationFailed),
                PartiallyAppliedTargets = group.Count(x => x.Status == RuleDistributionTargetStatus.PartiallyApplied),
            })
            .ToArrayAsync(cancellationToken);

        return rows.ToDictionary(
            x => x.JobId,
            x => new DistributionJobCounts(
                x.TotalTargets,
                x.SuccessTargets,
                x.FailureTargets,
                x.UnreachableTargets,
                x.ValidationFailedTargets,
                x.PartiallyAppliedTargets));
    }

    private static RuleDistributionJobResponse BuildJobResponse(
        RuleDistributionJob job,
        RuleRevision revision,
        RuleArtifact artifact,
        DistributionJobCounts counts)
    {
        return new RuleDistributionJobResponse(
            Id: job.Id,
            RuleRevisionId: job.RuleRevisionId,
            RuleFamily: artifact.RuleFamily,
            RevisionNumber: revision.RevisionNumber,
            VersionLabel: revision.VersionLabel,
            Status: job.Status.ToString(),
            OperatorUserId: job.OperatorUserId,
            AttemptCount: job.AttemptCount,
            MaxAttempts: job.MaxAttempts,
            TotalTargets: counts.TotalTargets,
            SuccessfulTargets: counts.SuccessTargets,
            FailedTargets: counts.FailureTargets,
            UnreachableTargets: counts.UnreachableTargets,
            ValidationFailedTargets: counts.ValidationFailedTargets,
            PartiallyAppliedTargets: counts.PartiallyAppliedTargets,
            QueuedAtUtc: job.QueuedAtUtc,
            StartedAtUtc: job.StartedAtUtc,
            CompletedAtUtc: job.CompletedAtUtc,
            NextAttemptAtUtc: job.NextAttemptAtUtc,
            Summary: job.Summary,
            Notes: job.Notes,
            CreatedAtUtc: job.CreatedAtUtc,
            UpdatedAtUtc: job.UpdatedAtUtc);
    }

    private sealed record DistributionJobCounts(
        int TotalTargets,
        int SuccessTargets,
        int FailureTargets,
        int UnreachableTargets,
        int ValidationFailedTargets,
        int PartiallyAppliedTargets)
    {
        public static DistributionJobCounts Empty { get; } = new(0, 0, 0, 0, 0, 0);
    }
}
