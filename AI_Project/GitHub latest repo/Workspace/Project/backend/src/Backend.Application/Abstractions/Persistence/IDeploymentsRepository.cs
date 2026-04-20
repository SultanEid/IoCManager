using Backend.Domain.Deployments;

namespace Backend.Application.Abstractions.Persistence;

public interface IDeploymentsRepository
{
    Task AddAsync(DeploymentRecord item, CancellationToken cancellationToken);
    Task<DeploymentRecord?> GetByIdAsync(Guid deploymentId, CancellationToken cancellationToken);
    Task<IReadOnlyList<DeploymentRecord>> ListByCaseAsync(Guid caseId, CancellationToken cancellationToken);
}
