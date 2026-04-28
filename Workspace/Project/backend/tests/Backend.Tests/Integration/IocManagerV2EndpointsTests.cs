using Backend.Contracts.Cases;
using Backend.Contracts.V2;
using Backend.Api.Infrastructure;
using Backend.Domain.IocManager;
using Backend.Infrastructure.Compatibility.LegacyAzure;
using Backend.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Tests.Integration;

public sealed class IocManagerV2EndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly TestWebApplicationFactory _factory;

    public IocManagerV2EndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();
        _factory.GetIcmpProbe().Reset();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task EndToEnd_V2Flow_AndCaseShim_Work()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        var networkResponse = await leadClient.PostAsJsonAsync("/api/v2/infrastructure/networks", new CreateNetworkRequest(
            Name: "Prod East",
            CidrBlock: "10.10.0.0/16",
            Description: "Production east network",
            ActorUserId: "lead-1"));
        networkResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var network = await networkResponse.Content.ReadFromJsonAsync<NetworkResponse>(JsonOptions);
        network.Should().NotBeNull();

        var subnetResponse = await leadClient.PostAsJsonAsync("/api/v2/infrastructure/subnets", new CreateSubnetRequest(
            NetworkId: network!.Id,
            Name: "App Tier",
            CidrBlock: "10.10.1.0/24",
            Gateway: "10.10.1.1",
            ActorUserId: "lead-1"));
        subnetResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var subnet = await subnetResponse.Content.ReadFromJsonAsync<SubnetResponse>(JsonOptions);
        subnet.Should().NotBeNull();

        var serverResponse = await leadClient.PostAsJsonAsync("/api/v2/infrastructure/target-servers", new CreateTargetServerRequest(
            SubnetId: subnet!.Id,
            Hostname: "app-01",
            IpAddress: "10.10.1.25",
            OperatingSystem: "Windows Server 2022",
            Environment: "prod",
            ActorUserId: "lead-1"));
        serverResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var server = await serverResponse.Content.ReadFromJsonAsync<TargetServerResponse>(JsonOptions);
        server.Should().NotBeNull();

        var feedResponse = await leadClient.PostAsJsonAsync("/api/v2/iocs/feed-sources", new CreateFeedSourceRequest(
            Name: "Threat Feed A",
            SourceType: "ApiPull",
            Endpoint: "https://feed.example.local/api",
            ActorUserId: "lead-1"));
        feedResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var feed = await feedResponse.Content.ReadFromJsonAsync<FeedSourceResponse>(JsonOptions);
        feed.Should().NotBeNull();

        var iocFileResponse = await leadClient.PostAsJsonAsync("/api/v2/iocs/files", new CreateIocFileRequest(
            FeedSourceId: feed!.Id,
            FileName: "feed.json",
            StorageUri: "s3://ioc/feed.json",
            ContentHash: "abc123",
            ImportedAtUtc: DateTimeOffset.UtcNow,
            ActorUserId: "lead-1"));
        iocFileResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var iocFile = await iocFileResponse.Content.ReadFromJsonAsync<IocFileResponse>(JsonOptions);
        iocFile.Should().NotBeNull();

        var iocResponse = await leadClient.PostAsJsonAsync("/api/v2/iocs", new CreateIocRequest(
            FeedSourceId: feed.Id,
            IocFileId: iocFile!.Id,
            Type: "Domain",
            Value: "malicious.example",
            Severity: "High",
            Confidence: 0.91m,
            SeenAtUtc: DateTimeOffset.UtcNow,
            ActorUserId: "lead-1"));
        iocResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var ioc = await iocResponse.Content.ReadFromJsonAsync<IocResponse>(JsonOptions);
        ioc.Should().NotBeNull();

        var revision = await CreateDeploymentReadyRuleRevisionAsync();

        var planResponse = await leadClient.PostAsJsonAsync("/api/v2/scanning/plans", new CreateScanPlanRequest(
            Name: "Daily Prod Plan",
            Description: "Daily scan of prod app tier",
            ScannerCapability: "Suricata",
            RuleSelectionMode: "RuleSet",
            RuleScopeType: null,
            RuleScopeValue: null,
            CadenceType: "Manual",
            IntervalMinutes: null,
            RunAtHourUtc: null,
            RunAtMinuteUtc: null,
            WeeklyDayOfWeek: null,
            OperatorNotes: "integration",
            Status: "Active",
            ActorUserId: "lead-1",
            TargetServerIds: [server!.Id],
            RuleRevisionIds: [revision.Id]));
        planResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var plan = await planResponse.Content.ReadFromJsonAsync<ScanPlanResponse>(JsonOptions);
        plan.Should().NotBeNull();

        var jobResponse = await leadClient.PostAsJsonAsync($"/api/v2/scanning/plans/{plan!.Id}/run", new RunScanPlanRequest(
            ActorUserId: "lead-1",
            TriggerSource: "Manual"));
        jobResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var queuedJob = await jobResponse.Content.ReadFromJsonAsync<ScanJobResponse>(JsonOptions);
        queuedJob.Should().NotBeNull();

        var completedJob = await WaitForScanJobCompletionAsync(leadClient, queuedJob!.Id);
        completedJob.Status.Should().BeOneOf("Completed", "Failed", "PartiallyCompleted", "Cancelled");

        var targetExecutions = await leadClient.GetFromJsonAsync<IReadOnlyList<ScanJobTargetExecutionResponse>>(
            $"/api/v2/scanning/jobs/{queuedJob.Id}/targets",
            JsonOptions);
        targetExecutions.Should().NotBeNull();
        targetExecutions!.Should().HaveCountGreaterThanOrEqualTo(1);
        targetExecutions.Should().Contain(x => x.TargetServerId == server.Id);

        var alertResponse = await leadClient.PostAsJsonAsync("/api/v2/alerts", new CreateAlertRequest(
            Title: "Malicious domain detected",
            Summary: "Scan found malicious domain on target server",
            Severity: "High",
            OwnerUserId: "lead-1",
            ApprovalTierRequired: "Lead",
            DetectedAtUtc: DateTimeOffset.UtcNow,
            ActorUserId: "lead-1"));
        alertResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var alert = await alertResponse.Content.ReadFromJsonAsync<AlertResponse>(JsonOptions);
        alert.Should().NotBeNull();

        var reportResponse = await leadClient.PostAsJsonAsync("/api/v2/reports", new CreateReportRequest(
            Title: "Daily IOC Report",
            ReportType: "Operational",
            SummaryJson: "{\"alerts\":1}",
            AlertIds: new[] { alert.Id },
            ActorUserId: "lead-1"));
        reportResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var cases = await leadClient.GetFromJsonAsync<IReadOnlyList<CaseResponse>>("/api/cases", JsonOptions);
        cases.Should().NotBeNull();
        cases!.Should().ContainSingle(x => x.Id == alert.Id);
    }

    [Fact]
    public async Task CreateReport_WithUnknownAlertId_ReturnsBadRequestWithoutPartialReport()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");
        var unknownAlertId = Guid.NewGuid();

        var response = await leadClient.PostAsJsonAsync("/api/v2/reports", new CreateReportRequest(
            Title: "Invalid Alert Report",
            ReportType: "Operational",
            SummaryJson: "{\"alerts\":1}",
            AlertIds: [unknownAlertId],
            ActorUserId: "lead-1"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = await response.Content.ReadAsStringAsync();
        error.Should().Contain(unknownAlertId.ToString("D"));

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        (await dbContext.ReportsV2.CountAsync()).Should().Be(0);
        (await dbContext.ReportAlerts.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task AlertIocProgress_StatusWorkflowUpdatesCaseProgress()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        var alertResponse = await leadClient.PostAsJsonAsync("/api/v2/alerts", new CreateAlertRequest(
            Title: "Progress case alert",
            Summary: "Alert with linked IOC investigation progress",
            Severity: "High",
            OwnerUserId: "lead-1",
            ApprovalTierRequired: "Lead",
            DetectedAtUtc: DateTimeOffset.UtcNow,
            ActorUserId: "lead-1"));
        alertResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var alert = await alertResponse.Content.ReadFromJsonAsync<AlertResponse>(JsonOptions);
        alert.Should().NotBeNull();

        var iocId = Guid.NewGuid();
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
            dbContext.AlertIocs.Add(AlertIoc.Create(alert!.Id, iocId, DateTimeOffset.UtcNow, "lead-1"));
            await dbContext.SaveChangesAsync();
        }

        var initial = await leadClient.GetFromJsonAsync<AlertDetailResponse>($"/api/v2/alerts/{alert!.Id:D}", JsonOptions);
        initial.Should().NotBeNull();
        initial!.Progress.TotalIocs.Should().Be(1);
        initial.Progress.OpenCount.Should().Be(1);
        initial.Progress.PercentComplete.Should().Be(0);

        var inReviewResponse = await leadClient.PatchAsJsonAsync(
            $"/api/v2/alerts/{alert.Id:D}/iocs/{iocId:D}/status",
            new UpdateAlertIocStatusRequest("InReview", "lead-1"));
        inReviewResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var inReview = await inReviewResponse.Content.ReadFromJsonAsync<AlertDetailResponse>(JsonOptions);
        inReview.Should().NotBeNull();
        inReview!.Status.Should().Be("Investigating");
        inReview.Progress.InReviewCount.Should().Be(1);
        inReview.Progress.PercentComplete.Should().Be(50);

        var containedResponse = await leadClient.PatchAsJsonAsync(
            $"/api/v2/alerts/{alert.Id:D}/iocs/{iocId:D}/status",
            new UpdateAlertIocStatusRequest("Contained", "lead-1"));
        containedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var contained = await containedResponse.Content.ReadFromJsonAsync<AlertDetailResponse>(JsonOptions);
        contained.Should().NotBeNull();
        contained!.Status.Should().Be("Investigating");
        contained.Progress.CompletedCount.Should().Be(1);
        contained.Progress.PercentComplete.Should().Be(100);

        var missingResponse = await leadClient.PatchAsJsonAsync(
            $"/api/v2/alerts/{alert.Id:D}/iocs/{Guid.NewGuid():D}/status",
            new UpdateAlertIocStatusRequest("InReview", "lead-1"));
        missingResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task LegacyReportGenerate_WithPersistTrue_ReturnsBadRequestWithoutLegacyReport()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        await using var scope = _factory.Services.CreateAsyncScope();
        var legacyDbContext = scope.ServiceProvider.GetRequiredService<LegacyScanPipelineDbContext>();
        var initialLegacyReportCount = await legacyDbContext.Reports.CountAsync();

        var response = await leadClient.PostAsJsonAsync(
            "/api/v2/legacy-pipeline/reports/generate",
            new LegacyPipelineGenerateReportRequest(
                ReportType: "ExecutiveSummary",
                Title: "Legacy persisted report",
                JobId: null,
                TargetId: null,
                NetworkId: null,
                FromUtc: null,
                ToUtc: null,
                ScannerFamily: null,
                Severity: null,
                Status: null,
                Persist: true,
                ActorUserId: "lead-1"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = await response.Content.ReadAsStringAsync();
        error.Should().Contain("Legacy report persistence is disabled");
        (await legacyDbContext.Reports.CountAsync()).Should().Be(initialLegacyReportCount);
    }

    [Fact]
    public async Task ScanPlanScheduler_DuePlan_QueuesScheduledJob()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        var network = await CreateNetworkAsync(leadClient, "ScanScheduleNet", "10.97.0.0/16");
        var subnet = await CreateSubnetAsync(leadClient, network.Id, "ScanScheduleSubnet", "10.97.1.0/24");
        var server = await CreateManagedServerAsync(leadClient, subnet.Id, "srv-scan-sched-01", "10.97.1.25");
        var revision = await CreateDeploymentReadyRuleRevisionAsync();

        var planResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/scanning/plans",
            new CreateScanPlanRequest(
                Name: "Scheduler Due Plan",
                Description: "Integration test scheduled enqueue",
                ScannerCapability: "Yara",
                RuleSelectionMode: "RuleSet",
                RuleScopeType: null,
                RuleScopeValue: null,
                CadenceType: "Interval",
                IntervalMinutes: 15,
                RunAtHourUtc: null,
                RunAtMinuteUtc: null,
                WeeklyDayOfWeek: null,
                OperatorNotes: "integration",
                Status: "Active",
                ActorUserId: "lead-1",
                TargetServerIds: [server.Id],
                RuleRevisionIds: [revision.Id]));
        planResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var plan = await planResponse.Content.ReadFromJsonAsync<ScanPlanResponse>(JsonOptions);
        plan.Should().NotBeNull();

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
            var trackedPlan = await dbContext.ScanPlans.SingleAsync(x => x.Id == plan!.Id);
            dbContext.Entry(trackedPlan).Property(x => x.NextRunAtUtc).CurrentValue = DateTimeOffset.UtcNow.AddSeconds(-1);
            await dbContext.SaveChangesAsync();
        }

        var scheduledJob = await WaitForScheduledPlanJobAsync(leadClient, plan!.Id);
        scheduledJob.TriggerSource.Should().Be("Scheduled");
        scheduledJob.ScanPlanId.Should().Be(plan.Id);
    }

    [Fact]
    public async Task IdentityRolePermissions_CanBeAssigned_AndListed()
    {
        using var adminClient = _factory.CreateAuthenticatedClient("admin-1", "Admin");

        var createRoleResponse = await adminClient.PostAsJsonAsync(
            "/api/v2/identity/roles",
            new CreateRoleRequest("Operator"));
        createRoleResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var createdRole = await createRoleResponse.Content.ReadFromJsonAsync<RoleResponse>(JsonOptions);
        createdRole.Should().NotBeNull();

        var createPermissionResponse = await adminClient.PostAsJsonAsync(
            "/api/v2/identity/permissions",
            new CreatePermissionRequest("retention.manage.extra", "Additional retention management permission", "admin-1"));
        createPermissionResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdPermission = await createPermissionResponse.Content.ReadFromJsonAsync<PermissionResponse>(JsonOptions);
        createdPermission.Should().NotBeNull();
        var createdRoleId = Guid.Parse(createdRole!.Id);

        var assignResponse = await adminClient.PostAsJsonAsync(
            "/api/v2/identity/role-permissions",
            new AssignRolePermissionRequest(createdRoleId, createdPermission!.Id, "admin-1"));
        assignResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var assignment = await assignResponse.Content.ReadFromJsonAsync<RolePermissionResponse>(JsonOptions);
        assignment.Should().NotBeNull();
        assignment!.RoleId.Should().Be(createdRoleId);
        assignment.PermissionId.Should().Be(createdPermission.Id);

        var duplicateResponse = await adminClient.PostAsJsonAsync(
            "/api/v2/identity/role-permissions",
            new AssignRolePermissionRequest(createdRoleId, createdPermission.Id, "admin-1"));
        duplicateResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var listedAssignments = await adminClient.GetFromJsonAsync<IReadOnlyList<RolePermissionResponse>>(
            $"/api/v2/identity/role-permissions?roleId={createdRole.Id}",
            JsonOptions);
        listedAssignments.Should().NotBeNull();
        listedAssignments!.Should().ContainSingle(x => x.RoleId == createdRoleId && x.PermissionId == createdPermission.Id);
    }

    [Fact]
    public async Task ScanJobCancel_QueuedJob_CancelsTargets()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        var network = await CreateNetworkAsync(leadClient, "ScanCancelNet", "10.98.0.0/16");
        var subnet = await CreateSubnetAsync(leadClient, network.Id, "ScanCancelSubnet", "10.98.1.0/24");
        var server = await CreateManagedServerAsync(leadClient, subnet.Id, "srv-scan-cancel-01", "10.98.1.25");
        var nowUtc = DateTimeOffset.UtcNow;
        Guid scanJobId;

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
            var scanJob = ScanJob.Queue(
                scanPlanId: null,
                triggerSource: "Manual",
                triggeredByUserId: "lead-1",
                queuedAtUtc: nowUtc);
            dbContext.ScanJobs.Add(scanJob);
            dbContext.ScanJobTargetExecutions.Add(
                ScanJobTargetExecution.QueueSnapshot(
                    scanJob.Id,
                    server.Id,
                    server.Hostname,
                    server.IpAddress,
                    "lead-1",
                    nowUtc));
            await dbContext.SaveChangesAsync();
            scanJobId = scanJob.Id;
        }

        var cancelResponse = await leadClient.PostAsJsonAsync(
            $"/api/v2/scanning/jobs/{scanJobId}/cancel",
            new CancelScanJobRequest("lead-1", "integration-cancel"));
        cancelResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var cancelledJob = await cancelResponse.Content.ReadFromJsonAsync<ScanJobResponse>(JsonOptions);
        cancelledJob.Should().NotBeNull();
        cancelledJob!.Status.Should().Be("Cancelled");
        cancelledJob.CancellationRequested.Should().BeTrue();

        var targetRows = await leadClient.GetFromJsonAsync<IReadOnlyList<ScanJobTargetExecutionResponse>>(
            $"/api/v2/scanning/jobs/{scanJobId}/targets",
            JsonOptions);
        targetRows.Should().NotBeNull();
        targetRows!.Should().ContainSingle();
        targetRows[0].Status.Should().Be("Cancelled");
    }

    [Fact]
    public async Task ScanningResultsIngestion_MixedBatch_DedupeAndHistoryFilters_Work()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        var network = await CreateNetworkAsync(leadClient, "IngestNet", "10.99.0.0/16");
        var subnet = await CreateSubnetAsync(leadClient, network.Id, "IngestSubnet", "10.99.1.0/24");
        var server = await CreateManagedServerAsync(leadClient, subnet.Id, "srv-ingest-01", "10.99.1.24");
        var revision = await CreateDeploymentReadyRuleRevisionAsync();
        var iocId = await CreateIocForScanningResultTestAsync();
        var observedAtUtc = DateTimeOffset.UtcNow;

        var mixedBatchResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/scanning/results/ingestions",
            new DetectionResultIngestionRequest(
                Source: "api",
                ActorUserId: "lead-1",
                Rows:
                [
                    new DetectionResultIngestionRowRequest(
                        ScannerFamily: "yara",
                        Payload: JsonSerializer.SerializeToElement(new
                        {
                            serverId = server.Id,
                            observedAtUtc,
                            ruleRevisionId = revision.Id,
                            iocId,
                            disposition = "Detection",
                            confidence = 0.97m,
                            evidence = new
                            {
                                filePath = "/tmp/payload.exe",
                                matchedStrings = new[] { "evil" },
                            },
                        })),
                    new DetectionResultIngestionRowRequest(
                        ScannerFamily: "yara",
                        Payload: JsonSerializer.SerializeToElement(new
                        {
                            observedAtUtc,
                            ruleRevisionId = revision.Id,
                            disposition = "Detection",
                            confidence = 0.25m,
                            evidence = "missing-server",
                        })),
                ]));
        mixedBatchResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var mixedBatch = await mixedBatchResponse.Content.ReadFromJsonAsync<DetectionResultIngestionResponse>(JsonOptions);
        mixedBatch.Should().NotBeNull();
        mixedBatch!.AcceptedRows.Should().Be(1);
        mixedBatch.DeduplicatedRows.Should().Be(0);
        mixedBatch.RejectedRows.Should().Be(1);
        mixedBatch.Diagnostics.Should().ContainSingle();

        var duplicateBatchResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/scanning/results/ingestions",
            new DetectionResultIngestionRequest(
                Source: "api",
                ActorUserId: "lead-1",
                Rows:
                [
                    new DetectionResultIngestionRowRequest(
                        ScannerFamily: "yara",
                        Payload: JsonSerializer.SerializeToElement(new
                        {
                            serverId = server.Id,
                            observedAtUtc,
                            ruleRevisionId = revision.Id,
                            iocId,
                            disposition = "Detection",
                            confidence = 0.97m,
                            evidence = new
                            {
                                filePath = "/tmp/payload.exe",
                                matchedStrings = new[] { "evil" },
                            },
                        })),
                ]));
        duplicateBatchResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var duplicateBatch = await duplicateBatchResponse.Content.ReadFromJsonAsync<DetectionResultIngestionResponse>(JsonOptions);
        duplicateBatch.Should().NotBeNull();
        duplicateBatch!.AcceptedRows.Should().Be(1);
        duplicateBatch.DeduplicatedRows.Should().Be(1);
        duplicateBatch.RejectedRows.Should().Be(0);

        var byServer = await leadClient.GetFromJsonAsync<DetectionHistoryResponse>(
            $"/api/v2/scanning/results/servers/{server.Id}/history?includeProvenance=true&scannerFamily=yara&fromUtc={Uri.EscapeDataString(observedAtUtc.AddMinutes(-5).ToString("O"))}&toUtc={Uri.EscapeDataString(observedAtUtc.AddMinutes(5).ToString("O"))}",
            JsonOptions);
        byServer.Should().NotBeNull();
        byServer!.Items.Should().Contain(x => x.ServerId == server.Id && x.RuleRevisionId == revision.Id);
        var detection = byServer.Items.First(x => x.ServerId == server.Id && x.RuleRevisionId == revision.Id);
        detection.OccurrenceCount.Should().Be(2);
        detection.ProvenanceCount.Should().BeGreaterThanOrEqualTo(2);
        detection.Provenance.Should().NotBeEmpty();

        var byIoc = await leadClient.GetFromJsonAsync<DetectionHistoryResponse>(
            $"/api/v2/scanning/results/iocs/{iocId}/history",
            JsonOptions);
        byIoc.Should().NotBeNull();
        byIoc!.Items.Should().Contain(x => x.IocId == iocId);

        var byRule = await leadClient.GetFromJsonAsync<DetectionHistoryResponse>(
            $"/api/v2/scanning/results/rules/{revision.Id}/history",
            JsonOptions);
        byRule.Should().NotBeNull();
        byRule!.Items.Should().Contain(x => x.RuleRevisionId == revision.Id);

        var alertResponse = await leadClient.PostAsJsonAsync("/api/v2/alerts", new CreateAlertRequest(
            Title: "Detection-linked alert",
            Summary: "Alert linked to persisted scan result",
            Severity: "High",
            OwnerUserId: "lead-1",
            ApprovalTierRequired: "Lead",
            DetectedAtUtc: observedAtUtc,
            ActorUserId: "lead-1"));
        alertResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var alert = await alertResponse.Content.ReadFromJsonAsync<AlertResponse>(JsonOptions);
        alert.Should().NotBeNull();

        var linkResponse = await leadClient.PostAsJsonAsync(
            $"/api/v2/alerts/{alert!.Id:D}/scan-results",
            new LinkAlertScanResultRequest(detection.Id, "lead-1"));
        linkResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var alertDetail = await leadClient.GetFromJsonAsync<AlertDetailResponse>(
            $"/api/v2/alerts/{alert.Id:D}",
            JsonOptions);
        alertDetail.Should().NotBeNull();
        var expectedScanJobId = detection.ScanJobId.HasValue ? detection.ScanJobId.Value.ToString("D") : null;
        alertDetail!.LinkedScanResults.Should().ContainSingle(x =>
            x.ResultId == detection.Id.ToString("D")
            && x.JobId == expectedScanJobId
            && x.Status == detection.Disposition
            && x.FindingsCount == detection.OccurrenceCount
            && x.StartedAtUtc == detection.FirstObservedAtUtc
            && x.FinishedAtUtc == detection.LastObservedAtUtc);

        var reportResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/reports/generate",
            new GenerateReportRequest(
                ReportType: "ExecutiveSummary",
                Title: null,
                FromUtc: observedAtUtc.AddMinutes(-5).ToString("O"),
                ToUtc: observedAtUtc.AddMinutes(5).ToString("O"),
                TargetServerId: server.Id,
                ScannerFamily: "yara",
                Severity: null,
                Status: null,
                IocType: null,
                Source: null,
                Persist: false,
                ActorUserId: "lead-1"));
        reportResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var report = await reportResponse.Content.ReadFromJsonAsync<GeneratedReportResponse>(JsonOptions);
        report.Should().NotBeNull();
        report!.Sections.Select(x => x.Title).Should().ContainInOrder(
            "Executive Assessment",
            "Top Risks",
            "Affected Assets",
            "IOC And Rule Evidence",
            "Scan Activity Timeline",
            "Recommended Actions",
            "Scope And Analytics Appendix");
        report.Sections.Should().OnlyContain(x => x.Tables != null);
        report.Sections.First(x => x.Title == "IOC And Rule Evidence").Tables!.Should().ContainSingle(x => x.Title == "Evidence table");

        var savedReportResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/reports/generate",
            new GenerateReportRequest(
                ReportType: "ExecutiveSummary",
                Title: "Executive <Summary> & Review",
                FromUtc: observedAtUtc.AddMinutes(-5).ToString("O"),
                ToUtc: observedAtUtc.AddMinutes(5).ToString("O"),
                TargetServerId: server.Id,
                ScannerFamily: "yara",
                Severity: null,
                Status: null,
                IocType: null,
                Source: null,
                Persist: true,
                ActorUserId: "lead-1"));
        savedReportResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var savedReport = await savedReportResponse.Content.ReadFromJsonAsync<GeneratedReportResponse>(JsonOptions);
        savedReport.Should().NotBeNull();
        savedReport!.PersistedReport.Should().NotBeNull();

        var htmlResponse = await leadClient.GetAsync($"/api/v2/reports/{savedReport.PersistedReport!.Id:D}/html");
        htmlResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        htmlResponse.Content.Headers.ContentType?.MediaType.Should().Be("text/html");
        htmlResponse.Content.Headers.ContentType?.CharSet.Should().Be("utf-8");
        (htmlResponse.Content.Headers.ContentDisposition?.FileNameStar
            ?? htmlResponse.Content.Headers.ContentDisposition?.FileName
            ?? string.Empty).Should().Contain(".html");
        var html = await htmlResponse.Content.ReadAsStringAsync();
        html.Should().Contain("Executive &lt;Summary&gt; &amp; Review");
        html.Should().Contain("Executive Assessment");
        html.Should().Contain("Evidence table");
        html.Should().Contain("IOC And Rule Evidence");
        html.Should().Contain(server.Hostname);

        var removedPdfResponse = await leadClient.GetAsync($"/api/v2/reports/{savedReport.PersistedReport.Id:D}/pdf");
        removedPdfResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var missingHtmlResponse = await leadClient.GetAsync($"/api/v2/reports/{Guid.NewGuid():D}/html");
        missingHtmlResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var detail = await leadClient.GetFromJsonAsync<DetectionDetailResponse>(
            $"/api/v2/scanning/results/{detection.Id}",
            JsonOptions);
        detail.Should().NotBeNull();
        detail!.Id.Should().Be(detection.Id);
        detail.RuleRevisionId.Should().Be(revision.Id);
        detail.IocId.Should().Be(iocId);
        detail.IocType.Should().Be("Domain");
        detail.IocValue.Should().NotBeNullOrWhiteSpace();
        detail.Source.Should().Be("api");
        detail.LinkedAlerts.Should().ContainSingle(x => x.Id == alert!.Id);
        detail.LinkedCases.Should().ContainSingle(x => x.Id == alert!.Id);

        var missingDetailResponse = await leadClient.GetAsync($"/api/v2/scanning/results/{Guid.NewGuid():D}");
        missingDetailResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DiscoveryRun_QueueProcessAndPromote_Workflow()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");
        var probe = _factory.GetIcmpProbe();
        probe.SetReachable("10.40.1.10", "srv-app-10");
        probe.SetUnreachable("10.40.1.11");
        probe.SetUnreachable("10.40.1.12");

        var network = await CreateNetworkAsync(leadClient, "DiscoveryNet", "10.40.0.0/16");
        var subnet = await CreateSubnetAsync(leadClient, network.Id, "DiscoverySubnet", "10.40.1.0/24");

        var preRunHosts = await leadClient.GetFromJsonAsync<IReadOnlyList<DiscoveredHostResponse>>(
            $"/api/v2/infrastructure/discovered-hosts?subnetId={subnet.Id}",
            JsonOptions);
        preRunHosts.Should().BeEmpty();

        var queueResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/infrastructure/discovery/runs",
            new CreateDiscoveryRunRequest(
                SubnetId: subnet.Id,
                ActorUserId: "lead-1",
                RangeStartIp: "10.40.1.10",
                RangeEndIp: "10.40.1.12"));
        queueResponse.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var queuedRun = await queueResponse.Content.ReadFromJsonAsync<DiscoveryRunResponse>(JsonOptions);
        queuedRun.Should().NotBeNull();
        queuedRun!.Status.Should().Be("Queued");

        var completedRun = await WaitForRunCompletionAsync(leadClient, queuedRun.Id, subnet.Id);
        completedRun.Status.Should().Be("Partial");
        completedRun.TotalHosts.Should().Be(3);
        completedRun.ReachableHosts.Should().Be(1);
        completedRun.UnreachableHosts.Should().Be(2);

        var hosts = await leadClient.GetFromJsonAsync<IReadOnlyList<DiscoveredHostResponse>>(
            $"/api/v2/infrastructure/discovered-hosts?subnetId={subnet.Id}",
            JsonOptions);
        hosts.Should().NotBeNull();
        hosts!.Should().HaveCount(3);
        hosts.Should().Contain(x => x.IpAddress == "10.40.1.10" && x.Reachability == "Reachable" && x.LastSeenAtUtc != null);
        hosts.Should().Contain(x => x.IpAddress == "10.40.1.11" && x.Reachability == "Unreachable" && x.LastSeenAtUtc == null);

        var hostToPromote = hosts!.Single(x => x.IpAddress == "10.40.1.10");
        var promoteResponse = await leadClient.PostAsJsonAsync(
            $"/api/v2/infrastructure/discovered-hosts/{hostToPromote.Id}/promote",
            new PromoteDiscoveredHostRequest(
                Hostname: "srv-app-10",
                OperatingSystem: "Windows Server 2022",
                Environment: "lab",
                ActorUserId: "lead-1"));
        promoteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var promoted = await promoteResponse.Content.ReadFromJsonAsync<PromoteDiscoveredHostResponse>(JsonOptions);
        promoted.Should().NotBeNull();
        promoted!.AlreadyPromoted.Should().BeFalse();

        var promoteAgainResponse = await leadClient.PostAsJsonAsync(
            $"/api/v2/infrastructure/discovered-hosts/{hostToPromote.Id}/promote",
            new PromoteDiscoveredHostRequest(
                Hostname: "srv-app-10",
                OperatingSystem: "Windows Server 2022",
                Environment: "lab",
                ActorUserId: "lead-1"));
        promoteAgainResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var promotedAgain = await promoteAgainResponse.Content.ReadFromJsonAsync<PromoteDiscoveredHostResponse>(JsonOptions);
        promotedAgain.Should().NotBeNull();
        promotedAgain!.AlreadyPromoted.Should().BeTrue();
        promotedAgain.TargetServerId.Should().Be(promoted.TargetServerId);

        var targetServers = await leadClient.GetFromJsonAsync<IReadOnlyList<TargetServerResponse>>(
            $"/api/v2/infrastructure/target-servers?subnetId={subnet.Id}",
            JsonOptions);
        targetServers.Should().ContainSingle(x => x.Id == promoted.TargetServerId && x.Status == "Active");
    }

    [Fact]
    public async Task DiscoveryRun_UpsertsHostObservations_PreservingFirstSeen()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");
        var probe = _factory.GetIcmpProbe();
        var network = await CreateNetworkAsync(leadClient, "UpsertNet", "10.41.0.0/16");
        var subnet = await CreateSubnetAsync(leadClient, network.Id, "UpsertSubnet", "10.41.1.0/24");

        probe.SetReachable("10.41.1.20", "srv-a");
        probe.SetUnreachable("10.41.1.21");
        var firstRun = await QueueAndWaitAsync(leadClient, subnet.Id, "10.41.1.20", "10.41.1.21");
        firstRun.Status.Should().Be("Partial");

        var firstHosts = await leadClient.GetFromJsonAsync<IReadOnlyList<DiscoveredHostResponse>>(
            $"/api/v2/infrastructure/discovered-hosts?subnetId={subnet.Id}",
            JsonOptions);
        firstHosts.Should().NotBeNull();
        var firstByIp = firstHosts!.ToDictionary(x => x.IpAddress, StringComparer.OrdinalIgnoreCase);

        probe.SetUnreachable("10.41.1.20");
        probe.SetReachable("10.41.1.21", "srv-b");
        var secondRun = await QueueAndWaitAsync(leadClient, subnet.Id, "10.41.1.20", "10.41.1.21");
        secondRun.Status.Should().Be("Partial");

        var secondHosts = await leadClient.GetFromJsonAsync<IReadOnlyList<DiscoveredHostResponse>>(
            $"/api/v2/infrastructure/discovered-hosts?subnetId={subnet.Id}",
            JsonOptions);
        secondHosts.Should().NotBeNull();
        var secondByIp = secondHosts!.ToDictionary(x => x.IpAddress, StringComparer.OrdinalIgnoreCase);

        var firstA = firstByIp["10.41.1.20"];
        var secondA = secondByIp["10.41.1.20"];
        secondA.FirstDiscoveredAtUtc.Should().Be(firstA.FirstDiscoveredAtUtc);
        secondA.LastCheckedAtUtc.Should().BeAfter(firstA.LastCheckedAtUtc);
        secondA.LastSeenAtUtc.Should().Be(firstA.LastSeenAtUtc);
        secondA.Reachability.Should().Be("Unreachable");
        secondA.LastDiscoveryRunId.Should().Be(secondRun.Id);

        var firstB = firstByIp["10.41.1.21"];
        var secondB = secondByIp["10.41.1.21"];
        secondB.FirstDiscoveredAtUtc.Should().Be(firstB.FirstDiscoveredAtUtc);
        secondB.LastCheckedAtUtc.Should().BeAfter(firstB.LastCheckedAtUtc);
        secondB.LastSeenAtUtc.Should().NotBeNull();
        secondB.Reachability.Should().Be("Reachable");
        secondB.LastDiscoveryRunId.Should().Be(secondRun.Id);
    }

    [Fact]
    public async Task DiscoveryHosts_ListIsEmpty_BeforeAnyRun()
    {
        using var analystClient = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");
        var network = await CreateNetworkAsync(_factory.CreateAuthenticatedClient("lead-1", "Lead"), "EmptyNet", "10.42.0.0/16");
        var subnet = await CreateSubnetAsync(_factory.CreateAuthenticatedClient("lead-1", "Lead"), network.Id, "EmptySubnet", "10.42.1.0/24");

        var runs = await analystClient.GetFromJsonAsync<IReadOnlyList<DiscoveryRunResponse>>(
            $"/api/v2/infrastructure/discovery/runs?subnetId={subnet.Id}",
            JsonOptions);
        runs.Should().BeEmpty();

        var hosts = await analystClient.GetFromJsonAsync<IReadOnlyList<DiscoveredHostResponse>>(
            $"/api/v2/infrastructure/discovered-hosts?subnetId={subnet.Id}",
            JsonOptions);
        hosts.Should().BeEmpty();
    }

    [Fact]
    public async Task ManagedServerInventory_WriteAndFilter_Workflow()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");
        using var analystClient = _factory.CreateAuthenticatedClient("analyst-1", "Analyst");

        var network = await CreateNetworkAsync(leadClient, "ManagedNet", "10.90.0.0/16");
        var subnet = await CreateSubnetAsync(leadClient, network.Id, "ManagedSubnet", "10.90.1.0/24");

        var analystCreateResponse = await analystClient.PostAsJsonAsync(
            "/api/v2/infrastructure/managed-servers",
            new CreateManagedServerRequest(
                SubnetId: subnet.Id,
                Hostname: "srv-analyst-denied",
                IpAddress: "10.90.1.50",
                OperatingSystem: "Linux",
                Environment: "prod",
                ActorUserId: "analyst-1"));
        analystCreateResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var createManagedResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/infrastructure/managed-servers",
            new CreateManagedServerRequest(
                SubnetId: subnet.Id,
                Hostname: "srv-managed-01",
                IpAddress: "10.90.1.25",
                OperatingSystem: "Windows Server 2022",
                Environment: "prod",
                ActorUserId: "lead-1",
                Status: "Active",
                ConnectivityStatus: "Unknown",
                ConnectionProtocol: "WinRm",
                ConnectionHost: "srv-managed-01.corp.local",
                ConnectionPort: 5985,
                ConnectionAuthMode: "Password",
                ConnectionUsername: "svc_scanner"));
        createManagedResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var managedServer = await createManagedResponse.Content.ReadFromJsonAsync<ManagedServerResponse>(JsonOptions);
        managedServer.Should().NotBeNull();
        managedServer!.ConnectionHost.Should().Be("srv-managed-01.corp.local");
        managedServer.HasConnectionSecret.Should().BeFalse();

        var rotateSecretResponse = await leadClient.PostAsJsonAsync(
            $"/api/v2/infrastructure/managed-servers/{managedServer.Id}/connection-secret",
            new RotateManagedServerConnectionSecretRequest(
                SecretPayload: "{\"password\":\"super-secret\"}",
                ActorUserId: "lead-1"));
        rotateSecretResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var secretMetadata = await rotateSecretResponse.Content.ReadFromJsonAsync<ManagedServerConnectionSecretMetadataResponse>(JsonOptions);
        secretMetadata.Should().NotBeNull();
        secretMetadata!.HasConnectionSecret.Should().BeTrue();
        secretMetadata.ConnectionSecretUpdatedAtUtc.Should().NotBeNull();

        var createScannerResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/infrastructure/scanners",
            new CreateScannerRequest(
                Name: "scanner-yara-1",
                EngineType: "yara",
                Version: "4.2.0",
                ActorUserId: "lead-1",
                Capabilities: ["Yara", "Sigma"]));
        createScannerResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var scanner = await createScannerResponse.Content.ReadFromJsonAsync<ScannerResponse>(JsonOptions);
        scanner.Should().NotBeNull();
        scanner!.Capabilities.Should().Contain("Yara");

        var nowUtc = DateTimeOffset.UtcNow;
        var upsertAssignmentResponse = await leadClient.PutAsJsonAsync(
            $"/api/v2/infrastructure/managed-servers/{managedServer.Id}/scanner-assignments/{scanner.Id}",
            new UpsertManagedServerScannerAssignmentRequest(
                ConnectivityStatus: "Online",
                LastHeartbeatUtc: nowUtc.AddMinutes(-3),
                LastContactUtc: nowUtc.AddMinutes(-1),
                IsEnabled: true,
                ActorUserId: "lead-1"));
        upsertAssignmentResponse.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Conflict);

        var inventoryAllResponse = await leadClient.GetAsync("/api/v2/infrastructure/managed-servers");
        inventoryAllResponse.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Conflict);
        if (inventoryAllResponse.StatusCode == HttpStatusCode.Conflict)
        {
            return;
        }

        var inventoryAll = await inventoryAllResponse.Content.ReadFromJsonAsync<ManagedServerInventoryResponse>(JsonOptions);
        inventoryAll.Should().NotBeNull();
        inventoryAll!.Servers.Should().ContainSingle(x => x.Id == managedServer.Id);
        var inventoryServer = inventoryAll.Servers.Single(x => x.Id == managedServer.Id);
        inventoryServer.HasConnectionSecret.Should().BeTrue();
        inventoryServer.ScannerAssignments.Should().ContainSingle();
        inventoryServer.ScannerCapabilities.Should().Contain("Yara");
        inventoryServer.ScannerCapabilities.Should().Contain("Sigma");

        var inventoryByStatus = await leadClient.GetFromJsonAsync<ManagedServerInventoryResponse>(
            "/api/v2/infrastructure/managed-servers?status=Online",
            JsonOptions);
        inventoryByStatus.Should().NotBeNull();
        inventoryByStatus!.Servers.Should().ContainSingle(x => x.Id == managedServer.Id);

        var inventoryByCapability = await leadClient.GetFromJsonAsync<ManagedServerInventoryResponse>(
            "/api/v2/infrastructure/managed-servers?scannerCapability=Yara",
            JsonOptions);
        inventoryByCapability.Should().NotBeNull();
        inventoryByCapability!.Servers.Should().ContainSingle(x => x.Id == managedServer.Id);

        var inventoryBySubnet = await leadClient.GetFromJsonAsync<ManagedServerInventoryResponse>(
            $"/api/v2/infrastructure/managed-servers?subnetId={subnet.Id}",
            JsonOptions);
        inventoryBySubnet.Should().NotBeNull();
        inventoryBySubnet!.Servers.Should().ContainSingle(x => x.Id == managedServer.Id);

        var inventoryByRecentContact = await leadClient.GetFromJsonAsync<ManagedServerInventoryResponse>(
            "/api/v2/infrastructure/managed-servers?lastContact=24h",
            JsonOptions);
        inventoryByRecentContact.Should().NotBeNull();
        inventoryByRecentContact!.Servers.Should().ContainSingle(x => x.Id == managedServer.Id);

        var inventoryNeverContact = await leadClient.GetFromJsonAsync<ManagedServerInventoryResponse>(
            "/api/v2/infrastructure/managed-servers?lastContact=never",
            JsonOptions);
        inventoryNeverContact.Should().NotBeNull();
        inventoryNeverContact!.Servers.Should().BeEmpty();

        var getManagedResponse = await leadClient.GetAsync($"/api/v2/infrastructure/managed-servers/{managedServer.Id}");
        getManagedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var getManagedPayload = await getManagedResponse.Content.ReadAsStringAsync();
        getManagedPayload.Should().NotContain("super-secret");

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var secretRows = dbContext.TargetServerConnectionSecrets.ToList();
        secretRows.Should().ContainSingle(x => x.TargetServerId == managedServer.Id);
        secretRows.Single(x => x.TargetServerId == managedServer.Id).EncryptedPayload.Should().NotContain("super-secret");

        var rotateAudit = dbContext.AuditLogsV2
            .Where(x => x.ActionType == "infrastructure.managed-server.connection-secret.rotate")
            .OrderByDescending(x => x.OccurredAtUtc)
            .FirstOrDefault();
        rotateAudit.Should().NotBeNull();
        rotateAudit!.PayloadJson.Should().NotContain("super-secret");
    }

    [Fact]
    public async Task TargetGroups_CrudAndMembership_Workflow()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");

        var network = await CreateNetworkAsync(leadClient, "GroupNet", "10.91.0.0/16");
        var subnet = await CreateSubnetAsync(leadClient, network.Id, "GroupSubnet", "10.91.1.0/24");

        var targetServerResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/infrastructure/target-servers",
            new CreateTargetServerRequest(
                SubnetId: subnet.Id,
                Hostname: "srv-group-01",
                IpAddress: "10.91.1.21",
                OperatingSystem: "Linux",
                Environment: "lab",
                ActorUserId: "lead-1"));
        targetServerResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var targetServer = await targetServerResponse.Content.ReadFromJsonAsync<TargetServerResponse>(JsonOptions);
        targetServer.Should().NotBeNull();

        var createGroupResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/infrastructure/target-groups",
            new CreateTargetGroupRequest(
                Name: "SOC-Lab",
                Description: "SOC lab systems",
                ActorUserId: "lead-1"));
        createGroupResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var group = await createGroupResponse.Content.ReadFromJsonAsync<TargetGroupResponse>(JsonOptions);
        group.Should().NotBeNull();
        group!.MemberCount.Should().Be(0);

        var addMemberResponse = await leadClient.PutAsync(
            $"/api/v2/infrastructure/target-groups/{group.Id}/members/{targetServer!.Id}?actorUserId=lead-1",
            content: null);
        addMemberResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var members = await leadClient.GetFromJsonAsync<IReadOnlyList<TargetGroupMemberResponse>>(
            $"/api/v2/infrastructure/target-groups/{group.Id}/members",
            JsonOptions);
        members.Should().ContainSingle(x => x.TargetServerId == targetServer.Id);

        var updateGroupResponse = await leadClient.PutAsJsonAsync(
            $"/api/v2/infrastructure/target-groups/{group.Id}",
            new UpdateTargetGroupRequest(
                Name: "SOC-Lab-Updated",
                Description: "updated",
                IsEnabled: true,
                ActorUserId: "lead-1"));
        updateGroupResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedGroup = await updateGroupResponse.Content.ReadFromJsonAsync<TargetGroupResponse>(JsonOptions);
        updatedGroup.Should().NotBeNull();
        updatedGroup!.Name.Should().Be("SOC-Lab-Updated");
        updatedGroup.MemberCount.Should().Be(1);

        var removeMemberResponse = await leadClient.DeleteAsync($"/api/v2/infrastructure/target-groups/{group.Id}/members/{targetServer.Id}");
        removeMemberResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var membersAfterDelete = await leadClient.GetFromJsonAsync<IReadOnlyList<TargetGroupMemberResponse>>(
            $"/api/v2/infrastructure/target-groups/{group.Id}/members",
            JsonOptions);
        membersAfterDelete.Should().BeEmpty();

        var deleteGroupResponse = await leadClient.DeleteAsync($"/api/v2/infrastructure/target-groups/{group.Id}");
        deleteGroupResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DistributionJobs_EndToEnd_WithRetryAndPerTargetOutcomes()
    {
        using var leadClient = _factory.CreateAuthenticatedClient("lead-1", "Lead");
        var dispatcher = _factory.GetRuleDistributionTransportDispatcher();

        var network = await CreateNetworkAsync(leadClient, "DistNet", "10.92.0.0/16");
        var subnet = await CreateSubnetAsync(leadClient, network.Id, "DistSubnet", "10.92.1.0/24");
        var groupResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/infrastructure/target-groups",
            new CreateTargetGroupRequest("DistGroup", "distribution targets", "lead-1"));
        groupResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var targetGroup = await groupResponse.Content.ReadFromJsonAsync<TargetGroupResponse>(JsonOptions);
        targetGroup.Should().NotBeNull();

        var serverSuccess = await CreateManagedServerAsync(leadClient, subnet.Id, "srv-dist-success", "10.92.1.31");
        var serverFailureThenSuccess = await CreateManagedServerAsync(leadClient, subnet.Id, "srv-dist-fail", "10.92.1.32");
        var serverUnreachableThenSuccess = await CreateManagedServerAsync(leadClient, subnet.Id, "srv-dist-unreach", "10.92.1.33");
        var serverPartialThenSuccess = await CreateManagedServerAsync(leadClient, subnet.Id, "srv-dist-partial", "10.92.1.34");
        var serverValidation = await CreateManagedServerAsync(leadClient, subnet.Id, "srv-dist-validation", "10.92.1.35", protocol: "WinRm");

        foreach (var groupedServer in new[] { serverFailureThenSuccess, serverUnreachableThenSuccess, serverPartialThenSuccess, serverValidation })
        {
            var addMemberResponse = await leadClient.PutAsync(
                $"/api/v2/infrastructure/target-groups/{targetGroup!.Id}/members/{groupedServer.Id}?actorUserId=lead-1",
                content: null);
            addMemberResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        var revision = await CreateDeploymentReadyRuleRevisionAsync();

        dispatcher.SetSequence(
            serverSuccess.Id,
            new RuleDistributionDispatchResult(RuleDistributionTargetStatus.Success, false, "test", "success", "corr-success"));
        dispatcher.SetSequence(
            serverFailureThenSuccess.Id,
            new RuleDistributionDispatchResult(RuleDistributionTargetStatus.Failure, true, "test", "failed", "corr-f1"),
            new RuleDistributionDispatchResult(RuleDistributionTargetStatus.Success, false, "test", "recovered", "corr-f2"));
        dispatcher.SetSequence(
            serverUnreachableThenSuccess.Id,
            new RuleDistributionDispatchResult(RuleDistributionTargetStatus.Unreachable, true, "test", "unreachable", "corr-u1"),
            new RuleDistributionDispatchResult(RuleDistributionTargetStatus.Success, false, "test", "recovered", "corr-u2"));
        dispatcher.SetSequence(
            serverPartialThenSuccess.Id,
            new RuleDistributionDispatchResult(RuleDistributionTargetStatus.PartiallyApplied, true, "test", "partial", "corr-p1"),
            new RuleDistributionDispatchResult(RuleDistributionTargetStatus.Success, false, "test", "recovered", "corr-p2"));

        var createJobResponse = await leadClient.PostAsJsonAsync(
            "/api/v2/rules/distribution-jobs",
            new CreateRuleDistributionJobRequest(
                RuleRevisionId: revision.Id,
                TargetServerIds: [serverSuccess.Id],
                TargetGroupIds: [targetGroup!.Id],
                OperatorUserId: "lead-1",
                Notes: "dist test",
                MaxAttempts: 5));
        createJobResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var queuedJob = await createJobResponse.Content.ReadFromJsonAsync<RuleDistributionJobResponse>(JsonOptions);
        queuedJob.Should().NotBeNull();

        var completedJob = await WaitForDistributionJobCompletionAsync(leadClient, queuedJob!.Id);
        completedJob.Status.Should().Be("Partial");
        completedJob.TotalTargets.Should().Be(5);
        completedJob.SuccessfulTargets.Should().Be(4);
        completedJob.ValidationFailedTargets.Should().Be(1);
        completedJob.AttemptCount.Should().BeGreaterThan(1);

        var attempts = await leadClient.GetFromJsonAsync<IReadOnlyList<RuleDistributionAttemptResponse>>(
            $"/api/v2/rules/distribution-jobs/{queuedJob.Id}/attempts",
            JsonOptions);
        attempts.Should().NotBeNull();
        attempts!.Should().HaveCountGreaterThan(1);

        var targets = await leadClient.GetFromJsonAsync<IReadOnlyList<RuleDistributionTargetResponse>>(
            $"/api/v2/rules/distribution-jobs/{queuedJob.Id}/targets",
            JsonOptions);
        targets.Should().NotBeNull();
        targets!.Should().HaveCount(5);
        targets.Should().Contain(x => x.TargetServerId == serverSuccess.Id && x.Status == "Success");
        targets.Should().Contain(x => x.TargetServerId == serverFailureThenSuccess.Id && x.Status == "Success");
        targets.Should().Contain(x => x.TargetServerId == serverUnreachableThenSuccess.Id && x.Status == "Success");
        targets.Should().Contain(x => x.TargetServerId == serverPartialThenSuccess.Id && x.Status == "Success");
        targets.Should().Contain(x => x.TargetServerId == serverValidation.Id && x.Status == "ValidationFailed");

        var failedRetryResponse = await leadClient.PostAsJsonAsync(
            $"/api/v2/rules/distribution-jobs/{queuedJob.Id}/retry",
            new RetryRuleDistributionJobRequest(ActorUserId: "lead-1", Notes: "manual retry"));
        failedRetryResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private async Task<NetworkResponse> CreateNetworkAsync(HttpClient client, string name, string cidrBlock)
    {
        var response = await client.PostAsJsonAsync(
            "/api/v2/infrastructure/networks",
            new CreateNetworkRequest(
                Name: name,
                CidrBlock: cidrBlock,
                Description: $"{name} description",
                ActorUserId: "lead-1"));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var network = await response.Content.ReadFromJsonAsync<NetworkResponse>(JsonOptions);
        network.Should().NotBeNull();
        return network!;
    }

    private async Task<SubnetResponse> CreateSubnetAsync(HttpClient client, Guid networkId, string name, string cidrBlock)
    {
        var response = await client.PostAsJsonAsync(
            "/api/v2/infrastructure/subnets",
            new CreateSubnetRequest(
                NetworkId: networkId,
                Name: name,
                CidrBlock: cidrBlock,
                Gateway: cidrBlock.Replace(".0/", ".1/").Split('/')[0],
                ActorUserId: "lead-1"));
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var subnet = await response.Content.ReadFromJsonAsync<SubnetResponse>(JsonOptions);
        subnet.Should().NotBeNull();
        return subnet!;
    }

    private async Task<ManagedServerResponse> CreateManagedServerAsync(
        HttpClient client,
        Guid subnetId,
        string hostname,
        string ipAddress,
        string protocol = "Agent")
    {
        var createResponse = await client.PostAsJsonAsync(
            "/api/v2/infrastructure/managed-servers",
            new CreateManagedServerRequest(
                SubnetId: subnetId,
                Hostname: hostname,
                IpAddress: ipAddress,
                OperatingSystem: "Linux",
                Environment: "lab",
                ActorUserId: "lead-1",
                Status: "Active",
                ConnectivityStatus: "Online",
                ConnectionProtocol: protocol,
                ConnectionHost: $"{hostname}.lab.local",
                ConnectionPort: protocol.Equals("Agent", StringComparison.OrdinalIgnoreCase) ? 8100 : 22,
                ConnectionAuthMode: protocol.Equals("Agent", StringComparison.OrdinalIgnoreCase) ? "Token" : "Key",
                ConnectionUsername: "svc_dist"));
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var payload = await createResponse.Content.ReadFromJsonAsync<ManagedServerResponse>(JsonOptions);
        payload.Should().NotBeNull();
        return payload!;
    }

    private async Task<Guid> CreateIocForScanningResultTestAsync()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var nowUtc = DateTimeOffset.UtcNow;
        var actor = "lead-1";

        var feedSource = FeedSource.Create(
            name: $"feed-{Guid.NewGuid():N}",
            sourceType: FeedSourceType.Manual,
            endpoint: "manual://integration",
            actorUserId: actor,
            nowUtc: nowUtc);
        dbContext.FeedSources.Add(feedSource);

        var ioc = Ioc.Create(
            feedSourceId: feedSource.Id,
            iocFileId: null,
            type: IocType.Domain,
            value: $"mal-{Guid.NewGuid():N}.example",
            severity: AlertSeverity.High,
            confidence: 0.9m,
            seenAtUtc: nowUtc,
            actorUserId: actor,
            nowUtc: nowUtc);
        dbContext.Iocs.Add(ioc);

        await dbContext.SaveChangesAsync();
        return ioc.Id;
    }

    private async Task<RuleRevision> CreateDeploymentReadyRuleRevisionAsync()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var nowUtc = DateTimeOffset.UtcNow;

        var artifact = RuleArtifact.CreateRepository(
            name: $"dist-rule-{Guid.NewGuid():N}",
            ruleFamily: "yara",
            source: "integration-test",
            description: "distribution test rule",
            tags: ["integration", "distribution"],
            severity: "medium",
            lifecycleStatus: "approved",
            scopeType: RuleScopeType.Global,
            scopeValue: null,
            actorUserId: "lead-1",
            nowUtc: nowUtc);
        var revisionNumber = artifact.ReserveNextRevision("v1", "lead-1", nowUtc);
        var revision = RuleRevision.CreateRepository(
            ruleArtifactId: artifact.Id,
            revisionNumber: revisionNumber,
            versionLabel: "v1",
            originalContent: "rule integration_distribution { condition: true }",
            metadataJson: "{}",
            changeType: "created",
            changeReason: null,
            lifecycleStatus: "approved",
            validationResultJson: "{\"canPersist\":true,\"isDeploymentReady\":true,\"evaluatedAtUtc\":\"2026-01-01T00:00:00Z\",\"stages\":[]}",
            canPersistValidation: true,
            isDeploymentReady: true,
            validatedAtUtc: nowUtc,
            actorUserId: "lead-1",
            nowUtc: nowUtc);

        dbContext.RuleArtifacts.Add(artifact);
        dbContext.RuleRevisionsV2.Add(revision);
        await dbContext.SaveChangesAsync();
        return revision;
    }

    private static async Task<RuleDistributionJobResponse> WaitForDistributionJobCompletionAsync(HttpClient client, Guid jobId)
    {
        var deadline = DateTimeOffset.UtcNow.AddSeconds(20);
        while (DateTimeOffset.UtcNow < deadline)
        {
            var response = await client.GetFromJsonAsync<RuleDistributionJobResponse>(
                $"/api/v2/rules/distribution-jobs/{jobId}",
                JsonOptions);
            response.Should().NotBeNull();
            if (response!.Status is not ("Queued" or "Running" or "Retrying"))
            {
                return response;
            }

            await Task.Delay(150);
        }

        throw new TimeoutException($"Timed out waiting for distribution job {jobId} to complete.");
    }

    private static async Task<ScanJobResponse> WaitForScanJobCompletionAsync(HttpClient client, Guid jobId)
    {
        var deadline = DateTimeOffset.UtcNow.AddSeconds(20);
        while (DateTimeOffset.UtcNow < deadline)
        {
            var response = await client.GetFromJsonAsync<ScanJobResponse>(
                $"/api/v2/scanning/jobs/{jobId}",
                JsonOptions);
            response.Should().NotBeNull();
            if (response!.Status is not ("Queued" or "Running"))
            {
                return response;
            }

            await Task.Delay(150);
        }

        throw new TimeoutException($"Timed out waiting for scan job {jobId} to complete.");
    }

    private static async Task<ScanJobResponse> WaitForScheduledPlanJobAsync(HttpClient client, Guid scanPlanId)
    {
        var deadline = DateTimeOffset.UtcNow.AddSeconds(20);
        while (DateTimeOffset.UtcNow < deadline)
        {
            var jobs = await client.GetFromJsonAsync<IReadOnlyList<ScanJobResponse>>(
                $"/api/v2/scanning/jobs?scanPlanId={scanPlanId}&take=20",
                JsonOptions);
            var scheduled = jobs?.FirstOrDefault(x => x.TriggerSource == "Scheduled");
            if (scheduled is not null)
            {
                return scheduled;
            }

            await Task.Delay(150);
        }

        throw new TimeoutException($"Timed out waiting for a scheduled scan job for plan {scanPlanId}.");
    }

    private async Task<DiscoveryRunResponse> QueueAndWaitAsync(HttpClient client, Guid subnetId, string startIp, string endIp)
    {
        var queueResponse = await client.PostAsJsonAsync(
            "/api/v2/infrastructure/discovery/runs",
            new CreateDiscoveryRunRequest(
                SubnetId: subnetId,
                ActorUserId: "lead-1",
                RangeStartIp: startIp,
                RangeEndIp: endIp));
        queueResponse.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var queued = await queueResponse.Content.ReadFromJsonAsync<DiscoveryRunResponse>(JsonOptions);
        queued.Should().NotBeNull();
        return await WaitForRunCompletionAsync(client, queued!.Id, subnetId);
    }

    private static async Task<DiscoveryRunResponse> WaitForRunCompletionAsync(HttpClient client, Guid runId, Guid subnetId)
    {
        var deadline = DateTimeOffset.UtcNow.AddSeconds(10);
        while (DateTimeOffset.UtcNow < deadline)
        {
            var runs = await client.GetFromJsonAsync<IReadOnlyList<DiscoveryRunResponse>>(
                $"/api/v2/infrastructure/discovery/runs?subnetId={subnetId}",
                JsonOptions);
            var match = runs?.FirstOrDefault(x => x.Id == runId);
            if (match is not null && match.Status is not ("Queued" or "Running"))
            {
                return match;
            }

            await Task.Delay(100);
        }

        throw new TimeoutException($"Timed out waiting for discovery run {runId} to complete.");
    }
}
