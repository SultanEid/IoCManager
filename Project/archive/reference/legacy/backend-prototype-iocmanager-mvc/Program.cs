using IoCManager.Mvc.Data;
using IoCManager.Mvc.Entities;
using IoCManager.Mvc.Services;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Data;
using System.Net;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Host=localhost;Port=5432;Database=detective;Username=postgres;Password=postgres";
    var provider = (builder.Configuration["Database:Provider"] ?? "postgres").Trim().ToLowerInvariant();
    if (provider is "sqlite" or "sqlite3")
    {
        options.UseSqlite(connectionString);
    }
    else
    {
        options.UseNpgsql(connectionString);
    }
});

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 8;
        options.User.RequireUniqueEmail = true;
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AnalystAccess", policy => policy.RequireRole("Analyst", "Lead", "Admin"));
    options.AddPolicy("LeadAccess", policy => policy.RequireRole("Lead", "Admin"));
    options.AddPolicy("AdminAccess", policy => policy.RequireRole("Admin"));
});

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "detective.identity";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.Cookie.Path = "/";
    options.Cookie.IsEssential = true;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.SlidingExpiration = true;
    options.LoginPath = "/api/auth/login";
    options.LogoutPath = "/api/auth/logout";
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "detective.csrf";
    options.Cookie.HttpOnly = false;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("auth-login", context =>
    {
        var partitionKey = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 8,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true,
            });
    });

    options.AddPolicy("auth-2fa", context =>
    {
        var partitionKey = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0,
                AutoReplenishment = true,
            });
    });
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase) ||
            IsDevelopmentFrontendOrigin(origin))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddScoped<DataSeeder>();
builder.Services.AddScoped<ObservableCanonicalizer>();
builder.Services.AddScoped<IObservableLifecycleService, ObservableLifecycleService>();
builder.Services.AddScoped<ICorrelationEngine, CorrelationEngine>();
builder.Services.Configure<IocIntelligenceOptions>(builder.Configuration.GetSection("IocIntelligence"));
builder.Services.AddHttpClient<IIocIntelligenceClient, IocIntelligenceClient>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<IOptions<IocIntelligenceOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(Math.Clamp(options.TimeoutSeconds, 2, 60));
});
builder.Services.AddScoped<IIocDecisionTraceService, IocDecisionTraceService>();
builder.Services.AddScoped<IIocIntelligenceOpsStore, IocIntelligenceOpsStore>();
builder.Services.AddHostedService<CorrelationSchedulerService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';";
    await next();
});
app.UseRateLimiter();
app.UseAuthentication();
app.Use(async (context, next) =>
{
    if (HttpMethods.IsPost(context.Request.Method) ||
        HttpMethods.IsPut(context.Request.Method) ||
        HttpMethods.IsPatch(context.Request.Method) ||
        HttpMethods.IsDelete(context.Request.Method))
    {
        if (context.Request.Path.StartsWithSegments("/api") &&
            !context.Request.Path.StartsWithSegments("/api/auth/csrf"))
        {
            var antiforgery = context.RequestServices.GetRequiredService<IAntiforgery>();
            try
            {
                await antiforgery.ValidateRequestAsync(context);
            }
            catch (AntiforgeryValidationException)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new { message = "Invalid CSRF token." });
                return;
            }
        }
    }

    await next();
});
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
    if (dbContext.Database.IsSqlite())
    {
        await EnsureUserPreferencesSchemaAsync(dbContext);
        await EnsureIntelSchemaAsync(dbContext);
    }
    else
    {
        await EnsurePostgresCaseSchemaAsync(dbContext);
    }

    var seeder = scope.ServiceProvider.GetRequiredService<DataSeeder>();
    await seeder.SeedAsync();
}

await app.RunAsync();

