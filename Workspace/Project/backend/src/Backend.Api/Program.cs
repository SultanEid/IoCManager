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
                "https://localhost:3000",
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

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseApiPipeline();

await app.Services.InitializeInfrastructureAsync();
using (var scope = app.Services.CreateScope())
{
    var schemaInitializer = scope.ServiceProvider.GetRequiredService<ILegacyScanPipelineSchemaInitializer>();
    await schemaInitializer.EnsureSchemaAsync(CancellationToken.None);
}
await app.RunAsync();

public partial class Program;
