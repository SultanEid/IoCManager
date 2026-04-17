using System.Globalization;
using System.Net;

namespace IoCManager.Mvc.Services;

public sealed class ObservableCanonicalizer
{
    private readonly IdnMapping _idnMapping = new();

    public string Canonicalize(string type, string value)
    {
        var normalizedType = (type ?? string.Empty).Trim().ToLowerInvariant();
        var raw = (value ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return string.Empty;
        }

        return normalizedType switch
        {
            "domain" or "host" => CanonicalizeDomain(raw),
            "url" => CanonicalizeUrl(raw),
            "ip" => CanonicalizeIp(raw),
            "hash" => CanonicalizeHash(raw),
            _ => raw.ToLowerInvariant()
        };
    }

    private string CanonicalizeDomain(string raw)
    {
        var lowered = raw.ToLowerInvariant().Trim().TrimEnd('.');
        try
        {
            return _idnMapping.GetAscii(lowered);
        }
        catch
        {
            return lowered;
        }
    }

    private string CanonicalizeUrl(string raw)
    {
        if (!Uri.TryCreate(raw, UriKind.Absolute, out var uri))
        {
            return raw.ToLowerInvariant();
        }

        var host = CanonicalizeDomain(uri.Host);
        var builder = new UriBuilder(uri)
        {
            Scheme = uri.Scheme.ToLowerInvariant(),
            Host = host
        };

        return builder.Uri.AbsoluteUri.TrimEnd('/');
    }

    private static string CanonicalizeIp(string raw)
    {
        if (IPAddress.TryParse(raw, out var ip))
        {
            return ip.ToString();
        }

        return raw.ToLowerInvariant();
    }

    private static string CanonicalizeHash(string raw)
    {
        return raw.Replace(" ", string.Empty, StringComparison.Ordinal).ToLowerInvariant();
    }
}
