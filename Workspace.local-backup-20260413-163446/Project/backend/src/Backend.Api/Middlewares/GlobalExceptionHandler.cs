using Backend.Application.Common;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Middlewares;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IProblemDetailsService _problemDetailsService;

    public GlobalExceptionHandler(
        ILogger<GlobalExceptionHandler> logger,
        IProblemDetailsService problemDetailsService)
    {
        _logger = logger;
        _problemDetailsService = problemDetailsService;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, title) = MapException(exception);
        if (exception is OptionalDependencyUnavailableException)
        {
            _logger.LogWarning(exception, "Optional dependency unavailable. TraceId={TraceId}", httpContext.TraceIdentifier);
        }
        else
        {
            _logger.LogError(exception, "Unhandled exception. TraceId={TraceId}", httpContext.TraceIdentifier);
        }

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = exception.Message,
            Instance = httpContext.Request.Path,
        };

        problemDetails.Extensions["traceId"] = httpContext.TraceIdentifier;
        AddDependencyExtensions(problemDetails, exception);
        AddValidationExtensions(problemDetails, exception);

        httpContext.Response.StatusCode = statusCode;
        var handled = await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problemDetails,
            Exception = exception,
        });

        if (!handled)
        {
            await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        }

        return true;
    }

    private static (int StatusCode, string Title) MapException(Exception exception)
    {
        return exception switch
        {
            OptionalDependencyUnavailableException => (StatusCodes.Status503ServiceUnavailable, "Dependency Temporarily Unavailable"),
            NotFoundException => (StatusCodes.Status404NotFound, "Resource Not Found"),
            ValidationException => (StatusCodes.Status400BadRequest, "Validation Error"),
            ArgumentException => (StatusCodes.Status400BadRequest, "Invalid Request"),
            DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "Concurrency Conflict"),
            InvalidOperationException => (StatusCodes.Status409Conflict, "Invalid State Transition"),
            _ => (StatusCodes.Status500InternalServerError, "Unhandled Server Error"),
        };
    }

    private static void AddDependencyExtensions(ProblemDetails problemDetails, Exception exception)
    {
        if (exception is not OptionalDependencyUnavailableException optionalDependencyException)
        {
            return;
        }

        problemDetails.Extensions["dependency"] = optionalDependencyException.DependencyName;
        problemDetails.Extensions["condition"] = optionalDependencyException.Condition;
        problemDetails.Extensions["dependencyType"] = "optional";
        problemDetails.Extensions["retryable"] = true;
    }

    private static void AddValidationExtensions(ProblemDetails problemDetails, Exception exception)
    {
        if (exception is not ValidationException validationException)
        {
            return;
        }

        var grouped = validationException.Errors
            .GroupBy(x => string.IsNullOrWhiteSpace(x.PropertyName) ? "$" : x.PropertyName)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => x.ErrorMessage).Distinct(StringComparer.Ordinal).ToArray(),
                StringComparer.OrdinalIgnoreCase);

        problemDetails.Extensions["errors"] = grouped;
    }
}
