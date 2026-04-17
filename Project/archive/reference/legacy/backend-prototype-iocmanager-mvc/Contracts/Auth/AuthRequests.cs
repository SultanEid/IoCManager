namespace IoCManager.Mvc.Contracts.Auth;

public sealed class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool RememberMe { get; set; } = true;
}

public sealed class VerifyTwoFactorRequest
{
    public string Code { get; set; } = string.Empty;
    public bool UseRecoveryCode { get; set; }
    public bool RememberDevice { get; set; }
}

public sealed class TwoFactorSetupConfirmRequest
{
    public string Code { get; set; } = string.Empty;
}
