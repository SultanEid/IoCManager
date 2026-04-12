using Backend.Application.Abstractions.Security;
using Backend.Contracts.Auth;
using Backend.Infrastructure.Configuration;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Infrastructure.Security;

public sealed class SqlUserTableAuthService : IAuthService
{
    private readonly string _connectionString;
    private readonly JwtOptions _jwtOptions;
    private readonly SqlUserTableAuthOptions _options;

    public SqlUserTableAuthService(
        IConfiguration configuration,
        IOptions<DatabaseOptions> databaseOptions,
        IOptions<JwtOptions> jwtOptions,
        IOptions<SqlUserTableAuthOptions> options)
    {
        _connectionString = DatabaseConnectionStringResolver.Resolve(
            configuration,
            databaseOptions.Value.ConnectionStringName);
        _jwtOptions = jwtOptions.Value;
        _options = options.Value;
    }

    public async Task<TokenResponse?> CreateAccessTokenAsync(TokenRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) || string.IsNullOrWhiteSpace(request.Password))
        {
            return null;
        }

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = $@"
SELECT TOP (1) UserID, UserName, Role, Email, PasswordHash
FROM {_options.TableName}
WHERE UserName = @lookup OR Email = @lookup;";
        command.Parameters.AddWithValue("@lookup", request.UserName.Trim());

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var userId = reader.GetInt32(0);
        var userName = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
        var role = reader.IsDBNull(2) ? string.Empty : reader.GetString(2);
        var storedEmail = reader.IsDBNull(3) ? string.Empty : reader.GetString(3);
        var storedPasswordHash = reader.IsDBNull(4) ? string.Empty : reader.GetString(4);

        if (!MatchesPassword(request.Password, storedPasswordHash))
        {
            return null;
        }

        var signingKey = ResolveSigningKey();
        var nowUtc = DateTimeOffset.UtcNow;
        var expiresAtUtc = nowUtc.AddMinutes(Math.Clamp(_jwtOptions.AccessTokenLifetimeMinutes, 5, 240));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, userName),
            new(JwtRegisteredClaimNames.Email, storedEmail),
            new(ClaimTypes.NameIdentifier, userId.ToString()),
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

    private bool MatchesPassword(string suppliedPassword, string storedPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(storedPasswordHash))
        {
            return false;
        }

        var trimmedInput = suppliedPassword.Trim();
        if (_options.AcceptPreHashedPassword
            && string.Equals(trimmedInput, storedPasswordHash, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var hashedInput = ComputeSha256Hex(trimmedInput);
        return string.Equals(hashedInput, storedPasswordHash, StringComparison.OrdinalIgnoreCase);
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

    private static string ComputeSha256Hex(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
