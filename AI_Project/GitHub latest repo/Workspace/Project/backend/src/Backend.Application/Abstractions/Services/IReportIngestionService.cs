using Backend.Contracts.Reports;

namespace Backend.Application.Abstractions.Services;

public interface IReportIngestionService
{
    Task<ReportIngestionResponse> IngestAsync(
        IngestReportRequest request,
        byte[]? uploadedFileBytes,
        string? uploadedFileName,
        string? uploadedContentType,
        CancellationToken cancellationToken);

    Task<ReportIngestionDetailResponse?> GetAsync(Guid ingestionId, CancellationToken cancellationToken);
}
