using Backend.Domain.IocManager;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;

namespace Backend.Api.Infrastructure;

public sealed record AlertEmailDeliveryResult(AlertEmailDeliveryStatus Status, string? FailureDetail, DateTimeOffset? SentAtUtc);

public interface IAlertEmailSender
{
    Task<AlertEmailDeliveryResult> SendAsync(
        string toEmail,
        IReadOnlyList<string> ccEmails,
        string subject,
        string body,
        CancellationToken cancellationToken);
}

public sealed class SmtpAlertEmailSender : IAlertEmailSender
{
    private readonly SmtpNotificationOptions _options;
    private readonly ILogger<SmtpAlertEmailSender> _logger;

    public SmtpAlertEmailSender(IOptions<SmtpNotificationOptions> options, ILogger<SmtpAlertEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AlertEmailDeliveryResult> SendAsync(
        string toEmail,
        IReadOnlyList<string> ccEmails,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        if (!_options.IsConfigured())
        {
            return new AlertEmailDeliveryResult(AlertEmailDeliveryStatus.NotConfigured, "SMTP is not configured.", null);
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_options.FromEmail.Trim(), _options.FromDisplayName.Trim()),
            Subject = subject,
            Body = body,
            IsBodyHtml = false,
        };
        message.To.Add(new MailAddress(toEmail));
        foreach (var ccEmail in ccEmails)
        {
            message.CC.Add(new MailAddress(ccEmail));
        }

        using var client = new SmtpClient(_options.Host.Trim(), _options.Port)
        {
            EnableSsl = _options.UseSsl,
        };

        if (!string.IsNullOrWhiteSpace(_options.UserName))
        {
            client.Credentials = new NetworkCredential(_options.UserName, _options.Password);
        }

        try
        {
            using var registration = cancellationToken.Register(client.SendAsyncCancel);
            await client.SendMailAsync(message, cancellationToken);
            return new AlertEmailDeliveryResult(AlertEmailDeliveryStatus.Sent, null, DateTimeOffset.UtcNow);
        }
        catch (Exception ex) when (ex is SmtpException or InvalidOperationException)
        {
            _logger.LogWarning(ex, "Alert email delivery failed for recipient {Recipient}.", toEmail);
            return new AlertEmailDeliveryResult(AlertEmailDeliveryStatus.Failed, ex.Message, null);
        }
    }
}
