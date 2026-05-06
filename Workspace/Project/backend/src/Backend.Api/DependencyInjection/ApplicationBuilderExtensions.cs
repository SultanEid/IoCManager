using Backend.Api.Middlewares;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Serilog;
using System.Text.Json;

namespace Backend.Api.DependencyInjection;

public static class ApplicationBuilderExtensions
{
    public static WebApplication UseApiPipeline(this WebApplication app)
    {
        app.UseSerilogRequestLogging();
        app.UseExceptionHandler();

        if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        if (!app.Environment.IsDevelopment())
        {
            app.UseHttpsRedirection();
        }

        app.UseRouting();
        app.UseAuthentication();
        app.UseMiddleware<ApiRequestThrottlingMiddleware>();
        app.UseMiddleware<CookieAntiforgeryMiddleware>();
        app.UseAuthorization();

        app.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = _ => false,
        });

        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = _ => true,
            ResultStatusCodes =
            {
                [HealthStatus.Healthy] = StatusCodes.Status200OK,
                [HealthStatus.Degraded] = StatusCodes.Status200OK,
                [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable,
            },
            ResponseWriter = async (context, report) =>
            {
                var components = report.Entries
                    .Select(entry =>
                    {
                        var name = entry.Key;
                        var required = entry.Value.Tags.Any(tag =>
                            string.Equals(tag, "required", StringComparison.OrdinalIgnoreCase));
                        var status = entry.Value.Status.ToString().ToLowerInvariant();
                        var message = BuildComponentMessage(name, entry.Value.Status, required);

                        return new
                        {
                            name,
                            status,
                            required,
                            message,
                        };
                    })
                    .OrderBy(component => component.name, StringComparer.Ordinal)
                    .ToArray();

                var requiredHealthy = report.Entries
                    .Where(entry => entry.Value.Tags.Any(tag =>
                        string.Equals(tag, "required", StringComparison.OrdinalIgnoreCase)))
                    .All(entry => entry.Value.Status == HealthStatus.Healthy);

                var payload = new
                {
                    status = requiredHealthy ? "ready" : "not_ready",
                    components,
                };

                context.Response.ContentType = "application/json; charset=utf-8";
                await JsonSerializer.SerializeAsync(context.Response.Body, payload, cancellationToken: context.RequestAborted);
            },
        });

        app.MapControllers();

        return app;
    }

    private static string BuildComponentMessage(string name, HealthStatus status, bool required)
    {
        if (status == HealthStatus.Healthy)
        {
            return name switch
            {
                "database" => "Database reachable.",
                "ai_sidecar" => "AI sidecar reachable.",
                _ => "Healthy.",
            };
        }

        if (name == "ai_sidecar")
        {
            return "AI sidecar temporarily unavailable.";
        }

        return required
            ? "Required component unavailable."
            : "Optional component unavailable.";
    }
}
