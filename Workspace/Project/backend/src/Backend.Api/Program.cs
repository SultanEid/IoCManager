using Backend.Api.DependencyInjection;
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

builder.Services.AddApiServices(builder.Configuration, builder.Environment);

var app = builder.Build();

app.UseApiPipeline();

await app.Services.InitializeInfrastructureAsync();
await app.RunAsync();

public partial class Program;
