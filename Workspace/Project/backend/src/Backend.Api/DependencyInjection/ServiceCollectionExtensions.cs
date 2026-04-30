using Backend.Api.Infrastructure;
using Backend.Api.Infrastructure.Execution;
using Backend.Api.Middlewares;
using Backend.Api.Features.ReportMitigationPoc;
using Backend.Api.Features.ScanAnalystPoc;
using Backend.Application.Abstractions.Services;
using Backend.Application.DependencyInjection;
using Backend.Infrastructure.Configuration;
using Backend.Infrastructure.DependencyInjection;
using Backend.Infrastructure.Persistence;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Api.DependencyInjection;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApiServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var skipHostedWorkers = configuration.GetValue<bool>("AppStartup:SkipHostedWorkers");
        var enableAiDecisionWorker = configuration.GetValue<bool>("AppStartup:EnableAiDecisionWorker");
        var enableLegacyScanPipelineWorker = configuration.GetValue<bool>("AppStartup:EnableLegacyScanPipelineWorker");
        var enableScanAnalystPocAutonomyWorker = configuration.GetValue<bool>("AppStartup:EnableScanAnalystPocAutonomyWorker");
        var enableAegisMitigationAutonomyWorker = configuration.GetValue<bool>("AppStartup:EnableAegisMitigationAutonomyWorker");

        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails(options =>
        {
            options.CustomizeProblemDetails = context =>
            {
                context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
            };
        });

        services.AddControllers();
        var legacyPipelineOptions = configuration.GetSection(LegacyScanPipelineOptions.SectionName).Get<LegacyScanPipelineOptions>()
            ?? new LegacyScanPipelineOptions();
        var dataProtectionKeyRingDirectory = ResolveConfiguredPath(legacyPipelineOptions.DataProtectionKeyRingDirectory);
        Directory.CreateDirectory(dataProtectionKeyRingDirectory);
        services
            .AddDataProtection()
            .SetApplicationName("IoCManager")
            .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeyRingDirectory));
        services.AddFluentValidationAutoValidation();
        services.AddEndpointsApiExplorer();
        services.AddOpenApiDocumentation();
        services.AddHttpClient(AiSidecarHealthCheck.ProbeClientName, client =>
        {
            client.Timeout = TimeSpan.FromMilliseconds(800);
        });
        services.AddHttpClient(RuleDistributionTransportDispatcher.HttpClientName);
        services.AddHttpClient(ScanExecutionDispatcher.HttpClientName);
        services.AddHealthChecks()
            .AddDbContextCheck<CtiDbContext>(
                "database",
                tags: new[] { "required" })
            .AddCheck<AiSidecarHealthCheck>(
                "ai_sidecar",
                failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded,
                tags: new[] { "optional" });
        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-CSRF-TOKEN";
            options.Cookie.Name = "ioc.manager.csrf";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        });
        services.AddSingleton<ApiRequestThrottlingMiddleware>();
        services.AddScoped<CookieAntiforgeryMiddleware>();
        services
            .AddOptions<AuthSensitiveAuditOptions>()
            .Bind(configuration.GetSection(AuthSensitiveAuditOptions.SectionName))
            .ValidateOnStart();
        services
            .AddOptions<DiscoveryExecutionOptions>()
            .Bind(configuration.GetSection(DiscoveryExecutionOptions.SectionName))
            .Validate(options => options.TimeoutMilliseconds is >= 100 and <= 5000, "Infrastructure:Discovery:TimeoutMilliseconds must be between 100 and 5000.")
            .Validate(options => options.MaxParallelism is >= 1 and <= 128, "Infrastructure:Discovery:MaxParallelism must be between 1 and 128.")
            .Validate(options => options.MaxHostsPerRun is > 0 and <= 256, "Infrastructure:Discovery:MaxHostsPerRun must be between 1 and 256.")
            .Validate(options => options.DnsLookupTimeoutMilliseconds is >= 250 and <= 5000, "Infrastructure:Discovery:DnsLookupTimeoutMilliseconds must be between 250 and 5000.")
            .Validate(options => options.ScheduledLegacyNetworkSweepIntervalMinutes is >= 1 and <= 60, "Infrastructure:Discovery:ScheduledLegacyNetworkSweepIntervalMinutes must be between 1 and 60.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.ScheduledLegacyNetworkSweepActorUserId), "Infrastructure:Discovery:ScheduledLegacyNetworkSweepActorUserId must be configured.")
            .ValidateOnStart();
        services
            .AddOptions<RuleDistributionExecutionOptions>()
            .Bind(configuration.GetSection(RuleDistributionExecutionOptions.SectionName))
            .Validate(options => options.MaxAttempts is >= 1 and <= 10, "Infrastructure:RuleDistribution:MaxAttempts must be between 1 and 10.")
            .Validate(options => options.BackoffSeconds is { Length: > 0 } && options.BackoffSeconds.All(x => x > 0), "Infrastructure:RuleDistribution:BackoffSeconds must contain positive values.")
            .Validate(options => options.SchedulerIntervalSeconds is >= 1 and <= 60, "Infrastructure:RuleDistribution:SchedulerIntervalSeconds must be between 1 and 60.")
            .Validate(options => options.CommandTimeoutSeconds is >= 5 and <= 300, "Infrastructure:RuleDistribution:CommandTimeoutSeconds must be between 5 and 300.")
            .Validate(options => options.HttpTimeoutSeconds is >= 5 and <= 300, "Infrastructure:RuleDistribution:HttpTimeoutSeconds must be between 5 and 300.")
            .Validate(options => options.MaxJitterSeconds is >= 0 and <= 30, "Infrastructure:RuleDistribution:MaxJitterSeconds must be between 0 and 30.")
            .ValidateOnStart();
        services
            .AddOptions<ScanExecutionOptions>()
            .Bind(configuration.GetSection(ScanExecutionOptions.SectionName))
            .Validate(options => options.SchedulerIntervalSeconds is >= 1 and <= 300, "Infrastructure:Scanning:SchedulerIntervalSeconds must be between 1 and 300.")
            .Validate(options => options.HttpTimeoutSeconds is >= 5 and <= 300, "Infrastructure:Scanning:HttpTimeoutSeconds must be between 5 and 300.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.AgentEndpointPath), "Infrastructure:Scanning:AgentEndpointPath must be configured.")
            .Validate(options => options.MaxRawOutputChars is >= 256 and <= 200_000, "Infrastructure:Scanning:MaxRawOutputChars must be between 256 and 200000.")
            .Validate(options => options.MaxResultFiles is >= 1 and <= 2048, "Infrastructure:Scanning:MaxResultFiles must be between 1 and 2048.")
            .Validate(options => options.MaxFindings is >= 1 and <= 20_000, "Infrastructure:Scanning:MaxFindings must be between 1 and 20000.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.WorkerActorUserId), "Infrastructure:Scanning:WorkerActorUserId must be configured.")
            .ValidateOnStart();
        services
            .AddOptions<AiDecisionExecutionOptions>()
            .Bind(configuration.GetSection(AiDecisionExecutionOptions.SectionName))
            .Validate(options => options.SchedulerIntervalSeconds is >= 1 and <= 300, "Infrastructure:AiDecision:SchedulerIntervalSeconds must be between 1 and 300.")
            .Validate(options => options.MaxAttempts is >= 1 and <= 10, "Infrastructure:AiDecision:MaxAttempts must be between 1 and 10.")
            .Validate(options => options.HistoricalTopK is >= 1 and <= 100, "Infrastructure:AiDecision:HistoricalTopK must be between 1 and 100.")
            .Validate(options => options.HistoricalLookbackDays is >= 1 and <= 3650, "Infrastructure:AiDecision:HistoricalLookbackDays must be between 1 and 3650.")
            .Validate(options => options.BackoffSeconds is { Length: > 0 } && options.BackoffSeconds.All(x => x > 0), "Infrastructure:AiDecision:BackoffSeconds must contain positive values.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.WorkerActorUserId), "Infrastructure:AiDecision:WorkerActorUserId must be configured.")
            .ValidateOnStart();
        services
            .AddOptions<PowerBiVisualizationOptions>()
            .Bind(configuration.GetSection(PowerBiVisualizationOptions.SectionName));
        services
            .AddOptions<AlertOwnerOptions>()
            .Bind(configuration.GetSection(AlertOwnerOptions.SectionName))
            .ValidateOnStart();
        services
            .AddOptions<SmtpNotificationOptions>()
            .Bind(configuration.GetSection(SmtpNotificationOptions.SectionName))
            .Validate(options => options.Port > 0, "Notifications:Smtp:Port must be positive.")
            .Validate(options => !options.Enabled || !string.IsNullOrWhiteSpace(options.Host), "Notifications:Smtp:Host is required when SMTP is enabled.")
            .Validate(options => !options.Enabled || !string.IsNullOrWhiteSpace(options.FromEmail), "Notifications:Smtp:FromEmail is required when SMTP is enabled.")
            .ValidateOnStart();
        services
            .AddOptions<LegacyScanPipelineOptions>()
            .Bind(configuration.GetSection(LegacyScanPipelineOptions.SectionName))
            .ValidateOnStart();
        services
            .AddOptions<ScanAnalystPocOptions>()
            .Bind(configuration.GetSection(ScanAnalystPocOptions.SectionName))
            .Validate(options => options.AutonomyIntervalSeconds >= 15, "ScanAnalystPoc:AutonomyIntervalSeconds must be at least 15.")
            .Validate(options => options.AutonomyCooldownMinutes >= 0, "ScanAnalystPoc:AutonomyCooldownMinutes must be zero or greater.")
            .Validate(options => options.MaxTargetsPerRun is >= 1 and <= 25, "ScanAnalystPoc:MaxTargetsPerRun must be between 1 and 25.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.SystemActorUserId), "ScanAnalystPoc:SystemActorUserId must be configured.")
            .ValidateOnStart();
        services
            .AddOptions<AegisMitigationOptions>()
            .Bind(configuration.GetSection(AegisMitigationOptions.SectionName))
            .Validate(options => options.AutonomyIntervalSeconds >= 30, "AegisMitigation:AutonomyIntervalSeconds must be at least 30.")
            .Validate(options => options.SevereAlertLookbackHours is >= 1 and <= 168, "AegisMitigation:SevereAlertLookbackHours must be between 1 and 168.")
            .Validate(options => options.MaxAlertsPerPass is >= 1 and <= 10, "AegisMitigation:MaxAlertsPerPass must be between 1 and 10.")
            .Validate(options => !string.IsNullOrWhiteSpace(options.SystemActorUserId), "AegisMitigation:SystemActorUserId must be configured.")
            .ValidateOnStart();
        services
            .AddOptions<AgentNotificationEmailOptions>()
            .Bind(configuration.GetSection(AgentNotificationEmailOptions.SectionName));

        services.AddScoped<IAuthSensitiveAuditService, AuthSensitiveAuditService>();
        services.AddScoped<IAlertRegistrySchemaInitializer, AlertRegistrySchemaInitializer>();
        services.AddScoped<ILegacyScanPipelineSchemaInitializer, LegacyScanPipelineSchemaInitializer>();
        services.AddScoped<IOperationalStoreSchemaInitializer, OperationalStoreSchemaInitializer>();
        services.AddScoped<LegacyScanPipelineService>();
        services.AddScoped<ILegacyScanPipelineService>(provider => provider.GetRequiredService<LegacyScanPipelineService>());
        services.AddSingleton<IPowerBiVisualizationCatalogService, PowerBiVisualizationCatalogService>();
        services.AddScoped<IRuleRevisionValidationPipeline, RuleRevisionValidationPipeline>();
        services.AddScoped<IResultIngestionService, ResultIngestionService>();
        services.AddScoped<AegisActivityNotifier>();
        services.AddScoped<AegisMitigationPlanner>();
        services.AddScoped<AlertOwnerDirectoryService>();
        services.AddScoped<IAlertOwnerResolver>(provider => provider.GetRequiredService<AlertOwnerDirectoryService>());
        services.AddScoped<IAlertOwnerDirectoryService>(provider => provider.GetRequiredService<AlertOwnerDirectoryService>());
        services.AddSingleton<IAlertEmailSender, SmtpAlertEmailSender>();
        services.AddSingleton<ILegacyScannerResultExtractor, LegacyScannerResultExtractor>();
        services.AddSingleton<TargetServerConnectionSecretProtector>();
        services.AddSingleton<LegacyNetworkSshPasswordProtector>();
        services.AddSingleton<LegacySnortQuarantineSessionManager>();
        services.AddSingleton<LegacySuricataQuarantineSessionManager>();
        services.AddSingleton<DiscoveryTargetRangeParser>();
        services.AddSingleton<IDiscoveryObservationProvider, DiscoveryObservationProvider>();
        services.AddSingleton<IDiscoveryRunQueue, DiscoveryRunQueue>();
        services.AddSingleton<IRuleDistributionJobQueue, RuleDistributionJobQueue>();
        services.AddSingleton<IScanJobQueue, ScanJobQueue>();
        services.AddSingleton<IAiDecisionQueue, AiDecisionQueue>();
        services.AddSingleton<IAiDecisionOrchestrator, AiDecisionOrchestrator>();
        services.AddSingleton<ScanAnalystPocRuntimeState>();
        services.AddSingleton<ScanAnalystPocSessionStore>();
        services.AddSingleton<IIcmpProbe, SystemIcmpProbe>();
        services.AddSingleton<IRuleDistributionCommandRunner, RuleDistributionCommandRunner>();
        services.AddSingleton<IRuleDistributionTransportDispatcher, RuleDistributionTransportDispatcher>();
        services.AddSingleton<ILegacyScriptScanExecutor, LegacyScriptScanExecutor>();
        services.AddSingleton<IScanExecutionDispatcher, ScanExecutionDispatcher>();
        services.AddScoped<IScanAnalystPocAgentAdapter, HeuristicScanAnalystPocAgentAdapter>();
        services.AddScoped<ScanAnalystPocService>();
        if (!skipHostedWorkers)
        {
            services.AddHostedService<DiscoveryRunWorker>();
            services.AddHostedService<RuleDistributionWorker>();
            services.AddHostedService<ScanPlanExecutionWorker>();
        }

        if (!skipHostedWorkers || enableScanAnalystPocAutonomyWorker)
        {
            services.AddHostedService<ScanAnalystPocAutonomyWorker>();
        }

        if (!skipHostedWorkers || enableAegisMitigationAutonomyWorker)
        {
            services.AddHostedService<AegisMitigationAutonomyWorker>();
        }

        if (!skipHostedWorkers || enableLegacyScanPipelineWorker)
        {
            services.AddHostedService<LegacyScanPipelineWorker>();
        }

        if (!skipHostedWorkers || enableAiDecisionWorker)
        {
            services.AddHostedService<AiDecisionWorker>();
        }
        services.AddApiRateLimiting(configuration);

        services.AddApplication();
        services.AddInfrastructure(configuration);
        services.AddAuthorization(AuthorizationPolicies.Configure);
        services.AddApiAuthentication(configuration, environment);

        return services;
    }

    private static IServiceCollection AddOpenApiDocumentation(this IServiceCollection services)
    {
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Backend API",
                Version = "v1",
                Description = "IoC Manager backend for ingestion, rule lifecycle, server operations, distribution, scans, and alerts.",
            });

            var jwtScheme = new OpenApiSecurityScheme
            {
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = JwtBearerDefaults.AuthenticationScheme,
                BearerFormat = "JWT",
                Description = "JWT Bearer token.",
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = JwtBearerDefaults.AuthenticationScheme,
                },
            };

            options.AddSecurityDefinition(jwtScheme.Reference.Id, jwtScheme);
            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                { jwtScheme, Array.Empty<string>() },
            });
        });

        return services;
    }

    private static IServiceCollection AddApiAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

        if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey) || jwtOptions.SigningKey.Length < 32)
        {
            if (!environment.IsDevelopment())
            {
                throw new InvalidOperationException("Auth:Jwt:SigningKey must be configured in non-development environments.");
            }

            jwtOptions.SigningKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
            services.PostConfigure<JwtOptions>(options => options.SigningKey = jwtOptions.SigningKey);
        }

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey));

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = !environment.IsDevelopment();
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = signingKey,
                    ClockSkew = TimeSpan.FromMinutes(1),
                };
            });

        return services;
    }

    private static IServiceCollection AddApiRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<ApiRateLimitingOptions>()
            .Bind(configuration.GetSection(ApiRateLimitingOptions.SectionName))
            .Validate(ValidateRateLimitingOptions, "RateLimiting configuration is invalid.")
            .ValidateOnStart();

        return services;
    }

    private static bool ValidateRateLimitingOptions(ApiRateLimitingOptions options)
    {
        return ValidatePolicy(options.AuthToken)
            && ValidatePolicy(options.Write)
            && ValidatePolicy(options.Read);
    }

    private static bool ValidatePolicy(ApiRateLimitPolicyOptions policy)
    {
        return policy.PermitLimit > 0 && policy.WindowSeconds > 0 && policy.QueueLimit >= 0;
    }

    private static string ResolveConfiguredPath(string path)
    {
        if (Path.IsPathRooted(path))
        {
            return path;
        }

        return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "..", path));
    }
}

