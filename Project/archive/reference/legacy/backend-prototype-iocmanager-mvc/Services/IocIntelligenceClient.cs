using System.Net.Http.Json;
using IoCManager.Mvc.Contracts.Intel;
using Microsoft.Extensions.Options;

namespace IoCManager.Mvc.Services;

public sealed class IocIntelligenceClient : IIocIntelligenceClient
{
    private readonly HttpClient _httpClient;
    private readonly IocIntelligenceOptions _options;
    private readonly ILogger<IocIntelligenceClient> _logger;

    public IocIntelligenceClient(
        HttpClient httpClient,
        IOptions<IocIntelligenceOptions> options,
        ILogger<IocIntelligenceClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IocScoringResult> ScoreAsync(ScoreIocRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return new IocScoringResult { Error = "IOC intelligence scoring is disabled." };
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/score_ioc", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("IOC scoring failed with status {StatusCode}: {Body}", (int)response.StatusCode, errorBody);
                return new IocScoringResult
                {
                    Error = $"Scoring failed with status {(int)response.StatusCode}."
                };
            }

            var body = await response.Content.ReadFromJsonAsync<ScoreResponse>(cancellationToken: cancellationToken);
            return new IocScoringResult { Score = body };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "IOC scoring request failed.");
            return new IocScoringResult { Error = "Scoring service unavailable." };
        }
    }

    public async Task<BatchScoreResponse?> ScoreBatchAsync(ScoreBatchRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return null;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/score_batch", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            return await response.Content.ReadFromJsonAsync<BatchScoreResponse>(cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "IOC batch scoring request failed.");
            return null;
        }
    }

    public async Task<bool> SendFeedbackAsync(FeedbackRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return false;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/feedback", request, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "IOC feedback submission failed.");
            return false;
        }
    }

    public async Task<ModelCardResponse?> GetModelCardAsync(CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return null;
        }

        try
        {
            return await _httpClient.GetFromJsonAsync<ModelCardResponse>("/model_card", cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Model card request failed.");
            return null;
        }
    }

    public async Task<ReportIngestionResponse?> IngestReportAsync(ReportIngestionRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return null;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/ingest_report", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            return await response.Content.ReadFromJsonAsync<ReportIngestionResponse>(cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Report ingestion request failed.");
            return null;
        }
    }

    public async Task<RuleProposalResponse?> ProposeRuleAsync(RuleProposalRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return null;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/propose_rules", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            return await response.Content.ReadFromJsonAsync<RuleProposalResponse>(cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Rule proposal request failed.");
            return null;
        }
    }

    public async Task<DeploymentRecommendationResponse?> RecommendDeploymentAsync(DeploymentRecommendationRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return null;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/recommend_deployment", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            return await response.Content.ReadFromJsonAsync<DeploymentRecommendationResponse>(cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Deployment recommendation request failed.");
            return null;
        }
    }

    public async Task<CopilotQueryResponse?> QueryCopilotAsync(CopilotQueryRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return null;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/copilot/query", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            return await response.Content.ReadFromJsonAsync<CopilotQueryResponse>(cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Copilot query request failed.");
            return null;
        }
    }

    public async Task<IReadOnlyList<GraphLinkCandidateResponse>?> GetGraphLinkCandidatesAsync(GraphLinkCandidateRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return null;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/graph/link_candidates", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var body = await response.Content.ReadFromJsonAsync<List<GraphLinkCandidateResponse>>(cancellationToken: cancellationToken);
            return body;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Graph link candidate request failed.");
            return null;
        }
    }

    public async Task<CaseScoreVectorResponse?> ScoreCaseAsync(ScoreCaseRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return null;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/score_case", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            return await response.Content.ReadFromJsonAsync<CaseScoreVectorResponse>(cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Case scoring request failed.");
            return null;
        }
    }

    public async Task<RecommendActionResponse?> RecommendActionAsync(RecommendActionRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return null;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/recommend_action", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            return await response.Content.ReadFromJsonAsync<RecommendActionResponse>(cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Recommend action request failed.");
            return null;
        }
    }

    public async Task<RequestMoreEvidenceResponse?> RequestMoreEvidenceAsync(RequestMoreEvidenceRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return null;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/request_more_evidence", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            return await response.Content.ReadFromJsonAsync<RequestMoreEvidenceResponse>(cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Request more evidence failed.");
            return null;
        }
    }

    public async Task<SimulateRuleResponse?> SimulateRuleAsync(SimulateRuleRequest request, CancellationToken cancellationToken = default)
    {
        if (!_options.EnableScoring)
        {
            return null;
        }

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/simulate_rule", request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            return await response.Content.ReadFromJsonAsync<SimulateRuleResponse>(cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Simulate rule request failed.");
            return null;
        }
    }
}
