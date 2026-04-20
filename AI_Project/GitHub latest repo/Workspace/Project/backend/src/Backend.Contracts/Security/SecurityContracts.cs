namespace Backend.Contracts.Security;

public sealed record AntiforgeryTokenResponse(string HeaderName, string RequestToken);
