using System.Text.Json;
using IoCManager.Mvc.Entities;
using IoCManager.Mvc.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Data;

public sealed class DataSeeder
{
    private readonly ApplicationDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ICorrelationEngine _correlationEngine;

    public DataSeeder(
        ApplicationDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ICorrelationEngine correlationEngine)
    {
        _dbContext = dbContext;
        _userManager = userManager;
        _roleManager = roleManager;
        _correlationEngine = correlationEngine;
    }

    public async Task SeedAsync()
    {
        await SeedRolesAsync();
        await SeedUsersAsync();
        await SeedDashboardAsync();
        await SeedWorkspaceAsync();
        await SeedCustomizerAsync();
        await SeedIntelligenceAsync();
        await _correlationEngine.RunAsync("seed");
    }

    private async Task SeedRolesAsync()
    {
        foreach (var role in new[] { "Analyst", "Lead", "Admin" })
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                await _roleManager.CreateAsync(new IdentityRole(role));
            }
        }
    }

    private async Task SeedUsersAsync()
    {
        const string seedUserName = "admin";
        const string seedEmail = "admin@detective.local";
        const string seedPassword = "Detective123!";

        var existing = await _userManager.FindByNameAsync(seedUserName);
        if (existing is null)
        {
            existing = await _userManager.FindByEmailAsync(seedEmail);
        }

        if (existing is not null)
        {
            if (!string.Equals(existing.UserName, seedUserName, StringComparison.OrdinalIgnoreCase))
            {
                existing.UserName = seedUserName;
                await _userManager.UpdateAsync(existing);
            }
            await EnsureAdminRolesAsync(existing);
            return;
        }

        var user = new ApplicationUser
        {
            UserName = seedUserName,
            Email = seedEmail,
            DisplayName = "Detective Admin",
            EmailConfirmed = true
        };

        await _userManager.CreateAsync(user, seedPassword);
        await EnsureAdminRolesAsync(user);
    }

    private async Task EnsureAdminRolesAsync(ApplicationUser user)
    {
        foreach (var role in new[] { "Analyst", "Lead", "Admin" })
        {
            if (!await _userManager.IsInRoleAsync(user, role))
            {
                await _userManager.AddToRoleAsync(user, role);
            }
        }
    }

    private async Task SeedDashboardAsync()
    {
        if (!await _dbContext.DashboardMetrics.AnyAsync())
        {
            _dbContext.DashboardMetrics.AddRange(
                new DashboardMetric
                {
                    Title = "Total Revenue",
                    Value = "$1,250.00",
                    Delta = "+12.5%",
                    DeltaDirection = "up",
                    Headline = "Trending up this month",
                    Description = "Visitors for the last 6 months",
                    SortOrder = 1
                },
                new DashboardMetric
                {
                    Title = "New Customers",
                    Value = "1,234",
                    Delta = "-20%",
                    DeltaDirection = "down",
                    Headline = "Down 20% this period",
                    Description = "Acquisition needs attention",
                    SortOrder = 2
                },
                new DashboardMetric
                {
                    Title = "Active Accounts",
                    Value = "45,678",
                    Delta = "+12.5%",
                    DeltaDirection = "up",
                    Headline = "Strong user retention",
                    Description = "Engagement exceed targets",
                    SortOrder = 3
                },
                new DashboardMetric
                {
                    Title = "Growth Rate",
                    Value = "4.5%",
                    Delta = "+4.5%",
                    DeltaDirection = "up",
                    Headline = "Steady performance increase",
                    Description = "Meets growth projections",
                    SortOrder = 4
                }
            );
        }

        if (!await _dbContext.VisitorPoints.AnyAsync())
        {
            var random = new Random(44);
            var start = DateTime.UtcNow.Date.AddDays(-120);
            for (var i = 0; i <= 120; i++)
            {
                var date = start.AddDays(i);
                var desktop = 80 + random.Next(30, 520);
                var mobile = 60 + random.Next(20, 420);

                _dbContext.VisitorPoints.Add(new VisitorPoint
                {
                    DateUtc = date,
                    Desktop = desktop,
                    Mobile = mobile
                });
            }
        }

        if (!await _dbContext.SectionRecords.AnyAsync())
        {
            _dbContext.SectionRecords.AddRange(
                new SectionRecord { Header = "Cover page", Type = "Cover page", Status = "In Process", Target = "18", Limit = "5", Reviewer = "Eddie Lake", SortOrder = 1 },
                new SectionRecord { Header = "Table of contents", Type = "Table of contents", Status = "Done", Target = "29", Limit = "24", Reviewer = "Eddie Lake", SortOrder = 2 },
                new SectionRecord { Header = "Executive summary", Type = "Narrative", Status = "Done", Target = "10", Limit = "13", Reviewer = "Eddie Lake", SortOrder = 3 },
                new SectionRecord { Header = "Technical approach", Type = "Narrative", Status = "Done", Target = "27", Limit = "23", Reviewer = "Jamik Tashpulatov", SortOrder = 4 },
                new SectionRecord { Header = "Design", Type = "Narrative", Status = "In Process", Target = "2", Limit = "16", Reviewer = "Jamik Tashpulatov", SortOrder = 5 },
                new SectionRecord { Header = "Capabilities", Type = "Narrative", Status = "In Process", Target = "20", Limit = "8", Reviewer = "Jamik Tashpulatov", SortOrder = 6 },
                new SectionRecord { Header = "Integration with existing systems", Type = "Narrative", Status = "In Process", Target = "19", Limit = "21", Reviewer = "Jamik Tashpulatov", SortOrder = 7 },
                new SectionRecord { Header = "Innovation and advantages", Type = "Narrative", Status = "Done", Target = "25", Limit = "26", Reviewer = "Assign reviewer", SortOrder = 8 }
            );
        }

        await _dbContext.SaveChangesAsync();
    }

    private async Task SeedWorkspaceAsync()
    {
        if (await _dbContext.WorkspacePanels.AnyAsync())
        {
            return;
        }

        _dbContext.WorkspacePanels.AddRange(
            new WorkspacePanel
            {
                PanelKey = "payment-method",
                Title = "Payment Method",
                SortOrder = 1,
                PayloadJson = JsonSerializer.Serialize(new
                {
                    cardName = "John Doe",
                    cardNumber = "1234 5678 9012 3456",
                    cvv = "123",
                    month = "MM",
                    year = "YYYY",
                    billingAddress = true
                })
            },
            new WorkspacePanel
            {
                PanelKey = "appearance-settings",
                Title = "Appearance Settings",
                SortOrder = 2,
                PayloadJson = JsonSerializer.Serialize(new
                {
                    twoFactorEnabled = false,
                    profileVerified = true,
                    environment = "Kubernetes",
                    gpus = 8,
                    wallpaperTinting = true
                })
            },
            new WorkspacePanel
            {
                PanelKey = "survey",
                Title = "How did you hear about us?",
                SortOrder = 3,
                PayloadJson = JsonSerializer.Serialize(new
                {
                    options = new[] { "Social Media", "Search Engine", "Referral", "Other" }
                })
            },
            new WorkspacePanel
            {
                PanelKey = "request-processing",
                Title = "Processing your request",
                SortOrder = 4,
                PayloadJson = JsonSerializer.Serialize(new
                {
                    status = "Please wait while we process your request. Do not refresh the page."
                })
            }
        );

        await _dbContext.SaveChangesAsync();
    }

    private async Task SeedCustomizerAsync()
    {
        if (await _dbContext.CustomizerStates.AnyAsync())
        {
            return;
        }

        _dbContext.CustomizerStates.Add(new CustomizerState
        {
            Style = "Mira",
            Base = "Radix UI",
            BaseColor = "Taupe",
            Theme = "Blue",
            IconLibrary = "Tabler Icons",
            Font = "Inter",
            Radius = "Small",
            MenuColor = "Default",
            MenuAccent = "Subtle"
        });

        await _dbContext.SaveChangesAsync();
    }

    private async Task SeedIntelligenceAsync()
    {
        if (!await _dbContext.Observables.AnyAsync())
        {
            var observables = new[]
            {
                new ObservableRecord { Type = "ip", ValueRaw = "45.79.12.201", ValueCanonical = "45.79.12.201", Status = "active", SourceCount = 4, FirstSeenUtc = DateTime.UtcNow.AddDays(-8), LastSeenUtc = DateTime.UtcNow.AddHours(-6) },
                new ObservableRecord { Type = "domain", ValueRaw = "cdn-auth-security-check.com", ValueCanonical = "cdn-auth-security-check.com", Status = "active", SourceCount = 3, FirstSeenUtc = DateTime.UtcNow.AddDays(-7), LastSeenUtc = DateTime.UtcNow.AddHours(-5) },
                new ObservableRecord { Type = "url", ValueRaw = "https://cdn-auth-security-check.com/update", ValueCanonical = "https://cdn-auth-security-check.com/update", Status = "validated", SourceCount = 2, FirstSeenUtc = DateTime.UtcNow.AddDays(-6), LastSeenUtc = DateTime.UtcNow.AddHours(-4) },
                new ObservableRecord { Type = "hash", ValueRaw = "3f79bb7b435b05321651daefd374cd21b4", ValueCanonical = "3f79bb7b435b05321651daefd374cd21b4", Status = "active", SourceCount = 2, FirstSeenUtc = DateTime.UtcNow.AddDays(-5), LastSeenUtc = DateTime.UtcNow.AddHours(-3) },
                new ObservableRecord { Type = "domain", ValueRaw = "mail-auth-security-check.com", ValueCanonical = "mail-auth-security-check.com", Status = "new", SourceCount = 2, FirstSeenUtc = DateTime.UtcNow.AddDays(-4), LastSeenUtc = DateTime.UtcNow.AddHours(-2) },
                new ObservableRecord { Type = "ip", ValueRaw = "45.79.12.209", ValueCanonical = "45.79.12.209", Status = "new", SourceCount = 1, FirstSeenUtc = DateTime.UtcNow.AddDays(-2), LastSeenUtc = DateTime.UtcNow.AddHours(-1) },
                new ObservableRecord { Type = "hash", ValueRaw = "e7d8c0b13fdaf09317ec08f66e7f2f6a0e", ValueCanonical = "e7d8c0b13fdaf09317ec08f66e7f2f6a0e", Status = "validated", SourceCount = 3, FirstSeenUtc = DateTime.UtcNow.AddDays(-3), LastSeenUtc = DateTime.UtcNow.AddHours(-2) }
            };

            _dbContext.Observables.AddRange(observables);
            await _dbContext.SaveChangesAsync();
        }

        if (!await _dbContext.ObservableEvidences.AnyAsync())
        {
            var lookup = await _dbContext.Observables.ToDictionaryAsync(x => x.ValueCanonical);
            AddEvidence(lookup["45.79.12.201"], "asn", "13335");
            AddEvidence(lookup["45.79.12.201"], "campaign", "Volt Typhoon");
            AddEvidence(lookup["45.79.12.201"], "tls", "ab:11:44:cd");

            AddEvidence(lookup["cdn-auth-security-check.com"], "asn", "13335");
            AddEvidence(lookup["cdn-auth-security-check.com"], "campaign", "Volt Typhoon");
            AddEvidence(lookup["cdn-auth-security-check.com"], "malware_family", "StealX");

            AddEvidence(lookup["https://cdn-auth-security-check.com/update"], "asn", "13335");
            AddEvidence(lookup["https://cdn-auth-security-check.com/update"], "campaign", "Volt Typhoon");

            AddEvidence(lookup["3f79bb7b435b05321651daefd374cd21b4"], "malware_family", "StealX");
            AddEvidence(lookup["3f79bb7b435b05321651daefd374cd21b4"], "campaign", "Volt Typhoon");

            AddEvidence(lookup["mail-auth-security-check.com"], "asn", "13335");
            AddEvidence(lookup["mail-auth-security-check.com"], "tls", "ab:11:44:cd");
            AddEvidence(lookup["mail-auth-security-check.com"], "campaign", "Volt Typhoon");

            AddEvidence(lookup["45.79.12.209"], "asn", "13335");
            AddEvidence(lookup["45.79.12.209"], "campaign", "Volt Typhoon");

            AddEvidence(lookup["e7d8c0b13fdaf09317ec08f66e7f2f6a0e"], "malware_family", "StealX");

            await _dbContext.SaveChangesAsync();
        }

        if (!await _dbContext.ObservableSightings.AnyAsync())
        {
            var ids = await _dbContext.Observables.ToDictionaryAsync(x => x.ValueCanonical, x => x.Id);
            var now = DateTime.UtcNow;
            _dbContext.ObservableSightings.AddRange(
                new ObservableSighting { ObservableId = ids["45.79.12.201"], SensorName = "edge-suricata-01", HitCount = 8, SeenUtc = now.AddHours(-20) },
                new ObservableSighting { ObservableId = ids["cdn-auth-security-check.com"], SensorName = "edge-suricata-01", HitCount = 6, SeenUtc = now.AddHours(-19) },
                new ObservableSighting { ObservableId = ids["https://cdn-auth-security-check.com/update"], SensorName = "proxy-01", HitCount = 5, SeenUtc = now.AddHours(-18) },
                new ObservableSighting { ObservableId = ids["3f79bb7b435b05321651daefd374cd21b4"], SensorName = "edr-01", HitCount = 4, SeenUtc = now.AddHours(-17) },
                new ObservableSighting { ObservableId = ids["mail-auth-security-check.com"], SensorName = "edge-suricata-01", HitCount = 3, SeenUtc = now.AddHours(-16) },
                new ObservableSighting { ObservableId = ids["45.79.12.209"], SensorName = "edge-suricata-01", HitCount = 2, SeenUtc = now.AddHours(-15) },
                new ObservableSighting { ObservableId = ids["e7d8c0b13fdaf09317ec08f66e7f2f6a0e"], SensorName = "edr-01", HitCount = 2, SeenUtc = now.AddHours(-14) }
            );
            await _dbContext.SaveChangesAsync();
        }

        if (!await _dbContext.ThreatEntities.AnyAsync())
        {
            _dbContext.ThreatEntities.AddRange(
                new ThreatEntity { EntityType = "campaign", Name = "Volt Typhoon", Description = "Infrastructure-focused intrusion campaign." },
                new ThreatEntity { EntityType = "malware_family", Name = "StealX", Description = "Credential theft malware family." },
                new ThreatEntity { EntityType = "threat_actor", Name = "Atlas Jackal", Description = "Clustered actor profile under active investigation." }
            );
            await _dbContext.SaveChangesAsync();
        }
    }

    private void AddEvidence(ObservableRecord observable, string evidenceType, string evidenceValue)
    {
        _dbContext.ObservableEvidences.Add(new ObservableEvidence
        {
            ObservableId = observable.Id,
            Source = "seed",
            EvidenceType = evidenceType,
            EvidenceKey = evidenceType,
            EvidenceValue = evidenceValue,
            ObservedUtc = DateTime.UtcNow.AddHours(-1)
        });
    }
}
