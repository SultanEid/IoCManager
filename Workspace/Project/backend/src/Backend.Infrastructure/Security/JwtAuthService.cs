using Backend.Application.Abstractions.Security;
using Backend.Contracts.Auth;
using Backend.Infrastructure.Configuration;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Infrastructure.Security;

public sealed class JwtAuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtOptions _jwtOptions;
    private readonly IConfiguration _configuration;

    public JwtAuthService(
        UserManager<ApplicationUser> userManager,
        IOptions<JwtOptions> jwtOptions,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _jwtOptions = jwtOptions.Value;
        _configuration = configuration;
    }

    public async Task<TokenResponse?> CreateAccessTokenAsync(TokenRequest request, CancellationToken cancellationToken)
    {
        ApplicationUser? user;
        try
        {
            user = await _userManager.FindByNameAsync(request.UserName);
            if (user is null && request.UserName.Contains('@'))
            {
                user = await _userManager.FindByEmailAsync(request.UserName);
            }
        }
        catch (SqlException exception) when (ShouldUseLocalFallback(exception, request))
        {
            return CreateLocalFallbackToken(request.UserName);
        }

        if (user is null)
        {
            if (ShouldUseLocalFallback(request))
            {
                return CreateLocalFallbackToken(request.UserName);
            }

            return null;
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            return null;
        }

        if (!await _userManager.CheckPasswordAsync(user, request.Password))
        {
            await _userManager.AccessFailedAsync(user);
            return null;
        }

        await _userManager.ResetAccessFailedCountAsync(user);

        var nowUtc = DateTimeOffset.UtcNow;
        var expiresAtUtc = nowUtc.AddMinutes(Math.Clamp(_jwtOptions.AccessTokenLifetimeMinutes, 5, 240));
        var roles = await _userManager.GetRolesAsync(user);
        var claims = BuildClaims(user.Id.ToString(), user.UserName ?? string.Empty, roles);
        return CreateTokenResponse(claims, nowUtc, expiresAtUtc);
    }

    private SymmetricSecurityKey ResolveSigningKey()
    {
        var key = _jwtOptions.SigningKey;
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
        {
            throw new InvalidOperationException("Auth:Jwt:SigningKey must be provided and at least 32 characters.");
        }

        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
    }

    private bool ShouldUseLocalFallback(TokenRequest request)
    {
        if (!_configuration.GetValue<bool>("Auth:LocalFallback:Enabled"))
        {
            return false;
        }

        var configuredUserName = _configuration["Auth:LocalFallback:UserName"];
        var configuredPassword = _configuration["Auth:LocalFallback:Password"];
        if (string.IsNullOrWhiteSpace(configuredUserName) || string.IsNullOrWhiteSpace(configuredPassword))
        {
            return false;
        }

        return string.Equals(request.UserName, configuredUserName, StringComparison.OrdinalIgnoreCase)
            && string.Equals(request.Password, configuredPassword, StringComparison.Ordinal);
    }

    private bool ShouldUseLocalFallback(SqlException exception, TokenRequest request)
    {
        return exception.Number == 208 && ShouldUseLocalFallback(request);
    }

    private TokenResponse CreateLocalFallbackToken(string userName)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var expiresAtUtc = nowUtc.AddMinutes(Math.Clamp(_jwtOptions.AccessTokenLifetimeMinutes, 5, 240));
        var configuredRoles = _configuration["Auth:LocalFallback:Roles"];
        var roles = string.IsNullOrWhiteSpace(configuredRoles)
            ? new[] { "IT", "Analyst", "Lead", "Admin", "DEV" }
            : configuredRoles.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var claims = BuildClaims("local-dev-user", userName, roles);

        return CreateTokenResponse(claims, nowUtc, expiresAtUtc);
    }

    private static IReadOnlyList<Claim> BuildClaims(string subjectId, string userName, IEnumerable<string> roles)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, subjectId),
            new(JwtRegisteredClaimNames.UniqueName, userName),
            new(ClaimTypes.NameIdentifier, subjectId),
            new(ClaimTypes.Name, userName),
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        return claims;
    }

    private TokenResponse CreateTokenResponse(IReadOnlyList<Claim> claims, DateTimeOffset nowUtc, DateTimeOffset expiresAtUtc)
    {
        var signingKey = ResolveSigningKey();
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: nowUtc.UtcDateTime,
            expires: expiresAtUtc.UtcDateTime,
            signingCredentials: credentials);

        var serialized = new JwtSecurityTokenHandler().WriteToken(token);
        return new TokenResponse(serialized, expiresAtUtc, "Bearer");
    }
}
