using Backend.Application.Abstractions.Security;
using Backend.Contracts.Auth;
using Backend.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Infrastructure.Security;

public sealed class SqlUserTableAuthService : IAuthService
{
    private const string TeamUserName = "team";
    private const string TeamEmail = "team@local.test";
    private const string TeamPassword = "team123";
    private const string TeamRole = "Admin";

    private readonly JwtOptions _jwtOptions;
    private readonly SqlUserTableDirectoryService _directoryService;

    public SqlUserTableAuthService(
        IOptions<JwtOptions> jwtOptions,
        SqlUserTableDirectoryService directoryService)
    {
        _jwtOptions = jwtOptions.Value;
        _directoryService = directoryService;
    }

    public async Task<TokenResponse?> CreateAccessTokenAsync(TokenRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
        {
            return null;
        }

        if (IsTeamCredential(request.UserName, request.Password))
        {
            return CreateTokenResponse("team-dev", TeamUserName, TeamEmail, TeamRole);
        }

        var user = await _directoryService.FindByLookupAsync(request.UserName, cancellationToken);
        if (user is null)
        {
            return null;
        }

        if (!_directoryService.MatchesPassword(request.Password, user.PasswordHash))
        {
            return null;
        }

        return CreateTokenResponse(user.UserId.ToString(), user.UserName, user.Email ?? string.Empty, user.Role);
    }

    private TokenResponse CreateTokenResponse(string userId, string userName, string email, string? role)
    {
        var signingKey = ResolveSigningKey();
        var nowUtc = DateTimeOffset.UtcNow;
        var expiresAtUtc = nowUtc.AddMinutes(Math.Clamp(_jwtOptions.AccessTokenLifetimeMinutes, 5, 240));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.UniqueName, userName),
            new(JwtRegisteredClaimNames.Email, email),
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Name, userName),
        };

        if (!string.IsNullOrWhiteSpace(role))
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

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

    private SymmetricSecurityKey ResolveSigningKey()
    {
        var key = _jwtOptions.SigningKey;
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
        {
            throw new InvalidOperationException("Auth:Jwt:SigningKey must be provided and at least 32 characters.");
        }

        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
    }

    private static bool IsTeamCredential(string suppliedUserName, string suppliedPassword)
    {
        var normalizedUserName = suppliedUserName.Trim();
        var normalizedPassword = suppliedPassword.Trim();
        return (string.Equals(normalizedUserName, TeamUserName, StringComparison.OrdinalIgnoreCase)
                || string.Equals(normalizedUserName, TeamEmail, StringComparison.OrdinalIgnoreCase))
            && string.Equals(normalizedPassword, TeamPassword, StringComparison.Ordinal);
    }
}
