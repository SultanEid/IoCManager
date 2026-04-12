using Backend.Contracts.Deployments;

namespace Backend.Application.Abstractions.Services;

public interface IDeploymentService
{
    Task<DeploymentResponse> CreateAsync(CreateDeploymentRequest request, CancellationToken cancellationToken);
    Task<DeploymentResponse?> UpdateStatusAsync(Guid deploymentId, UpdateDeploymentStatusRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<DeploymentResponse>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken);
}
