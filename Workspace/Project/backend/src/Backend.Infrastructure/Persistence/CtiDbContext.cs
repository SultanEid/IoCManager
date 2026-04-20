using Backend.Application.Abstractions.Persistence;
using Backend.Domain.Cases;
using Backend.Domain.Decisions;
using Backend.Domain.Deployments;
using Backend.Domain.Evidence;
using Backend.Domain.Feedback;
using Backend.Domain.Jobs;
using Backend.Domain.Reports;
using Backend.Domain.Rules;
using Backend.Domain.RuleLifecycle;
using Backend.Domain.IocManager;
using Backend.Domain.AiAdjudication;
using Backend.Domain.Cti.V1.Persistence;
using Backend.Infrastructure.Security;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence;

public sealed class CtiDbContext
    : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>, IUnitOfWork
{
    private static readonly HashSet<Type> ImmutableCtiEntityTypes =
    [
        typeof(CtiFeatureSnapshot),
        typeof(CtiFeatureVector),
        typeof(CtiGraphDerivedFeature),
        typeof(CtiAssetCriticalitySnapshotValue),
        typeof(CtiSourceTrustSnapshotValue),
        typeof(CtiPolicyVersionReference),
        typeof(CtiModelVersionReference),
        typeof(CtiModelDecisionTrace),
        typeof(CtiDecisionEvidenceReference),
        typeof(CtiDecisionLineageReference),
        typeof(CtiAuditRecord),
    ];

    public CtiDbContext(DbContextOptions<CtiDbContext> options)
        : base(options)
    {
    }

    public DbSet<CaseRecord> Cases => Set<CaseRecord>();

    public DbSet<EvidenceItem> Evidence => Set<EvidenceItem>();

    public DbSet<DecisionRecord> Decisions => Set<DecisionRecord>();

    public DbSet<RuleRecord> Rules => Set<RuleRecord>();
    public DbSet<RuleRevisionRecord> RuleRevisions => Set<RuleRevisionRecord>();

    public DbSet<DeploymentRecord> Deployments => Set<DeploymentRecord>();

    public DbSet<FeedbackRecord> Feedback => Set<FeedbackRecord>();

    public DbSet<JobRunRecord> JobRuns => Set<JobRunRecord>();
    public DbSet<ReportIngestionRun> ReportIngestionRuns => Set<ReportIngestionRun>();
    public DbSet<ReportIngestionClaim> ReportIngestionClaims => Set<ReportIngestionClaim>();

    public DbSet<RuleProposal> RuleProposals => Set<RuleProposal>();

    public DbSet<DeploymentRecommendation> DeploymentRecommendations => Set<DeploymentRecommendation>();

    public DbSet<RolloutPlan> RolloutPlans => Set<RolloutPlan>();

    public DbSet<RollbackPlan> RollbackPlans => Set<RollbackPlan>();

    public DbSet<CtiCase> CtiCases => Set<CtiCase>();

    public DbSet<CtiEvidenceAssertion> CtiEvidenceAssertions => Set<CtiEvidenceAssertion>();

    public DbSet<CtiDecision> CtiDecisions => Set<CtiDecision>();

    public DbSet<CtiDecisionBundle> CtiDecisionBundles => Set<CtiDecisionBundle>();

    public DbSet<CtiApproval> CtiApprovals => Set<CtiApproval>();

    public DbSet<CtiRuleProposal> CtiRuleProposals => Set<CtiRuleProposal>();

    public DbSet<CtiDeploymentRecommendation> CtiDeploymentRecommendations => Set<CtiDeploymentRecommendation>();

    public DbSet<CtiFeedback> CtiFeedback => Set<CtiFeedback>();

    public DbSet<CtiSourceReliabilityProfile> CtiSourceReliabilityProfiles => Set<CtiSourceReliabilityProfile>();

    public DbSet<CtiAuditRecord> CtiAuditRecords => Set<CtiAuditRecord>();

    public DbSet<CtiTransformationLineageRecord> CtiTransformationLineageRecords => Set<CtiTransformationLineageRecord>();

    public DbSet<CtiDecisionEvidenceReference> CtiDecisionEvidenceReferences => Set<CtiDecisionEvidenceReference>();

    public DbSet<CtiDecisionLineageReference> CtiDecisionLineageReferences => Set<CtiDecisionLineageReference>();

    public DbSet<CtiFeatureSnapshot> CtiFeatureSnapshots => Set<CtiFeatureSnapshot>();

    public DbSet<CtiFeatureVector> CtiFeatureVectors => Set<CtiFeatureVector>();

    public DbSet<CtiGraphDerivedFeature> CtiGraphDerivedFeatures => Set<CtiGraphDerivedFeature>();

    public DbSet<CtiAssetCriticalitySnapshotValue> CtiAssetCriticalitySnapshotValues => Set<CtiAssetCriticalitySnapshotValue>();

    public DbSet<CtiSourceTrustSnapshotValue> CtiSourceTrustSnapshotValues => Set<CtiSourceTrustSnapshotValue>();

    public DbSet<CtiPolicyVersionReference> CtiPolicyVersionReferences => Set<CtiPolicyVersionReference>();

    public DbSet<CtiModelVersionReference> CtiModelVersionReferences => Set<CtiModelVersionReference>();

    public DbSet<CtiModelDecisionTrace> CtiModelDecisionTraces => Set<CtiModelDecisionTrace>();

    public DbSet<CtiGraphArtifactReference> CtiGraphArtifactReferences => Set<CtiGraphArtifactReference>();

    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    public DbSet<Network> Networks => Set<Network>();
    public DbSet<Subnet> Subnets => Set<Subnet>();
    public DbSet<TargetServer> TargetServers => Set<TargetServer>();
    public DbSet<TargetGroup> TargetGroups => Set<TargetGroup>();
    public DbSet<TargetGroupMember> TargetGroupMembers => Set<TargetGroupMember>();
    public DbSet<TargetServerConnectionSecret> TargetServerConnectionSecrets => Set<TargetServerConnectionSecret>();
    public DbSet<TargetServerScannerAssignment> TargetServerScannerAssignments => Set<TargetServerScannerAssignment>();
    public DbSet<DiscoveryRun> DiscoveryRuns => Set<DiscoveryRun>();
    public DbSet<DiscoveredHost> DiscoveredHosts => Set<DiscoveredHost>();
    public DbSet<Scanner> Scanners => Set<Scanner>();
    public DbSet<ScannerCapabilityBinding> ScannerCapabilityBindings => Set<ScannerCapabilityBinding>();

    public DbSet<FeedSource> FeedSources => Set<FeedSource>();
    public DbSet<IocFile> IocFiles => Set<IocFile>();
    public DbSet<Ioc> Iocs => Set<Ioc>();

    public DbSet<RuleArtifact> RuleArtifacts => Set<RuleArtifact>();
    public DbSet<RuleRevision> RuleRevisionsV2 => Set<RuleRevision>();
    public DbSet<RuleImportAttempt> RuleImportAttempts => Set<RuleImportAttempt>();
    public DbSet<RuleDistribution> RuleDistributions => Set<RuleDistribution>();
    public DbSet<RuleDistributionJob> RuleDistributionJobs => Set<RuleDistributionJob>();
    public DbSet<RuleDistributionAttempt> RuleDistributionAttempts => Set<RuleDistributionAttempt>();
    public DbSet<RuleDistributionTarget> RuleDistributionTargets => Set<RuleDistributionTarget>();
    public DbSet<RuleDistributionTargetAttempt> RuleDistributionTargetAttempts => Set<RuleDistributionTargetAttempt>();
    public DbSet<RuleDistributionJobTargetGroup> RuleDistributionJobTargetGroups => Set<RuleDistributionJobTargetGroup>();

    public DbSet<ScanPlan> ScanPlans => Set<ScanPlan>();
    public DbSet<ScanPlanTargetServer> ScanPlanTargetServers => Set<ScanPlanTargetServer>();
    public DbSet<ScanPlanRuleRevision> ScanPlanRuleRevisions => Set<ScanPlanRuleRevision>();
    public DbSet<ScanJob> ScanJobs => Set<ScanJob>();
    public DbSet<ScanJobTargetExecution> ScanJobTargetExecutions => Set<ScanJobTargetExecution>();
    public DbSet<JobAttempt> JobAttempts => Set<JobAttempt>();
    public DbSet<ScanResult> ScanResults => Set<ScanResult>();
    public DbSet<ScanResultIngestionRun> ScanResultIngestionRuns => Set<ScanResultIngestionRun>();
    public DbSet<ScanResultProvenance> ScanResultProvenances => Set<ScanResultProvenance>();
    public DbSet<ScanResultIngestionDiagnostic> ScanResultIngestionDiagnostics => Set<ScanResultIngestionDiagnostic>();

    public DbSet<Alert> AlertsV2 => Set<Alert>();
    public DbSet<AlertIoc> AlertIocs => Set<AlertIoc>();
    public DbSet<AlertScanResult> AlertScanResults => Set<AlertScanResult>();
    public DbSet<Report> ReportsV2 => Set<Report>();
    public DbSet<ReportAlert> ReportAlerts => Set<ReportAlert>();
    public DbSet<AuditLog> AuditLogsV2 => Set<AuditLog>();
    public DbSet<RetentionPolicy> RetentionPoliciesV2 => Set<RetentionPolicy>();
    public DbSet<ArchiveRecord> ArchiveRecordsV2 => Set<ArchiveRecord>();
    public DbSet<AiAdjudicationRequest> AiAdjudicationRequests => Set<AiAdjudicationRequest>();
    public DbSet<AiAdjudicationJob> AiAdjudicationJobs => Set<AiAdjudicationJob>();
    public DbSet<AiAdjudicationResult> AiAdjudicationResults => Set<AiAdjudicationResult>();
    public DbSet<AiAdjudicationExplanation> AiAdjudicationExplanations => Set<AiAdjudicationExplanation>();
    public DbSet<AiActionPlanRecommendation> AiActionPlanRecommendations => Set<AiActionPlanRecommendation>();
    public DbSet<AiAdjudicationOverride> AiAdjudicationOverrides => Set<AiAdjudicationOverride>();
    public DbSet<AiAdjudicationSimilarDetection> AiAdjudicationSimilarDetections => Set<AiAdjudicationSimilarDetection>();
    public DbSet<AiAdjudicationEvidenceSource> AiAdjudicationEvidenceSources => Set<AiAdjudicationEvidenceSource>();

    public override int SaveChanges()
    {
        EnforceImmutableCtiEntities();
        return base.SaveChanges();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        EnforceImmutableCtiEntities();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        EnforceImmutableCtiEntities();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        EnforceImmutableCtiEntities();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(CtiDbContext).Assembly);
    }

    private void EnforceImmutableCtiEntities()
    {
        foreach (var entry in ChangeTracker.Entries()
                     .Where(x => x.State is EntityState.Modified or EntityState.Deleted))
        {
            if (!ImmutableCtiEntityTypes.Contains(entry.Metadata.ClrType))
            {
                continue;
            }

            throw new InvalidOperationException(
                $"Entity '{entry.Metadata.ClrType.Name}' is append-only and cannot be {entry.State}.");
        }
    }
}
