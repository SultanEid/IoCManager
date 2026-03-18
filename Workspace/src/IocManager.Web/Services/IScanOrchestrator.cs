using IocVmwareIngestion.Api.Contracts;

namespace IocVmwareIngestion.Api.Services;

public interface IScanOrchestrator
{
    Task<ScanRunResponse> RunAsync(RunScanRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ScanRunResponse>> RunConfiguredTargetsAsync(RunAllConfiguredScansRequest request, CancellationToken cancellationToken);
}