static async Task EnsurePostgresCaseSchemaAsync(ApplicationDbContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS "InvestigationCases" (
            "CaseId" text NOT NULL PRIMARY KEY,
            "Title" text NOT NULL,
            "CaseType" text NOT NULL,
            "Priority" text NOT NULL,
            "State" text NOT NULL,
            "OwnerUserId" text NOT NULL,
            "SlaDueAt" timestamp with time zone NULL,
            "RiskBudgetId" text NOT NULL,
            "OpenedAt" timestamp with time zone NOT NULL,
            "UpdatedAt" timestamp with time zone NOT NULL,
            "ParentCaseId" text NULL,
            "MergedIntoCaseId" text NULL,
            "StrategicValueScore" double precision NOT NULL,
            "PrimaryIocType" text NOT NULL,
            "PrimaryIocValue" text NOT NULL
        );
        """);

    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS "CaseEvidenceBundles" (
            "BundleId" text NOT NULL PRIMARY KEY,
            "CaseId" text NOT NULL,
            "AsOfTime" timestamp with time zone NOT NULL,
            "SourceIdsJson" text NOT NULL,
            "DetectionObservationsJson" text NOT NULL,
            "RelatedIocsJson" text NOT NULL,
            "GraphNeighborsJson" text NOT NULL,
            "SimilarCasesJson" text NOT NULL,
            "MissingEvidenceHintsJson" text NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL
        );
        """);

    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS "CaseDecisions" (
            "DecisionId" text NOT NULL PRIMARY KEY,
            "CaseId" text NOT NULL,
            "DecisionState" text NOT NULL,
            "RecommendedAction" text NOT NULL,
            "ApprovalTierRequired" text NOT NULL,
            "RolloutMode" text NOT NULL,
            "ReasonSummary" text NOT NULL,
            "PolicyVersion" text NOT NULL,
            "ModelVersion" text NOT NULL,
            "CreatedBy" text NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL
        );
        """);

    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS "DecisionBundles" (
            "BundleId" text NOT NULL PRIMARY KEY,
            "CaseId" text NOT NULL,
            "ScoreVectorJson" text NOT NULL,
            "PolicyOutcomeJson" text NOT NULL,
            "TopEvidenceJson" text NOT NULL,
            "NeighborContextJson" text NOT NULL,
            "SimilarCaseRefsJson" text NOT NULL,
            "NextBestEvidenceJson" text NOT NULL,
            "RolloutPlanJson" text NOT NULL,
            "RollbackPlanJson" text NOT NULL,
            "SnapshotRefsJson" text NOT NULL,
            "GeneratedExplanation" text NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL
        );
        """);

    await dbContext.Database.ExecuteSqlRawAsync(
        "ALTER TABLE \"ModelDecisionTraces\" ADD COLUMN IF NOT EXISTS \"CaseId\" text NULL;");
    await dbContext.Database.ExecuteSqlRawAsync(
        "ALTER TABLE \"ModelDecisionTraces\" ADD COLUMN IF NOT EXISTS \"AsOfTimeUtc\" text NOT NULL DEFAULT '';");
    await dbContext.Database.ExecuteSqlRawAsync(
        "ALTER TABLE \"ModelDecisionTraces\" ADD COLUMN IF NOT EXISTS \"DatasetVersion\" text NOT NULL DEFAULT 'unknown';");
    await dbContext.Database.ExecuteSqlRawAsync(
        "ALTER TABLE \"ModelDecisionTraces\" ADD COLUMN IF NOT EXISTS \"FeatureSnapshotHash\" text NOT NULL DEFAULT '';");
    await dbContext.Database.ExecuteSqlRawAsync(
        "ALTER TABLE \"ModelDecisionTraces\" ADD COLUMN IF NOT EXISTS \"PolicyVersion\" text NOT NULL DEFAULT 'cti-policy-v1';");
    await dbContext.Database.ExecuteSqlRawAsync(
        "ALTER TABLE \"ModelDecisionTraces\" ADD COLUMN IF NOT EXISTS \"DecisionState\" text NOT NULL DEFAULT 'defer';");
    await dbContext.Database.ExecuteSqlRawAsync(
        "ALTER TABLE \"ModelDecisionTraces\" ADD COLUMN IF NOT EXISTS \"MissingEvidenceHintsJson\" text NOT NULL DEFAULT '[]';");
    await dbContext.Database.ExecuteSqlRawAsync(
        "ALTER TABLE \"ModelDecisionTraces\" ADD COLUMN IF NOT EXISTS \"TopContributingFeaturesJson\" text NOT NULL DEFAULT '[]';");
    await dbContext.Database.ExecuteSqlRawAsync(
        "ALTER TABLE \"ModelDecisionTraces\" ADD COLUMN IF NOT EXISTS \"NeighborContextRefsJson\" text NOT NULL DEFAULT '[]';");
    await dbContext.Database.ExecuteSqlRawAsync(
        "ALTER TABLE \"ModelDecisionTraces\" ADD COLUMN IF NOT EXISTS \"SimilarCaseRefsJson\" text NOT NULL DEFAULT '[]';");
}

