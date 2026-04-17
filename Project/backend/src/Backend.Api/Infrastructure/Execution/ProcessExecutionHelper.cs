using System.Diagnostics;

namespace Backend.Api.Infrastructure.Execution;

public sealed record LegacyProcessExecutionResult(
    string CommandLine,
    string StandardOutput,
    string StandardError,
    int ExitCode,
    DateTime StartedUtc,
    DateTime CompletedUtc,
    string? LocalResultFilePath = null);

internal static class ProcessExecutionHelper
{
    public static async Task<LegacyProcessExecutionResult> RunAsync(ProcessStartInfo startInfo, CancellationToken cancellationToken)
    {
        var startedUtc = DateTime.UtcNow;

        using var process = new Process { StartInfo = startInfo };
        process.Start();

        var standardOutputTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var standardErrorTask = process.StandardError.ReadToEndAsync(cancellationToken);

        await process.WaitForExitAsync(cancellationToken);

        var standardOutput = await standardOutputTask;
        var standardError = await standardErrorTask;

        return new LegacyProcessExecutionResult(
            BuildCommandLine(startInfo),
            standardOutput.Trim(),
            standardError.Trim(),
            process.ExitCode,
            startedUtc,
            DateTime.UtcNow);
    }

    private static string BuildCommandLine(ProcessStartInfo startInfo)
    {
        var parts = new List<string> { startInfo.FileName };
        parts.AddRange(startInfo.ArgumentList.Select(QuoteIfNeeded));
        return string.Join(" ", parts);
    }

    private static string QuoteIfNeeded(string value)
    {
        return value.Contains(' ', StringComparison.Ordinal) ? $"\"{value}\"" : value;
    }
}
