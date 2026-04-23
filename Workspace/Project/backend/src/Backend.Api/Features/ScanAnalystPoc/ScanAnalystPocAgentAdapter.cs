using Backend.Application.Abstractions.Integrations;

namespace Backend.Api.Features.ScanAnalystPoc;

public interface IScanAnalystPocAgentAdapter
{
    Task<AiScanAnalystRecommendationResult> RecommendAsync(AiScanAnalystContextRequest request, CancellationToken cancellationToken);
}

public sealed class HeuristicScanAnalystPocAgentAdapter : IScanAnalystPocAgentAdapter
{
    private readonly IAiScanAnalystClient _scanAnalystClient;

    public HeuristicScanAnalystPocAgentAdapter(IAiScanAnalystClient scanAnalystClient)
    {
        _scanAnalystClient = scanAnalystClient;
    }

    public Task<AiScanAnalystRecommendationResult> RecommendAsync(
        AiScanAnalystContextRequest request,
        CancellationToken cancellationToken)
    {
        return _scanAnalystClient.RecommendAsync(request, cancellationToken);
    }
}
