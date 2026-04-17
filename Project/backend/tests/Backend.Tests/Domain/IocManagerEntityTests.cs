using Backend.Domain.IocManager;
using FluentAssertions;

namespace Backend.Tests.Domain;

public sealed class IocManagerEntityTests
{
    [Fact]
    public void Ioc_Create_RejectsConfidenceOutsideRange()
    {
        var nowUtc = DateTimeOffset.UtcNow;

        var act = () => Ioc.Create(
            feedSourceId: Guid.NewGuid(),
            iocFileId: null,
            type: IocType.Domain,
            value: "example.org",
            severity: AlertSeverity.High,
            confidence: 1.2m,
            seenAtUtc: nowUtc,
            actorUserId: "analyst-1",
            nowUtc: nowUtc);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void ScanJob_StartThenComplete_TransitionsToTerminalStatus()
    {
        var queuedAtUtc = DateTimeOffset.UtcNow;
        var item = ScanJob.Queue(
            scanPlanId: Guid.NewGuid(),
            triggerSource: "manual",
            triggeredByUserId: "analyst-1",
            queuedAtUtc: queuedAtUtc);

        item.Start("analyst-1", queuedAtUtc.AddMinutes(1));
        item.Complete(ScanJobStatus.Completed, "done", "analyst-1", queuedAtUtc.AddMinutes(2));

        item.Status.Should().Be(ScanJobStatus.Completed);
        item.StartedAtUtc.Should().NotBeNull();
        item.CompletedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public void ScanPlan_Create_RejectsRuleSetWithScopeFields()
    {
        var act = () => ScanPlan.Create(
            name: "Invalid RuleSet Plan",
            description: "rule scope fields should not be allowed",
            scannerCapability: ScannerCapability.Yara,
            ruleSelectionMode: ScanRuleSelectionMode.RuleSet,
            ruleScopeType: RuleScopeType.Global,
            ruleScopeValue: null,
            cadenceType: ScanCadenceType.Manual,
            intervalMinutes: null,
            runAtHourUtc: null,
            runAtMinuteUtc: null,
            weeklyDayOfWeek: null,
            operatorNotes: null,
            status: ScanPlanStatus.Active,
            actorUserId: "lead-1",
            nowUtc: DateTimeOffset.UtcNow);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ScanPlan_Create_RejectsRuleScopeWithoutScopeType()
    {
        var act = () => ScanPlan.Create(
            name: "Invalid RuleScope Plan",
            description: "scope type required",
            scannerCapability: ScannerCapability.Yara,
            ruleSelectionMode: ScanRuleSelectionMode.RuleScope,
            ruleScopeType: null,
            ruleScopeValue: "prod",
            cadenceType: ScanCadenceType.Manual,
            intervalMinutes: null,
            runAtHourUtc: null,
            runAtMinuteUtc: null,
            weeklyDayOfWeek: null,
            operatorNotes: null,
            status: ScanPlanStatus.Active,
            actorUserId: "lead-1",
            nowUtc: DateTimeOffset.UtcNow);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ScanPlan_IntervalCadence_ComputesNextRunUtc()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var plan = ScanPlan.Create(
            name: "Interval Plan",
            description: "interval cadence",
            scannerCapability: ScannerCapability.Yara,
            ruleSelectionMode: ScanRuleSelectionMode.RuleScope,
            ruleScopeType: RuleScopeType.Global,
            ruleScopeValue: null,
            cadenceType: ScanCadenceType.Interval,
            intervalMinutes: 5,
            runAtHourUtc: null,
            runAtMinuteUtc: null,
            weeklyDayOfWeek: null,
            operatorNotes: null,
            status: ScanPlanStatus.Active,
            actorUserId: "lead-1",
            nowUtc: nowUtc);

        plan.NextRunAtUtc.Should().NotBeNull();
        plan.NextRunAtUtc.Should().BeAfter(nowUtc.AddMinutes(4));

        plan.MarkQueued("lead-1", nowUtc.AddMinutes(1));
        plan.NextRunAtUtc.Should().BeAfter(nowUtc.AddMinutes(5));
    }

    [Fact]
    public void ScanJob_RequestCancellation_OnQueued_TransitionsToCancelled()
    {
        var queuedAtUtc = DateTimeOffset.UtcNow;
        var item = ScanJob.Queue(
            scanPlanId: Guid.NewGuid(),
            triggerSource: "manual",
            triggeredByUserId: "analyst-1",
            queuedAtUtc: queuedAtUtc);

        item.RequestCancellation("analyst-1", queuedAtUtc.AddSeconds(10), "cancelled");

        item.CancellationRequested.Should().BeTrue();
        item.Status.Should().Be(ScanJobStatus.Cancelled);
        item.CompletedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public void ScanJob_Complete_AllowsPartiallyCompleted()
    {
        var queuedAtUtc = DateTimeOffset.UtcNow;
        var item = ScanJob.Queue(
            scanPlanId: Guid.NewGuid(),
            triggerSource: "manual",
            triggeredByUserId: "analyst-1",
            queuedAtUtc: queuedAtUtc);

        item.Start("analyst-1", queuedAtUtc.AddMinutes(1));
        item.Complete(ScanJobStatus.PartiallyCompleted, "partial", "analyst-1", queuedAtUtc.AddMinutes(2));

        item.Status.Should().Be(ScanJobStatus.PartiallyCompleted);
        item.CompletedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public void RetentionPolicy_Create_RejectsArchiveWindowGreaterThanRetention()
    {
        var nowUtc = DateTimeOffset.UtcNow;

        var act = () => RetentionPolicy.Create(
            dataType: RetentionDataType.AuditLog,
            retainDays: 30,
            archiveAfterDays: 31,
            actorUserId: "admin-1",
            nowUtc: nowUtc);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Alert_TouchDetection_UpdatesLastDetectionOnlyForward()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var first = nowUtc.AddHours(-2);
        var item = Alert.Create(
            title: "IOC hit",
            summary: "Malicious domain seen",
            severity: AlertSeverity.Medium,
            ownerUserId: "analyst-1",
            approvalTierRequired: "Lead",
            detectedAtUtc: first,
            actorUserId: "analyst-1",
            nowUtc: nowUtc);

        item.TouchDetection(first.AddHours(1), "analyst-1", nowUtc.AddMinutes(1));
        item.TouchDetection(first.AddMinutes(30), "analyst-1", nowUtc.AddMinutes(2));

        item.LastDetectedAtUtc.Should().Be(first.AddHours(1));
    }

    [Fact]
    public void DiscoveryRun_QueuedRunningSuccess_Transitions()
    {
        var queuedAtUtc = DateTimeOffset.UtcNow;
        var run = DiscoveryRun.Queue(
            subnetId: Guid.NewGuid(),
            requestedCidr: "10.10.10.0/24",
            rangeStartIp: "10.10.10.10",
            rangeEndIp: "10.10.10.20",
            totalHosts: 11,
            actorUserId: "analyst-1",
            nowUtc: queuedAtUtc);

        run.Start("worker", queuedAtUtc.AddSeconds(1));
        run.Complete(
            terminalStatus: DiscoveryRunStatus.Success,
            totalHosts: 11,
            reachableHosts: 11,
            unreachableHosts: 0,
            summary: "All hosts reachable.",
            actorUserId: "worker",
            completedAtUtc: queuedAtUtc.AddSeconds(2));

        run.Status.Should().Be(DiscoveryRunStatus.Success);
        run.StartedAtUtc.Should().NotBeNull();
        run.CompletedAtUtc.Should().NotBeNull();
    }

    [Fact]
    public void DiscoveryRun_QueuedRunningPartial_Transitions()
    {
        var run = DiscoveryRun.Queue(
            subnetId: Guid.NewGuid(),
            requestedCidr: "10.10.11.0/24",
            rangeStartIp: null,
            rangeEndIp: null,
            totalHosts: 4,
            actorUserId: "analyst-1",
            nowUtc: DateTimeOffset.UtcNow);

        run.Start("worker", DateTimeOffset.UtcNow);
        run.Complete(
            terminalStatus: DiscoveryRunStatus.Partial,
            totalHosts: 4,
            reachableHosts: 2,
            unreachableHosts: 2,
            summary: "Partial reachability.",
            actorUserId: "worker",
            completedAtUtc: DateTimeOffset.UtcNow);

        run.Status.Should().Be(DiscoveryRunStatus.Partial);
    }

    [Fact]
    public void DiscoveryRun_QueuedRunningUnreachable_Transitions()
    {
        var run = DiscoveryRun.Queue(
            subnetId: Guid.NewGuid(),
            requestedCidr: "10.10.12.0/24",
            rangeStartIp: null,
            rangeEndIp: null,
            totalHosts: 3,
            actorUserId: "analyst-1",
            nowUtc: DateTimeOffset.UtcNow);

        run.Start("worker", DateTimeOffset.UtcNow);
        run.Complete(
            terminalStatus: DiscoveryRunStatus.Unreachable,
            totalHosts: 3,
            reachableHosts: 0,
            unreachableHosts: 3,
            summary: "No reachable hosts.",
            actorUserId: "worker",
            completedAtUtc: DateTimeOffset.UtcNow);

        run.Status.Should().Be(DiscoveryRunStatus.Unreachable);
    }

    [Fact]
    public void DiscoveryRun_ErrorPath_ToFailed()
    {
        var run = DiscoveryRun.Queue(
            subnetId: Guid.NewGuid(),
            requestedCidr: "10.10.13.0/24",
            rangeStartIp: null,
            rangeEndIp: null,
            totalHosts: 1,
            actorUserId: "analyst-1",
            nowUtc: DateTimeOffset.UtcNow);

        run.Start("worker", DateTimeOffset.UtcNow);
        run.Complete(
            terminalStatus: DiscoveryRunStatus.Failed,
            totalHosts: 1,
            reachableHosts: 0,
            unreachableHosts: 1,
            summary: "Probe timeout.",
            actorUserId: "worker",
            completedAtUtc: DateTimeOffset.UtcNow);

        run.Status.Should().Be(DiscoveryRunStatus.Failed);
    }

    [Fact]
    public void TargetServer_Create_WithInvalidConnectionPort_Throws()
    {
        var act = () => TargetServer.Create(
            subnetId: Guid.NewGuid(),
            hostname: "srv-core-01",
            ipAddress: "10.10.1.25",
            operatingSystem: "Windows Server 2022",
            environment: "prod",
            actorUserId: "lead-1",
            nowUtc: DateTimeOffset.UtcNow,
            connectionProtocol: ConnectionProtocol.WinRm,
            connectionHost: "srv-core-01.corp.local",
            connectionPort: 70000,
            connectionAuthMode: ConnectionAuthMode.Password,
            connectionUsername: "svc_scanner");

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void TargetServer_UpdateConnectivity_RollsForwardContact()
    {
        var createdAtUtc = DateTimeOffset.UtcNow.AddMinutes(-10);
        var server = TargetServer.Create(
            subnetId: Guid.NewGuid(),
            hostname: "srv-core-01",
            ipAddress: "10.10.1.25",
            operatingSystem: "Windows Server 2022",
            environment: "prod",
            actorUserId: "lead-1",
            nowUtc: createdAtUtc);

        server.UpdateConnectivity(
            ConnectivityStatus.Online,
            lastHeartbeatUtc: createdAtUtc.AddMinutes(5),
            lastContactUtc: createdAtUtc.AddMinutes(6),
            actorUserId: "lead-1",
            nowUtc: createdAtUtc.AddMinutes(6));

        server.UpdateConnectivity(
            ConnectivityStatus.Degraded,
            lastHeartbeatUtc: null,
            lastContactUtc: null,
            actorUserId: "lead-1",
            nowUtc: createdAtUtc.AddMinutes(7));

        server.ConnectivityStatus.Should().Be(ConnectivityStatus.Degraded);
        server.LastHeartbeatUtc.Should().Be(createdAtUtc.AddMinutes(5));
        server.LastContactUtc.Should().Be(createdAtUtc.AddMinutes(6));
    }

    [Fact]
    public void TargetServerScannerAssignment_Update_PreservesLatestContact()
    {
        var nowUtc = DateTimeOffset.UtcNow.AddMinutes(-2);
        var assignment = TargetServerScannerAssignment.Create(
            targetServerId: Guid.NewGuid(),
            scannerId: Guid.NewGuid(),
            connectivityStatus: ConnectivityStatus.Online,
            lastHeartbeatUtc: nowUtc,
            lastContactUtc: nowUtc,
            isEnabled: true,
            actorUserId: "lead-1",
            nowUtc: nowUtc);

        assignment.Update(
            connectivityStatus: ConnectivityStatus.Degraded,
            lastHeartbeatUtc: null,
            lastContactUtc: null,
            isEnabled: true,
            actorUserId: "lead-1",
            nowUtc: nowUtc.AddMinutes(1));

        assignment.ConnectivityStatus.Should().Be(ConnectivityStatus.Degraded);
        assignment.LastHeartbeatUtc.Should().Be(nowUtc);
        assignment.LastContactUtc.Should().Be(nowUtc);
    }

    [Fact]
    public void RuleDistributionTarget_SuccessAndValidationFailed_AreNotDispatchable()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var target = RuleDistributionTarget.CreateSnapshot(
            ruleDistributionJobId: Guid.NewGuid(),
            targetServerId: Guid.NewGuid(),
            targetHostname: "srv-01",
            targetIpAddress: "10.10.10.10",
            actorUserId: "lead-1",
            nowUtc: nowUtc);

        target.MarkResult(RuleDistributionTargetStatus.Success, isRetryable: false, errorMessage: null, actorUserId: "worker", nowUtc: nowUtc.AddSeconds(1));
        target.CanDispatch().Should().BeFalse();

        target.ResetForRetry("lead-1", nowUtc.AddSeconds(2));
        target.Status.Should().Be(RuleDistributionTargetStatus.Success);
    }

    [Fact]
    public void RuleDistributionTarget_Failure_CanBeRetried()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var target = RuleDistributionTarget.CreateSnapshot(
            ruleDistributionJobId: Guid.NewGuid(),
            targetServerId: Guid.NewGuid(),
            targetHostname: "srv-02",
            targetIpAddress: "10.10.10.11",
            actorUserId: "lead-1",
            nowUtc: nowUtc);

        target.MarkResult(RuleDistributionTargetStatus.Failure, isRetryable: true, errorMessage: "ssh timeout", actorUserId: "worker", nowUtc: nowUtc.AddSeconds(1));
        target.CanDispatch().Should().BeTrue();

        target.ResetForRetry("lead-1", nowUtc.AddSeconds(2));
        target.Status.Should().Be(RuleDistributionTargetStatus.Pending);
        target.LastError.Should().BeNull();
    }

    [Fact]
    public void RuleDistributionJob_QueueManualRetry_RejectsWhenMaxAttemptsReached()
    {
        var queuedAtUtc = DateTimeOffset.UtcNow;
        var job = RuleDistributionJob.Queue(
            ruleRevisionId: Guid.NewGuid(),
            operatorUserId: "lead-1",
            actorUserId: "lead-1",
            queuedAtUtc: queuedAtUtc,
            notes: "initial",
            maxAttempts: 1);

        job.StartAttempt(1, "worker", queuedAtUtc.AddSeconds(1));
        job.Complete(RuleDistributionJobStatus.Failed, "failed", "worker", queuedAtUtc.AddSeconds(2));

        var act = () => job.QueueManualRetry("lead-1", queuedAtUtc.AddSeconds(3), "retry");
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void RuleDistributionAttempt_Completion_SetsTerminalState()
    {
        var startedAtUtc = DateTimeOffset.UtcNow;
        var attempt = RuleDistributionAttempt.Start(
            ruleDistributionJobId: Guid.NewGuid(),
            attemptNumber: 2,
            triggeredByUserId: "lead-1",
            startedAtUtc: startedAtUtc);

        attempt.Complete(
            status: RuleDistributionAttemptStatus.Partial,
            summary: "1 success, 1 failure",
            backoffSeconds: 15,
            actorUserId: "worker",
            completedAtUtc: startedAtUtc.AddSeconds(10));

        attempt.Status.Should().Be(RuleDistributionAttemptStatus.Partial);
        attempt.BackoffSeconds.Should().Be(15);
        attempt.CompletedAtUtc.Should().NotBeNull();
    }
}
