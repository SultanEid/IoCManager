using Backend.Infrastructure.Persistence;
using Backend.Application.Abstractions.Integrations;
using Backend.Api.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Backend.Tests.Integration;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"backend-tests-{Guid.NewGuid():N}";
    private readonly IReadOnlyDictionary<string, string?> _configurationOverrides;

    public TestWebApplicationFactory()
        : this(new Dictionary<string, string?>
        {
            ["Infrastructure:RuleDistribution:SchedulerIntervalSeconds"] = "1",
            ["Infrastructure:RuleDistribution:EnableJitter"] = "false",
            ["Infrastructure:RuleDistribution:BackoffSeconds:0"] = "1",
            ["Infrastructure:RuleDistribution:BackoffSeconds:1"] = "1",
            ["Infrastructure:RuleDistribution:BackoffSeconds:2"] = "1",
            ["Infrastructure:RuleDistribution:BackoffSeconds:3"] = "1",
            ["Infrastructure:RuleDistribution:BackoffSeconds:4"] = "1",
            ["Infrastructure:RuleDistribution:MaxAttempts"] = "5",
            ["Infrastructure:Scanning:SchedulerIntervalSeconds"] = "1",
            ["RateLimiting:AuthToken:PermitLimit"] = "100000",
            ["RateLimiting:Write:PermitLimit"] = "100000",
            ["RateLimiting:Read:PermitLimit"] = "100000",
        })
    {
    }

    internal TestWebApplicationFactory(IReadOnlyDictionary<string, string?> configurationOverrides)
    {
        _configurationOverrides = configurationOverrides;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, configurationBuilder) =>
        {
            if (_configurationOverrides.Count > 0)
            {
                configurationBuilder.AddInMemoryCollection(_configurationOverrides);
            }
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<CtiDbContext>>();
            services.RemoveAll<CtiDbContext>();

            services.AddDbContext<CtiDbContext>(options => options.UseInMemoryDatabase(_databaseName));

            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                    options.DefaultScheme = TestAuthHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });

            services.RemoveAll<IAiReportExtractionClient>();
            services.AddSingleton<IAiReportExtractionClient, TestAiReportExtractionClient>();
            services.RemoveAll<IIcmpProbe>();
            services.AddSingleton<TestIcmpProbe>();
            services.AddSingleton<IIcmpProbe>(sp => sp.GetRequiredService<TestIcmpProbe>());
            services.RemoveAll<IRuleDistributionTransportDispatcher>();
            services.AddSingleton<TestRuleDistributionTransportDispatcher>();
            services.AddSingleton<IRuleDistributionTransportDispatcher>(sp => sp.GetRequiredService<TestRuleDistributionTransportDispatcher>());
            services.RemoveAll<IScanExecutionDispatcher>();
            services.AddSingleton<TestScanExecutionDispatcher>();
            services.AddSingleton<IScanExecutionDispatcher>(sp => sp.GetRequiredService<TestScanExecutionDispatcher>());

            using var scope = services.BuildServiceProvider().CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
            dbContext.Database.EnsureDeleted();
            dbContext.Database.EnsureCreated();
        });
    }

    public async Task ResetDatabaseAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        await dbContext.Database.EnsureDeletedAsync();
        await dbContext.Database.EnsureCreatedAsync();
        scope.ServiceProvider.GetRequiredService<TestRuleDistributionTransportDispatcher>().Reset();
        scope.ServiceProvider.GetRequiredService<TestScanExecutionDispatcher>().Reset();
    }

    public TestIcmpProbe GetIcmpProbe()
    {
        return Services.GetRequiredService<TestIcmpProbe>();
    }

    public TestRuleDistributionTransportDispatcher GetRuleDistributionTransportDispatcher()
    {
        return Services.GetRequiredService<TestRuleDistributionTransportDispatcher>();
    }

    public TestScanExecutionDispatcher GetScanExecutionDispatcher()
    {
        return Services.GetRequiredService<TestScanExecutionDispatcher>();
    }
}
