using IoCManager.Mvc.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Data;

public sealed class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<DashboardMetric> DashboardMetrics => Set<DashboardMetric>();
    public DbSet<VisitorPoint> VisitorPoints => Set<VisitorPoint>();
    public DbSet<SectionRecord> SectionRecords => Set<SectionRecord>();
    public DbSet<WorkspacePanel> WorkspacePanels => Set<WorkspacePanel>();
    public DbSet<CustomizerState> CustomizerStates => Set<CustomizerState>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();
    public DbSet<ObservableRecord> Observables => Set<ObservableRecord>();
    public DbSet<ThreatEntity> ThreatEntities => Set<ThreatEntity>();
    public DbSet<ObservableRelationship> ObservableRelationships => Set<ObservableRelationship>();
    public DbSet<ObservableEvidence> ObservableEvidences => Set<ObservableEvidence>();
    public DbSet<ObservableSighting> ObservableSightings => Set<ObservableSighting>();
    public DbSet<CorrelationCluster> CorrelationClusters => Set<CorrelationCluster>();
    public DbSet<ClusterMembership> ClusterMemberships => Set<ClusterMembership>();
    public DbSet<DetectionCoverage> DetectionCoverages => Set<DetectionCoverage>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<CorrelationStory> CorrelationStories => Set<CorrelationStory>();
    public DbSet<CorrelationRunLog> CorrelationRunLogs => Set<CorrelationRunLog>();
    public DbSet<CaseShell> CaseShells => Set<CaseShell>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<DashboardMetric>()
            .HasIndex(x => x.SortOrder);

        builder.Entity<VisitorPoint>()
            .HasIndex(x => x.DateUtc);

        builder.Entity<SectionRecord>()
            .HasIndex(x => x.SortOrder);

        builder.Entity<WorkspacePanel>()
            .HasIndex(x => x.SortOrder);

        builder.Entity<WorkspacePanel>()
            .HasIndex(x => x.PanelKey)
            .IsUnique();

        builder.Entity<UserPreference>()
            .HasIndex(x => x.UserId)
            .IsUnique();

        builder.Entity<ObservableRecord>()
            .HasIndex(x => x.ValueCanonical);

        builder.Entity<ObservableRecord>()
            .HasIndex(x => new { x.Type, x.ValueCanonical })
            .IsUnique();

        builder.Entity<ObservableRelationship>()
            .HasIndex(x => new { x.FromObservableId, x.ToObservableId })
            .IsUnique();

        builder.Entity<ObservableRelationship>()
            .HasIndex(x => x.FromObservableId);

        builder.Entity<ObservableRelationship>()
            .HasIndex(x => x.ToObservableId);

        builder.Entity<ClusterMembership>()
            .HasIndex(x => new { x.ClusterId, x.ObservableId })
            .IsUnique();

        builder.Entity<ClusterMembership>()
            .HasIndex(x => x.ObservableId);

        builder.Entity<DetectionCoverage>()
            .HasIndex(x => new { x.ObservableId, x.RuleFamily })
            .IsUnique();

        builder.Entity<ObservableEvidence>()
            .HasIndex(x => new { x.EvidenceType, x.EvidenceValue });

        builder.Entity<ObservableSighting>()
            .HasIndex(x => new { x.ObservableId, x.SeenUtc });
    }
}
