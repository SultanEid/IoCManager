using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Services;
using Backend.Application.Common;
using Backend.Contracts.Evidence;
using Backend.Domain.Evidence;

namespace Backend.Application.Services;

public sealed class EvidenceService : IEvidenceService
{
    private readonly ICasesRepository _casesRepository;
    private readonly IEvidenceRepository _evidenceRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _dateTimeProvider;

    public EvidenceService(
        ICasesRepository casesRepository,
        IEvidenceRepository evidenceRepository,
        IUnitOfWork unitOfWork,
        IDateTimeProvider dateTimeProvider)
    {
        _casesRepository = casesRepository;
        _evidenceRepository = evidenceRepository;
        _unitOfWork = unitOfWork;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<EvidenceResponse> AddAsync(AddEvidenceRequest request, CancellationToken cancellationToken)
    {
        var caseRecord = await _casesRepository.GetByIdAsync(request.CaseId, cancellationToken);
        if (caseRecord is null)
        {
            throw new NotFoundException($"Case {request.CaseId} was not found.");
        }

        var evidence = EvidenceItem.Create(
            request.CaseId,
            request.EvidenceType,
            request.SourceSystem,
            request.ContentHash,
            request.PayloadJson,
            request.Confidence,
            request.CollectedAtUtc,
            request.ActorUserId,
            _dateTimeProvider.UtcNow);

        await _evidenceRepository.AddAsync(evidence, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToResponse(evidence);
    }

    public async Task<IReadOnlyList<EvidenceResponse>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken)
    {
        var items = await _evidenceRepository.ListByCaseAsync(caseId, cancellationToken);
        return items.Select(ToResponse).ToArray();
    }

    private static EvidenceResponse ToResponse(EvidenceItem item)
    {
        return new EvidenceResponse(
            item.Id,
            item.CaseId,
            item.EvidenceType,
            item.SourceSystem,
            item.ContentHash,
            item.Confidence,
            item.CollectedAtUtc,
            item.CreatedAtUtc);
    }
}
