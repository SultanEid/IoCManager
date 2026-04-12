using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.Deployments;
using Backend.Domain.Common;
using Backend.Domain.Deployments;

namespace Backend.Application.Services;

public sealed class DeploymentService : IDeploymentService
{
    private readonly ICasesRepository _casesRepository;
    private readonly IRulesRepository _rulesRepository;
    private readonly IDeploymentsRepository _deploymentsRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;

    public DeploymentService(
        ICasesRepository casesRepository,
        IRulesRepository rulesRepository,
        IDeploymentsRepository deploymentsRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider)
    {
        _casesRepository = casesRepository;
        _rulesRepository = rulesRepository;
        _deploymentsRepository = deploymentsRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<DeploymentResponse> CreateAsync(CreateDeploymentRequest request, CancellationToken cancellationToken)
    {
        var caseRecord = await _casesRepository.GetByIdAsync(request.CaseId, cancellationToken);
        if (caseRecord is null)
        {
            throw new NotFoundException($"Case {request.CaseId} was not found.");
        }

        var rule = await _rulesRepository.GetByIdAsync(request.RuleId, cancellationToken);
        if (rule is null)
        {
            throw new NotFoundException($"Rule {request.RuleId} was not found.");
        }

        var deployment = DeploymentRecord.Propose(
            request.CaseId,
            request.RuleId,
            request.TargetEnvironment,
            request.RequestedByUserId,
            _dateTimeProvider.UtcNow);

        await _deploymentsRepository.AddAsync(deployment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToResponse(deployment);
    }

    public async Task<DeploymentResponse?> UpdateStatusAsync(
        Guid deploymentId,
        UpdateDeploymentStatusRequest request,
        CancellationToken cancellationToken)
    {
        var deployment = await _deploymentsRepository.GetByIdAsync(deploymentId, cancellationToken);
        if (deployment is null)
        {
            return null;
        }

        var status = EnumParser.Parse<DeploymentStatus>(request.Status, nameof(request.Status));
        var nowUtc = _dateTimeProvider.UtcNow;

        switch (status)
        {
            case DeploymentStatus.Approved:
                deployment.Approve(request.ActorUserId, nowUtc);
                break;
            case DeploymentStatus.Rejected:
                deployment.Reject(request.ActorUserId, nowUtc);
                break;
            case DeploymentStatus.Scheduled:
                deployment.MarkScheduled(request.ActorUserId, nowUtc);
                break;
            case DeploymentStatus.Deployed:
            {
                deployment.MarkDeployed(request.ActorUserId, nowUtc);
                var rule = await _rulesRepository.GetByIdAsync(deployment.RuleId, cancellationToken);
                rule?.RecordDeployment(nowUtc, request.ActorUserId, nowUtc);
                break;
            }
            case DeploymentStatus.RolledBack:
                deployment.MarkRolledBack(request.ActorUserId, nowUtc);
                break;
            default:
                throw new ArgumentException("Status must be Approved, Rejected, Scheduled, Deployed, or RolledBack.", nameof(request.Status));
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToResponse(deployment);
    }

    public async Task<IReadOnlyList<DeploymentResponse>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        var items = await _deploymentsRepository.ListByCaseAsync(caseId, cancellationToken);
        return items.Select(ToResponse).ToArray();
    }

    private static DeploymentResponse ToResponse(DeploymentRecord item)
    {
        return new DeploymentResponse(
            item.Id,
            item.CaseId,
            item.RuleId,
            item.TargetEnvironment,
            item.Status.ToString(),
            item.RequestedByUserId,
            item.ApprovedByUserId,
            item.ApprovedAtUtc,
            item.DeployedAtUtc,
            item.CreatedAtUtc,
            item.UpdatedAtUtc);
    }
}