static async Task EnsureUserPreferencesSchemaAsync(ApplicationDbContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS UserPreferences (
            Id INTEGER NOT NULL CONSTRAINT PK_UserPreferences PRIMARY KEY AUTOINCREMENT,
            UserId TEXT NOT NULL,
            ThemeMode TEXT NOT NULL,
            ThemeStyle TEXT NOT NULL DEFAULT 'default',
            BaseColor TEXT NOT NULL DEFAULT 'neutral',
            CustomPrimaryColor TEXT NOT NULL DEFAULT '#ff2f6d',
            CustomSecondaryColor TEXT NOT NULL DEFAULT '#3b82f6',
            ThemePreset TEXT NOT NULL,
            ButtonStyle TEXT NOT NULL,
            MotionPreference TEXT NOT NULL,
            LayoutDensity TEXT NOT NULL,
            UpdatedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        "CREATE UNIQUE INDEX IF NOT EXISTS IX_UserPreferences_UserId ON UserPreferences(UserId);");

    await AddColumnIfMissingAsync(dbContext, "UserPreferences", "ThemeStyle", "ALTER TABLE UserPreferences ADD COLUMN ThemeStyle TEXT NOT NULL DEFAULT 'default';");
    await AddColumnIfMissingAsync(dbContext, "UserPreferences", "BaseColor", "ALTER TABLE UserPreferences ADD COLUMN BaseColor TEXT NOT NULL DEFAULT 'neutral';");
    await AddColumnIfMissingAsync(dbContext, "UserPreferences", "CustomPrimaryColor", "ALTER TABLE UserPreferences ADD COLUMN CustomPrimaryColor TEXT NOT NULL DEFAULT '#ff2f6d';");
    await AddColumnIfMissingAsync(dbContext, "UserPreferences", "CustomSecondaryColor", "ALTER TABLE UserPreferences ADD COLUMN CustomSecondaryColor TEXT NOT NULL DEFAULT '#3b82f6';");
}

