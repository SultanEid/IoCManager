using Backend.Application.Abstractions.Persistence;
using Backend.Application.Abstractions.Security;
using Backend.Application.Abstractions.Integrations;
using Backend.Application.Common;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Backend.Infrastructure.Configuration;
using Backend.Infrastructure.Integrations;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Persistence.Repositories;
using Backend.Infrastructure.Persistence.QueryServices;
using Backend.Infrastructure.Security;
using Backend.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Backend.Application.Abstractions.Services;

namespace Backend.Infrastructure.DependencyInjection;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {

        services
            .AddScoped<IScanPlanService, ScanPlanService>();


        services
            .AddOptions<DatabaseOptions>()
            .Bind(configuration.GetSection(DatabaseOptions.SectionName))
            .Validate(options => !string.IsNullOrWhiteSpace(options.ConnectionStringName), "Database:ConnectionStringName must be configured.")
            .ValidateOnStart();

        services
            .AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(options => !string.IsNullOrWhiteSpace(options.Issuer), "Auth:Jwt:Issuer must be configured.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.Audience), "Auth:Jwt:Audience must be configured.")
            .ValidateOnStart();

        services
            .AddOptions<BootstrapAdminOptions>()
            .Bind(configuration.GetSection(BootstrapAdminOptions.SectionName))
            .ValidateOnStart();
        services
            .AddOptions<SqlUserTableAuthOptions>()
            .Bind(configuration.GetSection(SqlUserTableAuthOptions.SectionName))
            .ValidateOnStart();
        services
            .AddOptions<LegacyAzureCompatibilityOptions>()
            .Bind(configuration.GetSection(LegacyAzureCompatibilityOptions.SectionName))
            .ValidateOnStart();
        services
            .AddOptions<LegacyScanPipelineOptions>()
            .Bind(configuration.GetSection(LegacyScanPipelineOptions.SectionName))
            .Validate(options => options.MaxTargetsPerExecution is > 0 and <= 25, "LegacyScanPipeline:MaxTargetsPerExecution must be between 1 and 25.")
            .Validate(options => options.MaxParallelTargetExecutions is > 0 and <= 8, "LegacyScanPipeline:MaxParallelTargetExecutions must be between 1 and 8.")
            .ValidateOnStart();

        services
            .AddOptions<JobSchedulingOptions>()
            .Bind(configuration.GetSection(JobSchedulingOptions.SectionName))
            .Validate(options => !options.EnableModelRetraining || options.ModelRetrainingIntervalHours > 0, "Jobs:ModelRetrainingIntervalHours must be greater than zero when model retraining is enabled.")
            .ValidateOnStart();

        services
            .AddOptions<AiSidecarOptions>()
            .Bind(configuration.GetSection(AiSidecarOptions.SectionName))
            .Validate(options => Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out _), "AiSidecar:BaseUrl must be a valid absolute URI.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.ScanAnalystPath), "AiSidecar:ScanAnalystPath must be configured.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.ReportExtractionPath), "AiSidecar:ReportExtractionPath must be configured.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.ScoreCasePath), "AiSidecar:ScoreCasePath must be configured.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.ExplainCasePath), "AiSidecar:ExplainCasePath must be configured.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.RecommendActionPath), "AiSidecar:RecommendActionPath must be configured.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.HistoricalLearningPath), "AiSidecar:HistoricalLearningPath must be configured.")
            .Validate(options => options.TimeoutSeconds > 0, "AiSidecar:TimeoutSeconds must be greater than zero.")
            .ValidateOnStart();

        services
            .AddOptions<IdentitySecurityOptions>()
            .Bind(configuration.GetSection(IdentitySecurityOptions.SectionName))
            .Validate(options => options.LockoutMinutes > 0, "Auth:Identity:LockoutMinutes must be greater than zero.")
            .Validate(options => options.MaxFailedAccessAttempts > 0, "Auth:Identity:MaxFailedAccessAttempts must be greater than zero.")
            .ValidateOnStart();

        var databaseOptions = configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
        var connectionString = DatabaseConnectionStringResolver.Resolve(configuration, databaseOptions.ConnectionStringName);
        var allowSqlRetries = ShouldEnableSqlRetries(connectionString);

        services.AddDbContext<CtiDbContext>(options =>
            options.UseSqlServer(
                connectionString,
                sqlServer =>
                {
                    sqlServer.MigrationsAssembly(typeof(CtiDbContext).Assembly.FullName);
                    if (allowSqlRetries)
                    {
                        sqlServer.EnableRetryOnFailure();
                    }
                }));

        services.AddDbContext<LegacyScanPipelineDbContext>(options =>
            options.UseSqlServer(
                connectionString,
                sqlServer =>
                {
                    if (allowSqlRetries)
                    {
                        sqlServer.EnableRetryOnFailure();
                    }
                }));

        var identityOptions = configuration.GetSection(IdentitySecurityOptions.SectionName).Get<IdentitySecurityOptions>()
            ?? new IdentitySecurityOptions();

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.Password.RequireDigit = identityOptions.RequireDigit;
                options.Password.RequireLowercase = identityOptions.RequireLowercase;
                options.Password.RequireUppercase = identityOptions.RequireUppercase;
                options.Password.RequireNonAlphanumeric = identityOptions.RequireNonAlphanumeric;
                options.Password.RequiredLength = identityOptions.RequiredLength;
                options.User.RequireUniqueEmail = true;
                options.Lockout.AllowedForNewUsers = identityOptions.LockoutAllowedForNewUsers;
                options.Lockout.MaxFailedAccessAttempts = identityOptions.MaxFailedAccessAttempts;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(identityOptions.LockoutMinutes);
            })
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<CtiDbContext>();

        var sqlUserTableAuthOptions = configuration.GetSection(SqlUserTableAuthOptions.SectionName).Get<SqlUserTableAuthOptions>()
            ?? new SqlUserTableAuthOptions();

        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<CtiDbContext>());
        services.AddScoped<IDateTimeProvider, SystemDateTimeProvider>();
        services.AddScoped<ILegacyAzureCompatibilityReader, LegacyAzureCompatibilityReader>();
        services.AddScoped<SqlUserTableDirectoryService>();
        if (sqlUserTableAuthOptions.Enabled)
        {
            services.AddScoped<IAuthService, SqlUserTableAuthService>();
        }
        else
        {
            services.AddScoped<IAuthService, JwtAuthService>();
        }
        services.AddScoped<IdentityBootstrapper>();

        services.AddScoped<ICasesRepository, CasesRepository>();
        services.AddScoped<IEvidenceRepository, EvidenceRepository>();
        services.AddScoped<IDecisionsRepository, DecisionsRepository>();
        services.AddScoped<IRulesRepository, RulesRepository>();
        services.AddScoped<IDeploymentsRepository, DeploymentsRepository>();
        services.AddScoped<IFeedbackRepository, FeedbackRepository>();
        services.AddScoped<IJobRunsRepository, JobRunsRepository>();
        services.AddScoped<IReportIngestionRepository, ReportIngestionRepository>();
        services.AddScoped<IRuleWorkflowRepository, RuleWorkflowRepository>();
        services.AddScoped<ICtiRecommendationPersistenceRepository, CtiRecommendationPersistenceRepository>();
        services.AddScoped<IAiDecisionRepository, AiDecisionRepository>();
        services.AddScoped<ICtiDecisionReplayQueryService, CtiDecisionReplayQueryService>();
        services.AddScoped<ICoveragePainAnalysisQueryService, CoveragePainAnalysisQueryService>();

        services.AddHttpClient<IAiReportExtractionClient, AiReportExtractionClient>((sp, client) =>
        {
            var sidecarOptions = sp.GetRequiredService<IOptions<AiSidecarOptions>>().Value;
            client.BaseAddress = new Uri(sidecarOptions.BaseUrl, UriKind.Absolute);
            client.Timeout = TimeSpan.FromSeconds(sidecarOptions.TimeoutSeconds);
        });
        services.AddHttpClient<IAiDecisionClient, AiDecisionClient>((sp, client) =>
        {
            var sidecarOptions = sp.GetRequiredService<IOptions<AiSidecarOptions>>().Value;
            client.BaseAddress = new Uri(sidecarOptions.BaseUrl, UriKind.Absolute);
            client.Timeout = TimeSpan.FromSeconds(sidecarOptions.TimeoutSeconds);
        });
        services.AddHttpClient<IAiScanAnalystClient, AiScanAnalystClient>((sp, client) =>
        {
            var sidecarOptions = sp.GetRequiredService<IOptions<AiSidecarOptions>>().Value;
            client.BaseAddress = new Uri(sidecarOptions.BaseUrl, UriKind.Absolute);
            client.Timeout = TimeSpan.FromSeconds(sidecarOptions.TimeoutSeconds);
        });

        return services;
    }

    private static bool ShouldEnableSqlRetries(string connectionString)
    {
        try
        {
            var builder = new SqlConnectionStringBuilder(connectionString);
            var dataSource = builder.DataSource?.Trim() ?? string.Empty;
            return !dataSource.Contains("(localdb)", StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return true;
        }
    }
}

