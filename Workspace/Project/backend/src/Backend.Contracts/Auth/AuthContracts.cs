namespace Backend.Contracts.Auth;

public sealed record TokenRequest(string UserName, string Password);

public sealed record TokenResponse(string AccessToken, DateTimeOffset ExpiresAtUtc, string TokenType);
