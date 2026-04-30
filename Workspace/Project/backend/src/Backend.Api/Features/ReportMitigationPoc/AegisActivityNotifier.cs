using System.Net.Mail;
using System.Text;
using System.Text.Json;
using Backend.Application.Abstractions.Integrations;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Configuration;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Security;
using Microsoft.Extensions.Options;

namespace Backend.Api.Features.ReportMitigationPoc;

public sealed class AgentNotificationEmailOptions
{
    public const string SectionName = "AgentNotifications:Email";

    public bool Enabled { get; set; }
    public bool NotifyAdmins { get; set; } = true;
    public string FromAddress { get; set; } = string.Empty;
    public string FromDisplayName { get; set; } = "IoC Manager";
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 25;
    public bool UseSsl { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string PickupDirectory { get; set; } = string.Empty;
}

public sealed class AegisActivityNotifier
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly CtiDbContext _dbContext;
    private readonly SqlUserTableDirectoryService _directoryService;
    private readonly AgentNotificationEmailOptions _emailOptions;
    private readonly BootstrapAdminOptions _bootstrapAdminOptions;
    private readonly ILogger<AegisActivityNotifier> _logger;

    public AegisActivityNotifier(
        CtiDbContext dbContext,
        SqlUserTableDirectoryService directoryService,
        IOptions<AgentNotificationEmailOptions> emailOptions,
        IOptions<BootstrapAdminOptions> bootstrapAdminOptions,
        ILogger<AegisActivityNotifier> logger)
    {
        _dbContext = dbContext;
        _directoryService = directoryService;
        _emailOptions = emailOptions.Value;
        _bootstrapAdminOptions = bootstrapAdminOptions.Value;
        _logger = logger;
    }

    internal async Task NotifyAutonomousPlanningStartedAsync(
        AegisResolvedSource source,
        string actorUserId,
        CancellationToken cancellationToken)
    {
        var payload = new
        {
            agent = "Aegis",
            phase = "started",
            source.SourceName,
            source.TriggerKind,
            SourceAlertIds = source.AlertIds,
            SourceScanJobIds = source.ScanJobIds,
            message = "Aegis detected a high-priority case and started generating a mitigation plan.",
        };

        await WriteAuditAsync(
            actorUserId,
            "aegis.mitigation.auto.started",
            "report",
            BuildEntityId(source),
            payload,
            cancellationToken);

        await TrySendEmailAsync(
            actorUserId,
            "Aegis started a mitigation plan",
            BuildStartedEmailBody(source),
            cancellationToken);
    }

    internal async Task NotifyAutonomousPlanCompletedAsync(
        AegisResolvedSource source,
        Report report,
        AiReportMitigationResult result,
        string actorUserId,
        CancellationToken cancellationToken)
    {
        var payload = new
        {
            agent = "Aegis",
            phase = "completed",
            source.SourceName,
            source.TriggerKind,
            ReportId = report.Id,
            ReviewPath = $"/agents/aegis?plan={report.Id:D}",
            result.MitigationPlan.Severity,
            result.MitigationPlan.Confidence,
            PrimaryActions = result.MitigationPlan.PrimaryActions?.Take(3).Select(action => new
            {
                action.Rank,
                action.Title,
                action.TargetHint,
                action.Urgency,
                action.Reasoning,
            }).ToArray() ?? Array.Empty<object>(),
        };

        await WriteAuditAsync(
            actorUserId,
            "aegis.mitigation.auto.completed",
            "report",
            report.Id.ToString("N"),
            payload,
            cancellationToken);

        await TrySendEmailAsync(
            actorUserId,
            $"Aegis mitigation plan ready: {source.SourceName}",
            BuildCompletedEmailBody(report, result),
            cancellationToken);
    }