static async Task EnsureIntelSchemaAsync(ApplicationDbContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS Observables (
            Id INTEGER NOT NULL CONSTRAINT PK_Observables PRIMARY KEY AUTOINCREMENT,
            Type TEXT NOT NULL,
            ValueRaw TEXT NOT NULL,
            ValueCanonical TEXT NOT NULL,
            Status TEXT NOT NULL,
            FirstSeenUtc TEXT NOT NULL,
            LastSeenUtc TEXT NOT NULL,
            ExpiresAtUtc TEXT NULL,
            Confidence INTEGER NOT NULL,
            SourceCount INTEGER NOT NULL,
            BaseConfidence INTEGER NOT NULL,
            SourceBonus INTEGER NOT NULL,
            SightingBonus INTEGER NOT NULL,
            CorrelationBonus INTEGER NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS ThreatEntities (
            Id INTEGER NOT NULL CONSTRAINT PK_ThreatEntities PRIMARY KEY AUTOINCREMENT,
            EntityType TEXT NOT NULL,
            Name TEXT NOT NULL,
            Description TEXT NOT NULL,
            CreatedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS ObservableRelationships (
            Id INTEGER NOT NULL CONSTRAINT PK_ObservableRelationships PRIMARY KEY AUTOINCREMENT,
            FromObservableId INTEGER NOT NULL,
            ToObservableId INTEGER NOT NULL,
            RelationshipType TEXT NOT NULL,
            Confidence INTEGER NOT NULL,
            EvidenceCount INTEGER NOT NULL,
            FirstSeenUtc TEXT NOT NULL,
            LastSeenUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS ObservableEvidences (
            Id INTEGER NOT NULL CONSTRAINT PK_ObservableEvidences PRIMARY KEY AUTOINCREMENT,
            ObservableId INTEGER NOT NULL,
            Source TEXT NOT NULL,
            EvidenceType TEXT NOT NULL,
            EvidenceKey TEXT NOT NULL,
            EvidenceValue TEXT NOT NULL,
            ObservedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS ObservableSightings (
            Id INTEGER NOT NULL CONSTRAINT PK_ObservableSightings PRIMARY KEY AUTOINCREMENT,
            ObservableId INTEGER NOT NULL,
            SensorName TEXT NOT NULL,
            HitCount INTEGER NOT NULL,
            SeenUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS CorrelationClusters (
            Id INTEGER NOT NULL CONSTRAINT PK_CorrelationClusters PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL,
            RiskLevel TEXT NOT NULL,
            AverageConfidence INTEGER NOT NULL,
            ObservableCount INTEGER NOT NULL,
            ComputedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS ClusterMemberships (
            Id INTEGER NOT NULL CONSTRAINT PK_ClusterMemberships PRIMARY KEY AUTOINCREMENT,
            ClusterId INTEGER NOT NULL,
            ObservableId INTEGER NOT NULL,
            Weight INTEGER NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS DetectionCoverages (
            Id INTEGER NOT NULL CONSTRAINT PK_DetectionCoverages PRIMARY KEY AUTOINCREMENT,
            ObservableId INTEGER NOT NULL,
            RuleFamily TEXT NOT NULL,
            CoverageStatus TEXT NOT NULL,
            UpdatedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS AuditEvents (
            Id INTEGER NOT NULL CONSTRAINT PK_AuditEvents PRIMARY KEY AUTOINCREMENT,
            ActorUserId TEXT NOT NULL,
            Action TEXT NOT NULL,
            EntityType TEXT NOT NULL,
            EntityId TEXT NOT NULL,
            Details TEXT NOT NULL,
            OccurredUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS CorrelationStories (
            Id INTEGER NOT NULL CONSTRAINT PK_CorrelationStories PRIMARY KEY AUTOINCREMENT,
            ObservableId INTEGER NOT NULL,
            Summary TEXT NOT NULL,
            EvidenceCount INTEGER NOT NULL,
            RuleHits INTEGER NOT NULL,
            ComputedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS CorrelationRunLogs (
            Id INTEGER NOT NULL CONSTRAINT PK_CorrelationRunLogs PRIMARY KEY AUTOINCREMENT,
            StartedUtc TEXT NOT NULL,
            FinishedUtc TEXT NOT NULL,
            DurationMs INTEGER NOT NULL,
            RulesFiredCount INTEGER NOT NULL,
            ClustersProduced INTEGER NOT NULL,
            TriggerSource TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS CaseShells (
            Id INTEGER NOT NULL CONSTRAINT PK_CaseShells PRIMARY KEY AUTOINCREMENT,
            ClusterId INTEGER NOT NULL,
            Title TEXT NOT NULL,
            Status TEXT NOT NULL,
            CreatedByUserId TEXT NOT NULL,
            CreatedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS ModelDecisionTraces (
            Id INTEGER NOT NULL CONSTRAINT PK_ModelDecisionTraces PRIMARY KEY AUTOINCREMENT,
            ObservableId INTEGER NOT NULL,
            ObservableType TEXT NOT NULL,
            SourceSystem TEXT NOT NULL,
            EventTimeUtc TEXT NOT NULL,
            RiskScore REAL NOT NULL,
            RiskTier TEXT NOT NULL,
            Confidence REAL NOT NULL,
            UncertaintySetJson TEXT NOT NULL,
            TopEvidenceJson TEXT NOT NULL,
            RecommendedAction TEXT NOT NULL,
            TtlHours INTEGER NOT NULL,
            ModelVersion TEXT NOT NULL,
            DecisionTraceHash TEXT NOT NULL,
            CreatedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS AnalystOutcomes (
            Id INTEGER NOT NULL CONSTRAINT PK_AnalystOutcomes PRIMARY KEY AUTOINCREMENT,
            ObservableId INTEGER NULL,
            IocType TEXT NOT NULL,
            IocValue TEXT NOT NULL,
            Verdict TEXT NOT NULL,
            AnalystUserId TEXT NOT NULL,
            CaseId TEXT NOT NULL,
            SourceSystem TEXT NOT NULL,
            MetadataJson TEXT NOT NULL,
            EventTimeUtc TEXT NOT NULL,
            CreatedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS ReportIngestionRecords (
            Id INTEGER NOT NULL CONSTRAINT PK_ReportIngestionRecords PRIMARY KEY AUTOINCREMENT,
            ReportId TEXT NOT NULL,
            SourceName TEXT NOT NULL,
            DocumentId TEXT NOT NULL,
            DocumentUrl TEXT NULL,
            ExtractedIocCount INTEGER NOT NULL,
            HumanReviewRequired INTEGER NOT NULL,
            CampaignHintsJson TEXT NOT NULL,
            MalwareFamilyHintsJson TEXT NOT NULL,
            PayloadJson TEXT NOT NULL,
            IngestionTimeUtc TEXT NOT NULL,
            CreatedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS RuleProposalRecords (
            Id INTEGER NOT NULL CONSTRAINT PK_RuleProposalRecords PRIMARY KEY AUTOINCREMENT,
            ProposalId TEXT NOT NULL,
            ObservableId INTEGER NULL,
            RuleFamily TEXT NOT NULL,
            Title TEXT NOT NULL,
            RuleBody TEXT NOT NULL,
            Severity TEXT NOT NULL,
            Confidence REAL NOT NULL,
            HumanReviewRequired INTEGER NOT NULL,
            Status TEXT NOT NULL,
            AttackTechniquesJson TEXT NOT NULL,
            CitationsJson TEXT NOT NULL,
            CreatedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS DeploymentRecommendationRecords (
            Id INTEGER NOT NULL CONSTRAINT PK_DeploymentRecommendationRecords PRIMARY KEY AUTOINCREMENT,
            RecommendationId TEXT NOT NULL,
            RuleFamily TEXT NOT NULL,
            RuleName TEXT NOT NULL,
            ServerId TEXT NOT NULL,
            Hostname TEXT NOT NULL,
            Deploy INTEGER NOT NULL,
            Score REAL NOT NULL,
            Reason TEXT NOT NULL,
            HumanApprovalRequired INTEGER NOT NULL,
            Status TEXT NOT NULL,
            CreatedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS EvidenceCitationRecords (
            Id INTEGER NOT NULL CONSTRAINT PK_EvidenceCitationRecords PRIMARY KEY AUTOINCREMENT,
            SourceType TEXT NOT NULL,
            SourceId TEXT NOT NULL,
            Snippet TEXT NOT NULL,
            SourceUri TEXT NULL,
            StartOffset INTEGER NULL,
            EndOffset INTEGER NULL,
            Confidence REAL NOT NULL,
            CreatedUtc TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS GraphLinkCandidateRecords (
            Id INTEGER NOT NULL CONSTRAINT PK_GraphLinkCandidateRecords PRIMARY KEY AUTOINCREMENT,
            SeedObservableId INTEGER NOT NULL,
            CandidateObservableId INTEGER NOT NULL,
            Score REAL NOT NULL,
            Reason TEXT NOT NULL,
            CitationsJson TEXT NOT NULL,
            ComputedUtc TEXT NOT NULL
        );
        """);

    await dbContext.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_Observables_Type_ValueCanonical ON Observables(Type, ValueCanonical);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_Observables_ValueCanonical ON Observables(ValueCanonical);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_ObservableRelationships_From_To ON ObservableRelationships(FromObservableId, ToObservableId);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_ObservableRelationships_From ON ObservableRelationships(FromObservableId);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_ObservableRelationships_To ON ObservableRelationships(ToObservableId);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_ObservableEvidences_Type_Value ON ObservableEvidences(EvidenceType, EvidenceValue);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_ObservableSightings_Observable_Seen ON ObservableSightings(ObservableId, SeenUtc);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_ClusterMemberships_Cluster_Observable ON ClusterMemberships(ClusterId, ObservableId);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_ClusterMemberships_ObservableId ON ClusterMemberships(ObservableId);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_DetectionCoverages_Observable_Rule ON DetectionCoverages(ObservableId, RuleFamily);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_ModelDecisionTraces_Observable_Created ON ModelDecisionTraces(ObservableId, CreatedUtc);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_ModelDecisionTraces_TraceHash ON ModelDecisionTraces(DecisionTraceHash);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_AnalystOutcomes_Ioc_EventTime ON AnalystOutcomes(IocType, IocValue, EventTimeUtc);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_AnalystOutcomes_Verdict ON AnalystOutcomes(Verdict);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_ReportIngestionRecords_ReportId ON ReportIngestionRecords(ReportId);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_RuleProposalRecords_ProposalId ON RuleProposalRecords(ProposalId);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_RuleProposalRecords_Observable_Created ON RuleProposalRecords(ObservableId, CreatedUtc);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IF NOT EXISTS IX_DeploymentRecommendationRecords_RecommendationId ON DeploymentRecommendationRecords(RecommendationId);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_DeploymentRecommendationRecords_Rule_Server_Created ON DeploymentRecommendationRecords(RuleFamily, ServerId, CreatedUtc);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_EvidenceCitationRecords_SourceType_SourceId ON EvidenceCitationRecords(SourceType, SourceId);");
    await dbContext.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS IX_GraphLinkCandidateRecords_Seed_Candidate_Created ON GraphLinkCandidateRecords(SeedObservableId, CandidateObservableId, ComputedUtc);");

    await AddColumnIfMissingAsync(dbContext, "Observables", "ModelRiskScore", "ALTER TABLE Observables ADD COLUMN ModelRiskScore REAL NOT NULL DEFAULT 0.0;");
    await AddColumnIfMissingAsync(dbContext, "Observables", "RiskTier", "ALTER TABLE Observables ADD COLUMN RiskTier TEXT NOT NULL DEFAULT 'unknown';");
    await AddColumnIfMissingAsync(dbContext, "Observables", "ModelConfidence", "ALTER TABLE Observables ADD COLUMN ModelConfidence REAL NOT NULL DEFAULT 0.0;");
    await AddColumnIfMissingAsync(dbContext, "Observables", "UncertaintySet", "ALTER TABLE Observables ADD COLUMN UncertaintySet TEXT NOT NULL DEFAULT '[]';");
    await AddColumnIfMissingAsync(dbContext, "Observables", "RecommendedAction", "ALTER TABLE Observables ADD COLUMN RecommendedAction TEXT NOT NULL DEFAULT 'monitor';");
    await AddColumnIfMissingAsync(dbContext, "Observables", "TtlHours", "ALTER TABLE Observables ADD COLUMN TtlHours INTEGER NOT NULL DEFAULT 24;");
    await AddColumnIfMissingAsync(dbContext, "Observables", "ModelVersion", "ALTER TABLE Observables ADD COLUMN ModelVersion TEXT NOT NULL DEFAULT 'unscored';");
    await AddColumnIfMissingAsync(dbContext, "Observables", "LastScoredUtc", "ALTER TABLE Observables ADD COLUMN LastScoredUtc TEXT NULL;");
}

static async Task AddColumnIfMissingAsync(ApplicationDbContext dbContext, string tableName, string columnName, string alterSql)
{
    if (await ColumnExistsAsync(dbContext, tableName, columnName))
    {
        return;
    }

    await dbContext.Database.ExecuteSqlRawAsync(alterSql);
}

static async Task<bool> ColumnExistsAsync(ApplicationDbContext dbContext, string tableName, string columnName)
{
    var connection = dbContext.Database.GetDbConnection();
    var wasClosed = connection.State != ConnectionState.Open;
    if (wasClosed)
    {
        await connection.OpenAsync();
    }

    try
    {
        await using var command = connection.CreateCommand();
        command.CommandText = $"PRAGMA table_info({tableName});";
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var existingName = reader.GetString(1);
            if (existingName.Equals(columnName, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }
    finally
    {
        if (wasClosed)
        {
            await connection.CloseAsync();
        }
    }
}

static bool IsDevelopmentFrontendOrigin(string origin)
{
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
    {
        return false;
    }

    if (uri.Scheme is not ("http" or "https"))
    {
        return false;
    }

    if (uri.Port != 3000)
    {
        return false;
    }

    if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
        uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
    {
        return true;
    }

    if (!IPAddress.TryParse(uri.Host, out var ipAddress))
    {
        return false;
    }

    var bytes = ipAddress.GetAddressBytes();
    if (bytes.Length != 4)
    {
        return false;
    }

    // 10.0.0.0/8
    if (bytes[0] == 10)
    {
        return true;
    }

    // 172.16.0.0/12
    if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
    {
        return true;
    }

    // 192.168.0.0/16
    return bytes[0] == 192 && bytes[1] == 168;
}
