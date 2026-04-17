using IocVmwareIngestion.Api.Data;
using IocVmwareIngestion.Api.Options;
using IocVmwareIngestion.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<AzureSqlSettings>(builder.Configuration.GetSection(AzureSqlSettings.SectionName));
builder.Services.Configure<PowerShellSettings>(builder.Configuration.GetSection(PowerShellSettings.SectionName));
builder.Services.Configure<VmwareTargetSettings>(builder.Configuration.GetSection(VmwareTargetSettings.SectionName));

var azureSqlConnectionString = builder.Configuration.GetSection(AzureSqlSettings.SectionName).GetValue<string>("ConnectionString")
    ?? throw new InvalidOperationException("AzureSql:ConnectionString is missing.");

builder.Services.AddDbContext<IocDbContext>(options => options.UseSqlServer(azureSqlConnectionString));
builder.Services.AddControllersWithViews()
    .AddJsonOptions(options => options.JsonSerializerOptions.PropertyNameCaseInsensitive = true);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddScoped<IocExtractionService>();
builder.Services.AddScoped<IScanOrchestrator, ScanOrchestrator>();
builder.Services.AddScoped<IScanRunRepository, EfScanRunRepository>();
builder.Services.AddScoped<ITargetInventoryRepository, EfTargetInventoryRepository>();
builder.Services.AddScoped<ITargetDiscoveryService, TargetDiscoveryService>();
builder.Services.AddSingleton<IScriptExecutionHost, LocalScriptExecutionHost>();
builder.Services.AddSingleton<IScriptExecutionHost, SshScriptExecutionHost>();
builder.Services.AddSingleton<IPowerShellScriptRunner, PowerShellScriptRunner>();

var app = builder.Build();

await EnsureDatabaseReadyAsync(app);
app.MapControllers();

app.Run();

static async Task EnsureDatabaseReadyAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    var settings = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<AzureSqlSettings>>().Value;

    if (!settings.IsConfigured())
    {
        logger.LogWarning("Azure SQL settings still contain placeholder values. Schema initialization skipped.");
        return;
    }

    try
    {
        var repository = scope.ServiceProvider.GetRequiredService<IScanRunRepository>();
        await repository.EnsureSchemaAsync(CancellationToken.None);
    }
    catch (Exception exception)
    {
        logger.LogWarning(exception, "Azure SQL connectivity check failed. Startup will continue, but persistence operations may fail until the database is reachable.");
    }
}