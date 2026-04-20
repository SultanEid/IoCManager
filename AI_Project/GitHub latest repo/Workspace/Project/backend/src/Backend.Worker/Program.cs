using Backend.Application.DependencyInjection;
using Backend.Infrastructure.Configuration;
using Backend.Infrastructure.DependencyInjection;
using Serilog;

DotEnvLoader.LoadFromCurrentDirectory();

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddSerilog((services, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console();
});

var host = builder.Build();
await host.Services.InitializeInfrastructureAsync();
await host.RunAsync();
