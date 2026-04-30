using Backend.Api.DependencyInjection;
using Backend.Api.Infrastructure;
using Backend.Infrastructure.Configuration;
using Backend.Infrastructure.DependencyInjection;
using Serilog;

DotEnvLoader.LoadFromCurrentDirectory();

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console();
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "https://localhost:3000",
                "https://127.0.0.1:3000",
                "http://localhost:7244",
                "https://localhost:7244")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddApiServices(builder.Configuration, builder.Environment);

var app = builder.Build();

app.UseCors("FrontendDev");
var skipInfrastructureInit = app.Configuration.GetValue<bool>("AppStartup:SkipInfrastructureInit");
var skipSchemaInitialization = app.Configuration.GetValue<bool>("AppStartup:SkipSchemaInitialization");

if (!app.Environment.IsDevelopment() && (skipInfrastructureInit || skipSchemaInitialization))
{
    throw new InvalidOperationException("AppStartup skip flags are only allowed in Development.");
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseApiPipeline();

if (!skipInfrastructureInit)
{
    await app.Services.InitializeInfrastructureAsync();
}

if (!skipSchemaInitialization)
{
    using var scope = app.Services.CreateScope();
    var alertSchemaInitializer = scope.ServiceProvider.GetRequiredService<IAlertRegistrySchemaInitializer>();
    await alertSchemaInitializer.EnsureSchemaAsync(CancellationToken.None);

    var operationalSchemaInitializer = scope.ServiceProvider.GetRequiredService<IOperationalStoreSchemaInitializer>();
    await operationalSchemaInitializer.EnsureSchemaAsync(CancellationToken.None);

    var schemaInitializer = scope.ServiceProvider.GetRequiredService<ILegacyScanPipelineSchemaInitializer>();
    await schemaInitializer.EnsureSchemaAsync(CancellationToken.None);
}
await app.RunAsync();

public partial class Program;
