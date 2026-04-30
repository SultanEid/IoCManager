namespace Backend.Api.Infrastructure;

public sealed class SmtpNotificationOptions
{
    public const string SectionName = "Notifications:Smtp";

    public bool Enabled { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 25;
    public bool UseSsl { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromDisplayName { get; set; } = "IOC Manager";

    public bool IsConfigured()
        => Enabled
            && !string.IsNullOrWhiteSpace(Host)
            && !string.IsNullOrWhiteSpace(FromEmail)
            && Port > 0;
}