    private async Task WriteAuditAsync(
        string actorUserId,
        string actionType,
        string entityType,
        string entityId,
        object payload,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = AuditLog.Create(
                string.IsNullOrWhiteSpace(actorUserId) ? "system-aegis" : actorUserId,
                actionType,
                entityType,
                entityId,
                JsonSerializer.Serialize(payload, JsonOptions),
                DateTimeOffset.UtcNow);
            _dbContext.AuditLogsV2.Add(item);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Aegis notification audit write failed for {ActionType}.", actionType);
        }
    }

    private async Task TrySendEmailAsync(
        string actorUserId,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        if (!_emailOptions.Enabled)
        {
            return;
        }

        try
        {
            var recipients = await ResolveRecipientsAsync(actorUserId, cancellationToken);
            if (recipients.Count == 0)
            {
                _logger.LogInformation("Aegis email notification skipped because no recipients were resolved.");
                return;
            }

            if (string.IsNullOrWhiteSpace(_emailOptions.FromAddress))
            {
                _logger.LogInformation("Aegis email notification skipped because AgentNotifications:Email:FromAddress is not configured.");
                return;
            }

            using var message = new MailMessage
            {
                From = new MailAddress(_emailOptions.FromAddress, _emailOptions.FromDisplayName),
                Subject = subject,
                Body = body,
                IsBodyHtml = false,
            };

            foreach (var recipient in recipients)
            {
                message.To.Add(recipient);
            }

            using var client = new SmtpClient();
            if (!string.IsNullOrWhiteSpace(_emailOptions.PickupDirectory))
            {
                Directory.CreateDirectory(_emailOptions.PickupDirectory);
                client.DeliveryMethod = SmtpDeliveryMethod.SpecifiedPickupDirectory;
                client.PickupDirectoryLocation = _emailOptions.PickupDirectory;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(_emailOptions.SmtpHost))
                {
                    _logger.LogInformation("Aegis email notification skipped because no SMTP host or pickup directory is configured.");
                    return;
                }

                client.Host = _emailOptions.SmtpHost;
                client.Port = _emailOptions.SmtpPort <= 0 ? 25 : _emailOptions.SmtpPort;
                client.EnableSsl = _emailOptions.UseSsl;

                if (!string.IsNullOrWhiteSpace(_emailOptions.UserName))
                {
                    client.Credentials = new System.Net.NetworkCredential(_emailOptions.UserName, _emailOptions.Password);
                }
            }

            await client.SendMailAsync(message, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Aegis email notification delivery failed.");
        }
    }

    private async Task<IReadOnlyList<string>> ResolveRecipientsAsync(string actorUserId, CancellationToken cancellationToken)
    {
        var recipients = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        try
        {
            var users = await _directoryService.ListUsersAsync(cancellationToken);
            foreach (var user in users)
            {
                if (string.IsNullOrWhiteSpace(user.Email))
                {
                    continue;
                }

                var matchesActor = string.Equals(user.UserName, actorUserId, StringComparison.OrdinalIgnoreCase)
                    || string.Equals(user.Email, actorUserId, StringComparison.OrdinalIgnoreCase)
                    || string.Equals(user.UserId.ToString(), actorUserId, StringComparison.OrdinalIgnoreCase);

                if (matchesActor || (_emailOptions.NotifyAdmins && IsAdminLikeRole(user.Role)))
                {
                    recipients.Add(user.Email);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Aegis email recipient resolution from SQL user table failed.");
        }

        if (recipients.Count == 0
            && _bootstrapAdminOptions.Enabled
            && !string.IsNullOrWhiteSpace(_bootstrapAdminOptions.Email))
        {
            recipients.Add(_bootstrapAdminOptions.Email.Trim());
        }

        return recipients.ToArray();
    }

    private static bool IsAdminLikeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return false;
        }

        return role.Contains("admin", StringComparison.OrdinalIgnoreCase)
            || role.Contains("dev", StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildEntityId(AegisResolvedSource source)
    {
        if (source.ScanJobIds.Count > 0)
        {
            return source.ScanJobIds[0].ToString("N");
        }

        if (source.AlertIds.Count > 0)
        {
            return source.AlertIds[0].ToString("N");
        }

        return source.DocumentId;
    }

    private static string BuildStartedEmailBody(AegisResolvedSource source)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Aegis detected a high-priority case and has started generating a mitigation plan.");
        builder.AppendLine();
        builder.AppendLine($"Source: {source.SourceName}");
        builder.AppendLine($"Trigger: {source.TriggerKind}");
        if (source.AlertIds.Count > 0)
        {
            builder.AppendLine($"Linked alerts: {string.Join(", ", source.AlertIds.Select(id => id.ToString("D")))}");
        }

        if (source.ScanJobIds.Count > 0)
        {
            builder.AppendLine($"Linked scan jobs: {string.Join(", ", source.ScanJobIds.Select(id => id.ToString("D")))}");
        }

        builder.AppendLine();
        builder.AppendLine("A follow-up notification will be sent when the mitigation plan is ready.");
        return builder.ToString();
    }

    private static string BuildCompletedEmailBody(Report report, AiReportMitigationResult result)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Aegis completed a mitigation plan.");
        builder.AppendLine();
        builder.AppendLine($"Plan: {report.Title}");
        builder.AppendLine($"Severity: {result.MitigationPlan.Severity}");
        builder.AppendLine($"Confidence: {result.MitigationPlan.Confidence}");
        builder.AppendLine($"Open in app: /agents/aegis?plan={report.Id:D}");
        builder.AppendLine();
        builder.AppendLine(result.MitigationPlan.ExecutiveSummary);
        builder.AppendLine();
        builder.AppendLine("Top actions:");

        var actions = result.MitigationPlan.PrimaryActions?.OrderBy(x => x.Rank).Take(3).ToArray()
            ?? Array.Empty<AiReportMitigationPrimaryAction>();
        foreach (var action in actions)
        {
            builder.AppendLine($"{action.Rank}. {action.Title}");
            builder.AppendLine($"   Target: {action.TargetHint}");
            builder.AppendLine($"   Urgency: {action.Urgency}");
            builder.AppendLine($"   Why: {action.Reasoning}");
        }

        return builder.ToString();
    }
}
