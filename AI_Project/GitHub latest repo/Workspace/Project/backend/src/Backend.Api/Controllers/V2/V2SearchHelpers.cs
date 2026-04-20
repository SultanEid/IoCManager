using System.Globalization;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Controllers.V2;

internal static class V2SearchHelpers
{
    public static string? NormalizeNullable(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    public static DateTimeOffset? ParseOptionalUtc(string? rawValue, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return null;
        }

        if (DateTimeOffset.TryParse(
            rawValue,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AllowWhiteSpaces | DateTimeStyles.AssumeUniversal,
            out var parsed))
        {
            return parsed.ToUniversalTime();
        }

        throw new ArgumentException($"Invalid UTC date value for '{fieldName}'.", fieldName);
    }

    public static void ValidateUtcRange(DateTimeOffset? fromUtc, DateTimeOffset? toUtc, string fromFieldName, string toFieldName)
    {
        if (fromUtc.HasValue && toUtc.HasValue && fromUtc.Value > toUtc.Value)
        {
            throw new ArgumentException($"'{fromFieldName}' must be less than or equal to '{toFieldName}'.");
        }
    }

    public static (int Page, int PageSize, int Skip) NormalizePaging(int page, int pageSize, int defaultPageSize = 25, int maxPageSize = 200)
    {
        var normalizedPage = page <= 0 ? 1 : page;
        var normalizedPageSize = pageSize <= 0 ? defaultPageSize : Math.Clamp(pageSize, 1, maxPageSize);
        var skip = (normalizedPage - 1) * normalizedPageSize;
        return (normalizedPage, normalizedPageSize, skip);
    }

    public static string EscapeLikePattern(string value)
    {
        return value
            .Replace("[", "[[]", StringComparison.Ordinal)
            .Replace("%", "[%]", StringComparison.Ordinal)
            .Replace("_", "[_]", StringComparison.Ordinal);
    }

    public static string ToContainsPattern(string value)
    {
        return $"%{EscapeLikePattern(value)}%";
    }

    public static IQueryable<T> ApplyTextFilter<T>(
        IQueryable<T> query,
        string? q,
        params Func<string, IQueryable<T>, IQueryable<T>>[] predicates)
    {
        var normalized = NormalizeNullable(q);
        if (normalized is null || predicates.Length == 0)
        {
            return query;
        }

        return predicates.Aggregate(
            query.Where(_ => false),
            (_, predicate) => predicate(normalized, query));
    }
}
