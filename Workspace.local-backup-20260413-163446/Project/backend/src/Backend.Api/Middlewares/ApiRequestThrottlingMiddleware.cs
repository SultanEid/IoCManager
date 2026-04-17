using Backend.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;
using System.Globalization;
using System.Security.Claims;

namespace Backend.Api.Middlewares;

public sealed class ApiRequestThrottlingMiddleware : IMiddleware
{
    private readonly IOptionsMonitor<ApiRateLimitingOptions> _optionsMonitor;
    private readonly ConcurrentDictionary<string, CounterState> _counters = new(StringComparer.Ordinal);

    public ApiRequestThrottlingMiddleware(IOptionsMonitor<ApiRateLimitingOptions> optionsMonitor)
    {
        _optionsMonitor = optionsMonitor;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var endpoint = context.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<DisableRateLimitingAttribute>() is not null)
        {
            await next(context);
            return;
        }

        var policyName = endpoint?.Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName
            ?? ResolveFallbackPolicy(context);

        var policy = ResolvePolicyOptions(policyName);
        var clientId = ResolveClientId(context);
        var key = $"{policyName}:{clientId}";
        var now = DateTimeOffset.UtcNow;
        var window = TimeSpan.FromSeconds(policy.WindowSeconds);

        var counterState = _counters.GetOrAdd(key, _ => new CounterState(now));
        var exceededLimit = false;
        TimeSpan retryAfter = TimeSpan.Zero;

        lock (counterState.Sync)
        {
            if (now - counterState.WindowStart >= window)
            {
                counterState.WindowStart = now;
                counterState.Count = 0;
            }

            counterState.Count++;
            if (counterState.Count > policy.PermitLimit)
            {
                exceededLimit = true;
                var elapsed = now - counterState.WindowStart;
                retryAfter = window - elapsed;
                if (retryAfter < TimeSpan.Zero)
                {
                    retryAfter = TimeSpan.Zero;
                }
            }
        }

        if (exceededLimit)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.ContentType = "application/problem+json";
            context.Response.Headers.RetryAfter =
                Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);

            var problem = new ProblemDetails
            {
                Status = StatusCodes.Status429TooManyRequests,
                Title = "Too Many Requests",
                Detail = "The request was throttled by the active rate limit policy.",
                Instance = context.Request.Path,
            };
            problem.Extensions["traceId"] = context.TraceIdentifier;

            await context.Response.WriteAsJsonAsync(problem);
            return;
        }

        await next(context);
    }

    private ApiRateLimitPolicyOptions ResolvePolicyOptions(string policyName)
    {
        var options = _optionsMonitor.CurrentValue;
        return policyName switch
        {
            RateLimitPolicies.AuthToken => options.AuthToken,
            RateLimitPolicies.Write => options.Write,
            _ => options.Read,
        };
    }

    private static string ResolveFallbackPolicy(HttpContext context)
    {
        if (context.Request.Path.Equals("/api/auth/token", StringComparison.OrdinalIgnoreCase))
        {
            return RateLimitPolicies.AuthToken;
        }

        if (HttpMethods.IsGet(context.Request.Method)
            || HttpMethods.IsHead(context.Request.Method)
            || HttpMethods.IsOptions(context.Request.Method)
            || HttpMethods.IsTrace(context.Request.Method))
        {
            return RateLimitPolicies.Read;
        }

        return RateLimitPolicies.Write;
    }

    private static string ResolveClientId(HttpContext context)
    {
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            return $"ip:{forwardedFor.Split(',')[0].Trim()}";
        }

        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrWhiteSpace(userId))
        {
            return $"user:{userId}";
        }

        var remoteIp = context.Connection.RemoteIpAddress?.ToString();
        return string.IsNullOrWhiteSpace(remoteIp) ? "client:unknown" : $"ip:{remoteIp}";
    }

    private sealed class CounterState
    {
        public CounterState(DateTimeOffset windowStart)
        {
            WindowStart = windowStart;
        }

        public object Sync { get; } = new();
        public DateTimeOffset WindowStart { get; set; }
        public int Count { get; set; }
    }
}
