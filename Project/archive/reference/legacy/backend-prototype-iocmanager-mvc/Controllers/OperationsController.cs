using IoCManager.Mvc.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IoCManager.Mvc.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public sealed class OperationsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public OperationsController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("activity/items")]
    public async Task<IActionResult> GetActivityItems()
    {
        var iocs = await _dbContext.Observables.AsNoTracking()
            .OrderByDescending(x => x.Confidence)
            .ThenByDescending(x => x.LastSeenUtc)
            .Take(150)
            .Select(x => new
            {
                id = x.Id,
                type = x.Type.ToUpperInvariant(),
                value = x.ValueRaw,
                risk = x.Confidence >= 85 ? "Critical" : x.Confidence >= 70 ? "High" : x.Confidence >= 55 ? "Medium" : "Low",
                confidence = x.Confidence,
                status = x.Status,
                tags = new[] { x.Type, x.Status },
                occurrences = x.SourceCount + x.SightingBonus
            })
            .ToListAsync();

        if (iocs.Count > 0)
        {
            return Ok(new { items = iocs });
        }

        return Ok(new
        {
            items = new[]
            {
                new { id = 1, type = "IP", value = "45.79.12.201", risk = "Critical", confidence = 96, status = "Active", tags = new[] { "botnet", "c2" }, occurrences = 41 },
                new { id = 2, type = "Hash", value = "3f79bb7b435b05321651daefd374cd21b4", risk = "High", confidence = 88, status = "Blocked", tags = new[] { "malware" }, occurrences = 13 },
                new { id = 3, type = "Domain", value = "cdn-auth-security-check[.]com", risk = "Medium", confidence = 78, status = "Monitoring", tags = new[] { "phishing" }, occurrences = 7 },
                new { id = 4, type = "URL", value = "hxxps://safe-updates-check[.]net/update", risk = "High", confidence = 83, status = "Active", tags = new[] { "dropper" }, occurrences = 9 }
            }
        });
    }

    [HttpGet("snort/rules")]
    public IActionResult GetSnortRules()
    {
        return Ok(new
        {
            rows = new[]
            {
                new { sid = 1000001, message = "Possible C2 beacon", protocol = "tcp", source = "any", destination = "$HOME_NET", port = "443", status = "Enabled" },
                new { sid = 1000002, message = "Malicious PowerShell pattern", protocol = "tcp", source = "any", destination = "$HOME_NET", port = "80", status = "Enabled" },
                new { sid = 1000003, message = "Suspicious DNS tunneling", protocol = "udp", source = "any", destination = "$HOME_NET", port = "53", status = "Testing" }
            }
        });
    }

    [HttpGet("sigma/rules")]
    public IActionResult GetSigmaRules()
    {
        return Ok(new
        {
            rows = new[]
            {
                new { id = "win_susp_encoded_ps", title = "Encoded PowerShell command", author = "Detective Team", tags = new[] { "attack.t1059.001" }, level = "high", status = "Enabled" },
                new { id = "win_lsass_dump", title = "LSASS memory dump behavior", author = "Detective Team", tags = new[] { "attack.t1003.001" }, level = "critical", status = "Enabled" },
                new { id = "linux_reverse_shell", title = "Reverse shell execution", author = "Detective Team", tags = new[] { "attack.t1059.004" }, level = "high", status = "Review" }
            }
        });
    }

    [HttpGet("yara/rules")]
    public IActionResult GetYaraRules()
    {
        return Ok(new
        {
            rows = new[]
            {
                new { name = "Detective_Ransom_Alpha", description = "Ransomware family alpha markers", tags = new[] { "ransomware", "windows" }, matches = 23, status = "Enabled" },
                new { name = "Detective_CredStealer", description = "Credential stealer byte patterns", tags = new[] { "stealer", "windows" }, matches = 11, status = "Enabled" },
                new { name = "Detective_Loader_Beta", description = "Loader beta unpacking sequence", tags = new[] { "loader", "trojan" }, matches = 7, status = "Testing" }
            }
        });
    }

    [HttpGet("feeds/items")]
    public IActionResult GetFeeds()
    {
        return Ok(new
        {
            rows = new[]
            {
                new { name = "AbuseIPDB", sourceUrl = "https://api.abuseipdb.com", iocsReceived = 928, lastSync = "2026-03-09 11:10 UTC", status = "Active" },
                new { name = "AlienVault OTX", sourceUrl = "https://otx.alienvault.com", iocsReceived = 1340, lastSync = "2026-03-09 11:04 UTC", status = "Active" },
                new { name = "MISP Community", sourceUrl = "https://misp.local/community", iocsReceived = 417, lastSync = "2026-03-09 10:55 UTC", status = "Paused" }
            }
        });
    }

    [HttpGet("servers/items")]
    public IActionResult GetServers()
    {
        return Ok(new
        {
            rows = new[]
            {
                new { hostName = "srv-edge-01", ip = "10.20.4.11", os = "Ubuntu 24.04", services = new[] { "Suricata", "Sysmon" }, lastSeen = "2026-03-09 11:10 UTC", status = "Online" },
                new { hostName = "srv-web-02", ip = "10.20.4.15", os = "Windows Server 2022", services = new[] { "Wazuh", "Defender" }, lastSeen = "2026-03-09 11:08 UTC", status = "Online" },
                new { hostName = "srv-db-01", ip = "10.20.5.20", os = "RHEL 9", services = new[] { "Auditd", "Falco" }, lastSeen = "2026-03-09 10:59 UTC", status = "Degraded" }
            }
        });
    }

    [HttpGet("distribution/items")]
    public IActionResult GetDistribution()
    {
        return Ok(new
        {
            rows = new[]
            {
                new { ruleType = "Sigma", targetServer = "srv-edge-01", count = 120, status = "Success", time = "2026-03-09 10:57 UTC" },
                new { ruleType = "Snort", targetServer = "srv-web-02", count = 88, status = "Success", time = "2026-03-09 10:58 UTC" },
                new { ruleType = "YARA", targetServer = "srv-db-01", count = 42, status = "Partial", time = "2026-03-09 10:59 UTC" }
            }
        });
    }

    [HttpGet("reports/items")]
    public IActionResult GetReports()
    {
        return Ok(new
        {
            rows = new[]
            {
                new { name = "Executive_Threat_Summary_2026-03-08.pdf", type = "Executive Summary", generatedAt = "2026-03-08 22:10 UTC", size = "1.8 MB" },
                new { name = "IOC_Detailed_2026-03-08.csv", type = "IOC Detailed", generatedAt = "2026-03-08 20:22 UTC", size = "940 KB" },
                new { name = "Compliance_Weekly_2026-W10.pdf", type = "Compliance", generatedAt = "2026-03-07 18:10 UTC", size = "2.2 MB" }
            }
        });
    }

    [HttpGet("analytics/trends")]
    public IActionResult GetAnalyticsTrends()
    {
        return Ok(new
        {
            labels = new[] { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" },
            series = new[]
            {
                new { name = "IP", data = new[] { 12, 18, 15, 22, 28, 17, 14 } },
                new { name = "Domain", data = new[] { 7, 9, 11, 10, 16, 12, 8 } },
                new { name = "Hash", data = new[] { 4, 6, 5, 8, 11, 9, 6 } },
                new { name = "URL", data = new[] { 5, 7, 9, 12, 13, 10, 7 } }
            }
        });
    }

    [HttpGet("analytics/stats")]
    public IActionResult GetAnalyticsStats()
    {
        return Ok(new
        {
            categories = new[]
            {
                new { name = "Malware", value = 42 },
                new { name = "Phishing", value = 26 },
                new { name = "C2", value = 19 },
                new { name = "Credential Theft", value = 13 }
            }
        });
    }

    [HttpGet("audit/logs")]
    public async Task<IActionResult> GetAuditLogs()
    {
        var logs = await _dbContext.AuditEvents.AsNoTracking()
            .OrderByDescending(x => x.OccurredUtc)
            .Take(200)
            .Select(x => new
            {
                id = x.Id,
                when = x.OccurredUtc.ToString("yyyy-MM-dd HH:mm 'UTC'"),
                actor = x.ActorUserId,
                action = x.Action,
                entity = x.EntityType,
                details = x.Details
            })
            .ToListAsync();

        if (logs.Count > 0)
        {
            return Ok(new { rows = logs });
        }

        return Ok(new
        {
            rows = new[]
            {
                new { id = 1, when = "2026-03-09 11:08 UTC", actor = "admin", action = "UPDATE", entity = "Settings", details = "Theme preset changed to neutral." },
                new { id = 2, when = "2026-03-09 10:58 UTC", actor = "admin", action = "ENABLE", entity = "2FA", details = "Authenticator enabled and recovery codes regenerated." },
                new { id = 3, when = "2026-03-09 10:40 UTC", actor = "admin", action = "IMPORT", entity = "IOC", details = "Imported 64 indicators from threat feed batch." }
            }
        });
    }
}
