using Backend.Contracts.Auth;

namespace Backend.Application.Abstractions.Security;

public interface IAuthService
{
    Task<TokenResponse?> CreateAccessTokenAsync(TokenRequest request, CancellationToken cancellationToken);
}
