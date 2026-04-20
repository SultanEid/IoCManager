using System.Threading;

namespace Backend.Infrastructure.Configuration;

public static class DotEnvLoader
{
    private static int _isLoaded;

    public static void LoadFromCurrentDirectory(string fileName = ".env")
    {
        if (Interlocked.Exchange(ref _isLoaded, 1) == 1)
        {
            return;
        }

        var envFilePath = FindInCurrentOrParentDirectories(Directory.GetCurrentDirectory(), fileName);
        if (envFilePath is null)
        {
            return;
        }

        foreach (var rawLine in File.ReadLines(envFilePath))
        {
            if (!TryParseLine(rawLine, out var key, out var value))
            {
                continue;
            }

            if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
            {
                continue;
            }

            Environment.SetEnvironmentVariable(key, value);
        }
    }

    private static string? FindInCurrentOrParentDirectories(string startDirectory, string fileName)
    {
        var current = new DirectoryInfo(startDirectory);
        while (current is not null)
        {
            var candidatePath = Path.Combine(current.FullName, fileName);
            if (File.Exists(candidatePath))
            {
                return candidatePath;
            }

            current = current.Parent;
        }

        return null;
    }

    private static bool TryParseLine(string rawLine, out string key, out string value)
    {
        key = string.Empty;
        value = string.Empty;

        var line = rawLine.Trim();
        if (line.Length == 0 || line.StartsWith('#'))
        {
            return false;
        }

        if (line.StartsWith("export ", StringComparison.OrdinalIgnoreCase))
        {
            line = line["export ".Length..].Trim();
        }

        var separatorIndex = line.IndexOf('=');
        if (separatorIndex <= 0)
        {
            return false;
        }

        key = line[..separatorIndex].Trim();
        if (key.Length == 0)
        {
            return false;
        }

        value = line[(separatorIndex + 1)..].Trim();
        value = UnwrapValue(value);
        return true;
    }

    private static string UnwrapValue(string value)
    {
        if (value.Length >= 2 && value[0] == '"' && value[^1] == '"')
        {
            var inner = value[1..^1];
            return inner
                .Replace("\\n", "\n", StringComparison.Ordinal)
                .Replace("\\r", "\r", StringComparison.Ordinal)
                .Replace("\\t", "\t", StringComparison.Ordinal)
                .Replace("\\\"", "\"", StringComparison.Ordinal)
                .Replace("\\\\", "\\", StringComparison.Ordinal);
        }

        if (value.Length >= 2 && value[0] == '\'' && value[^1] == '\'')
        {
            return value[1..^1];
        }

        var commentIndex = value.IndexOf(" #", StringComparison.Ordinal);
        if (commentIndex >= 0)
        {
            return value[..commentIndex].TrimEnd();
        }

        return value;
    }
}
