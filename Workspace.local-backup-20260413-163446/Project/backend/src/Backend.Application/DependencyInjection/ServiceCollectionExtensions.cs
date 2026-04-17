using Backend.Application.Abstractions.Services;
using Backend.Application.Services;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace Backend.Application.DependencyInjection;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly(), includeInternalTypes: true);

        services.AddScoped<ICaseService, CaseService>();
        services.AddScoped<ICoveragePainAnalysisService, CoveragePainAnalysisService>();
        services.AddScoped<ICtiPolicyService, CtiPolicyService>();
        services.AddScoped<IEvidenceService, EvidenceService>();
        services.AddScoped<IDecisionService, DecisionService>();
        services.AddScoped<IRuleService, RuleService>();
        services.AddScoped<IDeploymentService, DeploymentService>();
        services.AddScoped<IRuleWorkflowService, RuleWorkflowService>();
        services.AddScoped<IFeedbackService, FeedbackService>();
        services.AddScoped<IJobOrchestrationService, JobOrchestrationService>();
        services.AddScoped<IReportIngestionService, ReportIngestionService>();

        return services;
    }
}
