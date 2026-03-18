using IocVmwareIngestion.Api.Entities;

namespace IocVmwareIngestion.Api.Services;

public interface IScanRunRepository
{
    Task EnsureSchemaAsync(CancellationToken cancellationToken);
    Task SaveAsync(ScanRun scanRun, CancellationToken cancellationToken);
    Task<ScanRun?> GetAsync(Guid id, CancellationToken cancellationToken);
}
