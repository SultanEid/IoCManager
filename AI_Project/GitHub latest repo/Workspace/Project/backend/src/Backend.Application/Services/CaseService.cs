using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.Cases;
using Backend.Domain.Cases;
using Backend.Domain.Common;

namespace Backend.Application.Services;

public sealed class CaseService : ICaseService
{
    private readonly ICasesRepository _casesRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;

    public CaseService(ICasesRepository casesRepository, IUnitOfWork unitOfWork, IDateTimeProvider dateTimeProvider)
    {
        _casesRepository = casesRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<CaseResponse> CreateAsync(CreateCaseRequest request, CancellationToken cancellationToken)
    {
        var nowUtc = _dateTimeProvider.UtcNow;
        var priority = EnumParser.Parse<CasePriority>(request.Priority, nameof(request.Priority));
        var approvalTier = EnumParser.Parse<ApprovalTier>(request.ApprovalTierRequired, nameof(request.ApprovalTierRequired));

        var caseRecord = CaseRecord.Open(
            request.Title,
            request.Summary,
            priority,
            request.OwnerUserId,
            approvalTier,
            request.RequestedByUserId,
            nowUtc);

        await _casesRepository.AddAsync(caseRecord, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToResponse(caseRecord);
    }

    public async Task<CaseResponse?> GetAsync(Guid caseId, CancellationToken cancellationToken)
    {
        var caseRecord = await _casesRepository.GetByIdAsync(caseId, cancellationToken);
        return caseRecord is null ? null : ToResponse(caseRecord);
    }

    public async Task<IReadOnlyList<CaseResponse>> ListAsync(CancellationToken cancellationToken)
    {
        var items = await _casesRepository.ListAsync(cancellationToken);
        return items.Select(ToResponse).ToArray();
    }

    public async Task<CaseResponse?> UpdateStatusAsync(Guid caseId, UpdateCaseStatusRequest request, CancellationToken cancellationToken)
    {
        var caseRecord = await _casesRepository.GetByIdAsync(caseId, cancellationToken);
        if (caseRecord is null)
        {
            return null;
        }

        var nextStatus = EnumParser.Parse<CaseStatus>(request.Status, nameof(request.Status));
        caseRecord.TransitionTo(nextStatus, request.ActorUserId, _dateTimeProvider.UtcNow);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToResponse(caseRecord);
    }

    private static CaseResponse ToResponse(CaseRecord item)
    {
        return new CaseResponse(
            item.Id,
            item.Title,
            item.Summary,
            item.Priority.ToString(),
            item.Status.ToString(),
            item.OwnerUserId,
            item.ApprovalTierRequired.ToString(),
            item.CreatedAtUtc,
            item.UpdatedAtUtc);
    }
}
