using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Middlewares;

public sealed class CookieAntiforgeryMiddleware : IMiddleware
{
    private readonly IAntiforgery _antiforgery;
    private readonly ILogger<CookieAntiforgeryMiddleware> _logger;

    public CookieAntiforgeryMiddleware(
        IAntiforgery antiforgery,
        ILogger<CookieAntiforgeryMiddleware> logger)
    {
        _antiforgery = antiforgery;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        if (!ShouldValidate(context))
        {
            await next(context);
            return;
        }

        try
        {
            await _antiforgery.ValidateRequestAsync(context);
        }
        catch (AntiforgeryValidationException exception)
        {
            _logger.LogWarning(exception, "Antiforgery validation failed. TraceId={TraceId}", context.TraceIdentifier);

            var problemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Invalid Antiforgery Token",
                Detail = "Unsafe cookie-based requests require a valid antiforgery token.",
                Instance = context.Request.Path,
            };
            problemDetails.Extensions["traceId"] = context.TraceIdentifier;

            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(problemDetails);
            return;
        }

        await next(context);
    }

    private static bool ShouldValidate(HttpContext context)
    {
        if (HttpMethods.IsGet(context.Request.Method)
            || HttpMethods.IsHead(context.Request.Method)
            || HttpMethods.IsOptions(context.Request.Method)
            || HttpMethods.IsTrace(context.Request.Method))
        {
            return false;
        }

        if (HasBearerAuthorization(context))
        {
            return false;
        }

        return HasIdentityCookie(context);
    }

    private static bool HasBearerAuthorization(HttpContext context)
    {
        var authorization = context.Request.Headers.Authorization.ToString();
        return authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase);
    }

    private static bool HasIdentityCookie(HttpContext context)
    {
        foreach (var cookieKey in context.Request.Cookies.Keys)
        {
            if (cookieKey.StartsWith(".AspNetCore.", StringComparison.OrdinalIgnoreCase)
                || cookieKey.Contains("Identity", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}
