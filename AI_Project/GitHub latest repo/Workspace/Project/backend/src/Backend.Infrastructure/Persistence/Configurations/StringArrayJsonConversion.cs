using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Text.Json;

namespace Backend.Infrastructure.Persistence.Configurations;

internal static class StringArrayJsonConversion
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static readonly ValueConverter<string[], string> Converter = new(
        values => JsonSerializer.Serialize(values ?? Array.Empty<string>(), JsonOptions),
        value => Deserialize(value));

    public static readonly ValueComparer<string[]> Comparer = new(
        (left, right) => (left ?? Array.Empty<string>()).SequenceEqual(right ?? Array.Empty<string>()),
        values => ComputeHash(values),
        values => (values ?? Array.Empty<string>()).ToArray());

    private static string[] Deserialize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        return JsonSerializer.Deserialize<string[]>(value, JsonOptions) ?? [];
    }

    private static int ComputeHash(string[]? values)
    {
        var hash = new HashCode();
        foreach (var value in values ?? Array.Empty<string>())
        {
            hash.Add(value, StringComparer.Ordinal);
        }

        return hash.ToHashCode();
    }
}
