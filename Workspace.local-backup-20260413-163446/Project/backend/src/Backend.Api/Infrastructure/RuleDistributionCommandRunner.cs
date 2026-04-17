using System.Diagnostics;
using System.Text;

namespace Backend.Api.Infrastructure;

public sealed record RuleDistributionCommandResult(
    int ExitCode,
    bool TimedOut,
    string StandardOutput,
    string StandardError,
    TimeSpan Duration);

public interface IRuleDistributionCommandRunner
{
    Task<RuleDistributionCommandResult> RunAsync(
        string executable,
        IReadOnlyList<string> arguments,
        TimeSpan timeout,
        CancellationToken cancellationToken);
}

public sealed class RuleDistributionCommandRunner : IRuleDistributionCommandRunner
{
    public async Task<RuleDistributionCommandResult> RunAsync(
        string executable,
        IReadOnlyList<string> arguments,
        TimeSpan timeout,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(executable);

        var startInfo = new ProcessStartInfo
        {
            FileName = executable,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        foreach (var argument in arguments)
        {
            startInfo.ArgumentList.Add(argument);
        }

        using var process = new Process { StartInfo = startInfo, EnableRaisingEvents = true };
        var startedAt = Stopwatch.GetTimestamp();
        if (!process.Start())
        {
            throw new InvalidOperationException($"Failed to start process '{executable}'.");
        }

        Task<string> standardOutputTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        Task<string> standardErrorTask = process.StandardError.ReadToEndAsync(cancellationToken);
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(timeout);

        var timedOut = false;
        try
        {
            await process.WaitForExitAsync(timeoutCts.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            timedOut = true;
            TryTerminateProcess(process);
            await process.WaitForExitAsync(cancellationToken);
        }

        var standardOutput = await standardOutputTask;
        var standardError = await standardErrorTask;
        var duration = Stopwatch.GetElapsedTime(startedAt);

        return new RuleDistributionCommandResult(
            ExitCode: process.ExitCode,
            TimedOut: timedOut,
            StandardOutput: SanitizeOutput(standardOutput),
            StandardError: SanitizeOutput(standardError),
            Duration: duration);
    }

    private static void TryTerminateProcess(Process process)
    {
        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }
        }
        catch
        {
            // Ignore process-kill failures. The caller already treats this path as timed out.
        }
    }

    private static string SanitizeOutput(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return string.Empty;
        }

        var output = raw.Trim();
        if (output.Length <= 4000)
        {
            return output;
        }

        var builder = new StringBuilder(4048);
        builder.Append(output.AsSpan(0, 4000));
        builder.Append("...");
        return builder.ToString();
    }
}
