namespace IoCManager.Mvc.Contracts.Auth;

public sealed class AuthUserResponse
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public sealed class AuthEnvelopeResponse
{
    public bool Authenticated { get; set; }
    public bool RequiresTwoFactor { get; set; }
    public string[] AvailableFactors { get; set; } = [];
    public AuthUserResponse? User { get; set; }
}
