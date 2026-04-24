using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.Admin;
using Backend.Domain.Common;
using Backend.Domain.Jobs;
using Microsoft.Extensions.Logging;

namespace Backend.Application.Services;

public sealed class JobOrchestrationService : IJobOrchestrationService
{
    private readonly IDecisionsRepository _decisionsRepository;
    private readonly IFeedbackRepository _feedbackRepository;
    private readonly IJobRunsRepository _jobRunsRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<JobOrchestrationService> _logger;
    private bool _feedbackTableUnavailable;
    private bool _decisionTableUnavailable;

    public JobOrchestrationService(
        IDecisionsRepository decisionsRepository,
        IFeedbackRepository feedbackRepository,
        IJobRunsRepository jobRunsRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider,
        ILogger<JobOrchestrationService> logger)
    {
        _decisionsRepository = decisionsRepository;
        _feedbackRepository = feedbackRepository;
        _jobRunsRepository = jobRunsRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
        _logger = logger;
    }

    public async Task<JobRunResponse> RunModelRetrainingAsync(string triggeredByUserId, CancellationToken cancellationToken)
    {
        var run = JobRunRecord.Start(JobType.ModelRetraining, triggeredByUserId, _dateTimeProvider.UtcNow);
        await _jobRunsRepository.AddAsync(run, cancellationToken);

        try
        {
            var recentFeedbackCount = await CountRecentFeedbackSafeAsync(cancellationToken);
            var finalizedDecisions = await CountFinalizedDecisionsSafeAsync(cancellationToken);

            var details = $"Recent feedback={recentFeedbackCount}; finalized decisions={finalizedDecisions}.";
            run.CompleteSuccess(details, triggeredByUserId, _dateTimeProvider.UtcNow);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Model retraining run completed: {Details}", details);
            return ToResponse(run);
        }
        catch (Exception ex)
        {
            run.CompleteFailure(ex.Message, triggeredByUserId, _dateTimeProvider.UtcNow);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            _logger.LogError(ex, "Model retraining run failed.");
            throw;
        }
    }

    public async Task<IReadOnlyList<JobRunResponse>> ListRecentAsync(int count, CancellationToken cancellationToken)
    {
        var cappedCount = Math.Clamp(count, 1, 50);
        var items = await _jobRunsRepository.ListRecentAsync(cappedCount, cancellationToken);
        return items.Select(ToResponse).ToArray();
    }

    private static JobRunResponse ToResponse(JobRunRecord item)
    {
        return new JobRunResponse(
            item.Id,
            item.JobType.ToString(),
            item.Status.ToString(),
            item.TriggeredBy,
            item.Details,
            item.StartedAtUtc,
            item.CompletedAtUtc);
    }

    private async Task<int> CountRecentFeedbackSafeAsync(CancellationToken cancellationToken)
    {
        if (_feedbackTableUnavailable)
        {
            return 0;
        }

        try
        {
            return await _feedbackRepository.CountRecentAsync(_dateTimeProvider.UtcNow.AddDays(-14), cancellationToken);
        }
        catch (Exception ex) when (IsMissingLegacyTable(ex))
        {
            _feedbackTableUnavailable = true;
            _logger.LogWarning("Feedback table is unavailable in the current schema; defaulting retraining feedback count to 0.");
            return 0;
        }
    }

    private async Task<int> CountFinalizedDecisionsSafeAsync(CancellationToken cancellationToken)
    {
        if (_decisionTableUnavailable)
        {
            return 0;
        }

        try
        {
            return await _decisionsRepository.CountByStatesAsync(
                new[] { DecisionState.Approved, DecisionState.Rejected },
                cancellationToken);
        }
        catch (Exception ex) when (IsMissingLegacyTable(ex))
        {
            _decisionTableUnavailable = true;
            _logger.LogWarning("Decision table is unavailable in the current schema; defaulting retraining finalized count to 0.");
            return 0;
        }
    }

    private static bool IsMissingLegacyTable(Exception exception)
    {
        return exception.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase);
    }
}
