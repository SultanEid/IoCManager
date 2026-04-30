namespace Backend.Contracts.V2;

public sealed record SmtpNotificationStatusResponse(
    bool Enabled,
    bool Configured,
    bool WillSendEmail,
    string Host,
    int Port,
    bool UseSsl,
    bool UserNameConfigured,
    string FromEmail,
    string FromDisplayName,
    IReadOnlyList<string> MissingRequirements);
