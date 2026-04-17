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
    public DbSet<ModelDecisionTrace> ModelDecisionTraces => Set<ModelDecisionTrace>();
    public DbSet<AnalystOutcome> AnalystOutcomes => Set<AnalystOutcome>();
    public DbSet<ReportIngestionRecord> ReportIngestionRecords => Set<ReportIngestionRecord>();
    public DbSet<RuleProposalRecord> RuleProposalRecords => Set<RuleProposalRecord>();
    public DbSet<DeploymentRecommendationRecord> DeploymentRecommendationRecords => Set<DeploymentRecommendationRecord>();
    public DbSet<EvidenceCitationRecord> EvidenceCitationRecords => Set<EvidenceCitationRecord>();
    public DbSet<GraphLinkCandidateRecord> GraphLinkCandidateRecords => Set<GraphLinkCandidateRecord>();
    public DbSet<InvestigationCase> InvestigationCases => Set<InvestigationCase>();
    public DbSet<CaseEvidenceBundle> CaseEvidenceBundles => Set<CaseEvidenceBundle>();
    public DbSet<CaseDecision> CaseDecisions => Set<CaseDecision>();
    public DbSet<DecisionBundle> DecisionBundles => Set<DecisionBundle>();
    public DbSet<EvidenceAssertion> EvidenceAssertions => Set<EvidenceAssertion>();
    public DbSet<TransformationLineage> TransformationLineages => Set<TransformationLineage>();
    public DbSet<PointInTimeFeatureSnapshot> PointInTimeFeatureSnapshots => Set<PointInTimeFeatureSnapshot>();
    public DbSet<CaseRuleProposal> CaseRuleProposals => Set<CaseRuleProposal>();
    public DbSet<CaseDeploymentRecommendation> CaseDeploymentRecommendations => Set<CaseDeploymentRecommendation>();
    public DbSet<RolloutPlan> RolloutPlans => Set<RolloutPlan>();
    public DbSet<RollbackPlan> RollbackPlans => Set<RollbackPlan>();
    public DbSet<SourceReliabilityProfile> SourceReliabilityProfiles => Set<SourceReliabilityProfile>();
    public DbSet<AnalystFeedbackEvent> AnalystFeedbackEvents => Set<AnalystFeedbackEvent>();
    public DbSet<AnalystOverrideRecord> AnalystOverrideRecords => Set<AnalystOverrideRecord>();

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

        builder.Entity<ModelDecisionTrace>()
            .HasIndex(x => new { x.ObservableId, x.CreatedUtc });

        builder.Entity<ModelDecisionTrace>()
            .HasIndex(x => x.DecisionTraceHash);
        builder.Entity<ModelDecisionTrace>()
            .HasIndex(x => new { x.CaseId, x.CreatedUtc });

        builder.Entity<AnalystOutcome>()
            .HasIndex(x => new { x.IocType, x.IocValue, x.EventTimeUtc });

        builder.Entity<AnalystOutcome>()
            .HasIndex(x => x.Verdict);

        builder.Entity<ReportIngestionRecord>()
            .HasIndex(x => x.ReportId)
            .IsUnique();

        builder.Entity<RuleProposalRecord>()
            .HasIndex(x => x.ProposalId)
            .IsUnique();

        builder.Entity<RuleProposalRecord>()
            .HasIndex(x => new { x.ObservableId, x.CreatedUtc });

        builder.Entity<DeploymentRecommendationRecord>()
            .HasIndex(x => x.RecommendationId)
            .IsUnique();

        builder.Entity<DeploymentRecommendationRecord>()
            .HasIndex(x => new { x.RuleFamily, x.ServerId, x.CreatedUtc });

        builder.Entity<EvidenceCitationRecord>()
            .HasIndex(x => new { x.SourceType, x.SourceId });

        builder.Entity<GraphLinkCandidateRecord>()
            .HasIndex(x => new { x.SeedObservableId, x.CandidateObservableId, x.ComputedUtc });

        builder.Entity<InvestigationCase>()
            .HasIndex(x => x.State);

        builder.Entity<InvestigationCase>()
            .HasIndex(x => x.Priority);

        builder.Entity<InvestigationCase>()
            .HasIndex(x => x.UpdatedAt);

        builder.Entity<CaseEvidenceBundle>()
            .HasIndex(x => new { x.CaseId, x.CreatedAt });

        builder.Entity<CaseDecision>()
            .HasIndex(x => new { x.CaseId, x.CreatedAt });

        builder.Entity<DecisionBundle>()
            .HasIndex(x => new { x.CaseId, x.CreatedAt });

        builder.Entity<EvidenceAssertion>()
            .HasIndex(x => new { x.CaseId, x.SourceId });

        builder.Entity<TransformationLineage>()
            .HasIndex(x => new { x.SourceEntityType, x.SourceEntityId, x.TargetEntityType, x.TargetEntityId });

        builder.Entity<PointInTimeFeatureSnapshot>()
            .HasIndex(x => new { x.CaseId, x.AsOfTime });

        builder.Entity<PointInTimeFeatureSnapshot>()
            .HasIndex(x => x.FeatureSnapshotHash);

        builder.Entity<CaseRuleProposal>()
            .HasIndex(x => new { x.CaseId, x.CreatedAt });

        builder.Entity<CaseDeploymentRecommendation>()
            .HasIndex(x => new { x.CaseId, x.CreatedAt });

        builder.Entity<RolloutPlan>()
            .HasIndex(x => x.CaseId);

        builder.Entity<RollbackPlan>()
            .HasIndex(x => x.CaseId);

        builder.Entity<AnalystFeedbackEvent>()
            .HasIndex(x => new { x.CaseId, x.CreatedAt });

        builder.Entity<AnalystOverrideRecord>()
            .HasIndex(x => new { x.CaseId, x.CreatedAt });
    }
}
