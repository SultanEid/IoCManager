using System.Net;
using System.Text;
using System.Text.Json;
using Backend.Api.Infrastructure;
using Backend.Api.Infrastructure.Execution;
using Backend.Domain.IocManager;
using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Backend.Tests.Infrastructure;

public sealed class ScanExecutionDispatcherTests
{
    [Theory]
    [InlineData(ScannerCapability.Yara, "Yara", "yara")]
    [InlineData(ScannerCapability.Snort, "Snort", "snort")]
    [InlineData(ScannerCapability.Suricata, "Suricata", "suricata")]
    public async Task DispatchAsync_BuildsExpectedRequestPayload_ForExecutableFamilies(
        ScannerCapability capability,
        string expectedFamily,
        string expectedBlock)
    {
        var handler = new RecordingHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"status\":\"success\",\"message\":\"accepted\"}", Encoding.UTF8, "application/json"),
            }));

        var dispatcher = CreateDispatcher(handler);
        var fixture = CreateFixture();

        var result = await dispatcher.DispatchAsync(
            fixture.ScanJob,
            fixture.TargetExecution,
            fixture.TargetServer,
            fixture.Scanner,
            fixture.Assignment,
            capability,
            fixture.ConnectionSecret,
            [fixture.RuleRevision],
            CancellationToken.None);

        result.Status.Should().Be(ScanJobTargetExecutionStatus.Completed);
        handler.Requests.Should().HaveCount(1);
        var request = handler.Requests[0];

        using var payload = JsonDocument.Parse(request.Body ?? "{}");
        var root = payload.RootElement;
        root.GetProperty("scanJobId").GetGuid().Should().Be(fixture.ScanJob.Id);
        root.GetProperty("targetExecutionId").GetGuid().Should().Be(fixture.TargetExecution.Id);
        root.GetProperty("capability").GetString().Should().Be(capability.ToString());
        root.GetProperty("readOnly").GetBoolean().Should().BeTrue();

        var targetServer = root.GetProperty("targetServer");
        targetServer.GetProperty("id").GetGuid().Should().Be(fixture.TargetServer.Id);
        targetServer.GetProperty("hostname").GetString().Should().Be(fixture.TargetServer.Hostname);

        var scanner = root.GetProperty("scanner");
        scanner.GetProperty("id").GetGuid().Should().Be(fixture.Scanner.Id);
        scanner.GetProperty("name").GetString().Should().Be(fixture.Scanner.Name);

        var rules = root.GetProperty("rules").EnumerateArray().ToArray();
        rules.Should().HaveCount(1);
        var contract = rules[0].GetProperty("executionContract");
        contract.GetProperty("family").GetString().Should().Be(expectedFamily);
        contract.TryGetProperty(expectedBlock, out _).Should().BeTrue();

        request.Uri.Should().NotBeNull();
    }

    [Theory]
    [InlineData("success", ScanJobTargetExecutionStatus.Completed)]
    [InlineData("partial", ScanJobTargetExecutionStatus.PartiallyCompleted)]
    [InlineData("failure", ScanJobTargetExecutionStatus.Failed)]
    [InlineData("unsupported", ScanJobTargetExecutionStatus.Failed)]
    [InlineData("unreachable", ScanJobTargetExecutionStatus.Failed)]
    public async Task DispatchAsync_MapsConnectorStatusToTargetExecutionStatus(
        string connectorStatus,
        ScanJobTargetExecutionStatus expectedStatus)
    {
        var handler = new RecordingHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    $"{{\"status\":\"{connectorStatus}\",\"message\":\"connector-message\",\"correlationId\":\"corr-1\"}}",
                    Encoding.UTF8,
                    "application/json"),
            }));

        var dispatcher = CreateDispatcher(handler);
        var fixture = CreateFixture();

        var result = await dispatcher.DispatchAsync(
            fixture.ScanJob,
            fixture.TargetExecution,
            fixture.TargetServer,
            fixture.Scanner,
            fixture.Assignment,
            ScannerCapability.Yara,
            fixture.ConnectionSecret,
            [fixture.RuleRevision],
            CancellationToken.None);

        result.Status.Should().Be(expectedStatus);
        result.CorrelationId.Should().Be("corr-1");
    }

    [Fact]
    public async Task DispatchAsync_HandlesTimeoutAsFailure()
    {
        var handler = new RecordingHttpMessageHandler(async (_, cancellationToken) =>
        {
            await Task.Delay(TimeSpan.FromSeconds(10), cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"status\":\"success\"}", Encoding.UTF8, "application/json"),
            };
        });

        var dispatcher = CreateDispatcher(handler, new ScanExecutionOptions
        {
            SchedulerIntervalSeconds = 15,
            HttpTimeoutSeconds = 1,
            AgentEndpointPath = "/api/v1/scans/execute",
            MaxRawOutputChars = 16_000,
            MaxResultFiles = 32,
            MaxFindings = 256,
            WorkerActorUserId = "system-scan-worker",
        });
        var fixture = CreateFixture();

        var result = await dispatcher.DispatchAsync(
            fixture.ScanJob,
            fixture.TargetExecution,
            fixture.TargetServer,
            fixture.Scanner,
            fixture.Assignment,
            ScannerCapability.Yara,
            fixture.ConnectionSecret,
            [fixture.RuleRevision],
            CancellationToken.None);

        result.Status.Should().Be(ScanJobTargetExecutionStatus.Failed);
        result.ErrorMessage.Should().Contain("timed out");
    }

    [Fact]
    public async Task DispatchAsync_MapsAuthFailuresToFailedStatus()
    {
        var handler = new RecordingHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.Unauthorized)
            {
                Content = new StringContent("{\"message\":\"invalid token\"}", Encoding.UTF8, "application/json"),
            }));
        var dispatcher = CreateDispatcher(handler);
        var fixture = CreateFixture();

        var result = await dispatcher.DispatchAsync(
            fixture.ScanJob,
            fixture.TargetExecution,
            fixture.TargetServer,
            fixture.Scanner,
            fixture.Assignment,
            ScannerCapability.Yara,
            fixture.ConnectionSecret,
            [fixture.RuleRevision],
            CancellationToken.None);

        result.Status.Should().Be(ScanJobTargetExecutionStatus.Failed);
        result.ErrorMessage.Should().Contain("authentication failed");
    }

    [Fact]
    public async Task DispatchAsync_RejectsInvalidConnectorPayload()
    {
        var handler = new RecordingHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("not-json", Encoding.UTF8, "application/json"),
            }));
        var dispatcher = CreateDispatcher(handler);
        var fixture = CreateFixture();

        var result = await dispatcher.DispatchAsync(
            fixture.ScanJob,
            fixture.TargetExecution,
            fixture.TargetServer,
            fixture.Scanner,
            fixture.Assignment,
            ScannerCapability.Yara,
            fixture.ConnectionSecret,
            [fixture.RuleRevision],
            CancellationToken.None);

        result.Status.Should().Be(ScanJobTargetExecutionStatus.Failed);
        result.ErrorMessage.Should().Contain("invalid JSON payload");
    }

    [Fact]
    public async Task DispatchAsync_HandlesHttpRequestExceptionAsFailure()
    {
        var handler = new RecordingHttpMessageHandler((_, _) =>
            throw new HttpRequestException("connection refused"));
        var dispatcher = CreateDispatcher(handler);
        var fixture = CreateFixture();

        var result = await dispatcher.DispatchAsync(
            fixture.ScanJob,
            fixture.TargetExecution,
            fixture.TargetServer,
            fixture.Scanner,
            fixture.Assignment,
            ScannerCapability.Yara,
            fixture.ConnectionSecret,
            [fixture.RuleRevision],
            CancellationToken.None);

        result.Status.Should().Be(ScanJobTargetExecutionStatus.Failed);
        result.ErrorMessage.Should().Contain("Connector request failed");
    }

    [Fact]
    public async Task DispatchAsync_SigmaReturnsExplicitLimitationWithoutDispatching()
    {
        var handler = new RecordingHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"status\":\"success\"}", Encoding.UTF8, "application/json"),
            }));
        var dispatcher = CreateDispatcher(handler);
        var fixture = CreateFixture();

        var result = await dispatcher.DispatchAsync(
            fixture.ScanJob,
            fixture.TargetExecution,
            fixture.TargetServer,
            fixture.Scanner,
            fixture.Assignment,
            ScannerCapability.Sigma,
            fixture.ConnectionSecret,
            [fixture.RuleRevision],
            CancellationToken.None);

        result.Status.Should().Be(ScanJobTargetExecutionStatus.Failed);
        result.ErrorMessage.Should().Contain("Sigma");
        handler.Requests.Should().BeEmpty();
    }

    private static ScanExecutionDispatcher CreateDispatcher(
        HttpMessageHandler handler,
        ScanExecutionOptions? options = null)
    {
        var services = new ServiceCollection();
        services.AddDataProtection();
        using var provider = services.BuildServiceProvider();
        var dataProtection = provider.GetRequiredService<IDataProtectionProvider>();
        var protector = new TargetServerConnectionSecretProtector(dataProtection);

        var httpClient = new HttpClient(handler)
        {
            Timeout = TimeSpan.FromSeconds(30),
        };
        var factory = new StubHttpClientFactory(httpClient);
        var monitor = new StaticOptionsMonitor<ScanExecutionOptions>(options ?? new ScanExecutionOptions
        {
            SchedulerIntervalSeconds = 15,
            HttpTimeoutSeconds = 10,
            AgentEndpointPath = "/api/v1/scans/execute",
            MaxRawOutputChars = 16_000,
            MaxResultFiles = 32,
            MaxFindings = 256,
            WorkerActorUserId = "system-scan-worker",
        });

        return new ScanExecutionDispatcher(
            protector,
            factory,
            new PassthroughLegacyScriptScanExecutor(),
            monitor,
            NullLogger<ScanExecutionDispatcher>.Instance);
    }

    private static DispatchFixture CreateFixture()
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var targetServer = TargetServer.Create(
            subnetId: Guid.NewGuid(),
            hostname: "srv-lab-01",
            ipAddress: "10.70.1.10",
            operatingSystem: "Linux",
            environment: "lab",
            actorUserId: "tester",
            nowUtc: nowUtc,
            connectionProtocol: ConnectionProtocol.Agent,
            connectionHost: "connector.lab.local",
            connectionPort: 8100,
            connectionAuthMode: ConnectionAuthMode.Token,
            connectionUsername: "svc_scan");
        targetServer.UpdateConnectivity(ConnectivityStatus.Online, nowUtc, nowUtc, "tester", nowUtc);

        var scanner = Scanner.Create("scan-agent-1", "yara", "1.0.0", "tester", nowUtc);
        scanner.Heartbeat(ScannerHealthStatus.Healthy, "tester", nowUtc);

        var assignment = TargetServerScannerAssignment.Create(
            targetServer.Id,
            scanner.Id,
            ConnectivityStatus.Online,
            nowUtc,
            nowUtc,
            isEnabled: true,
            actorUserId: "tester",
            nowUtc: nowUtc);

        var scanJob = ScanJob.Queue(Guid.NewGuid(), "Manual", "tester", nowUtc);
        var targetExecution = ScanJobTargetExecution.QueueSnapshot(
            scanJob.Id,
            targetServer.Id,
            targetServer.Hostname,
            targetServer.IpAddress,
            "tester",
            nowUtc);

        var ruleRevision = RuleRevision.CreateRepository(
            ruleArtifactId: Guid.NewGuid(),
            revisionNumber: 1,
            versionLabel: "v1",
            originalContent: "rule demo { condition: true }",
            metadataJson: "{}",
            changeType: "created",
            changeReason: null,
            lifecycleStatus: "approved",
            validationResultJson: "{}",
            canPersistValidation: true,
            isDeploymentReady: true,
            validatedAtUtc: nowUtc,
            actorUserId: "tester",
            nowUtc: nowUtc);

        return new DispatchFixture(
            ScanJob: scanJob,
            TargetExecution: targetExecution,
            TargetServer: targetServer,
            Scanner: scanner,
            Assignment: assignment,
            RuleRevision: ruleRevision,
            ConnectionSecret: null);
    }

    private sealed record DispatchFixture(
        ScanJob ScanJob,
        ScanJobTargetExecution TargetExecution,
        TargetServer TargetServer,
        Scanner Scanner,
        TargetServerScannerAssignment Assignment,
        RuleRevision RuleRevision,
        TargetServerConnectionSecret? ConnectionSecret);

    private sealed record CapturedRequest(
        HttpMethod Method,
        Uri? Uri,
        string? Body,
        IReadOnlyDictionary<string, string> Headers);

    private sealed class RecordingHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _responseFactory;

        public RecordingHttpMessageHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        public List<CapturedRequest> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var body = request.Content is null
                ? null
                : await request.Content.ReadAsStringAsync(cancellationToken);
            var headers = request.Headers
                .ToDictionary(
                    x => x.Key,
                    x => string.Join(",", x.Value),
                    StringComparer.OrdinalIgnoreCase);

            Requests.Add(new CapturedRequest(request.Method, request.RequestUri, body, headers));
            return await _responseFactory(request, cancellationToken);
        }
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;

        public StubHttpClientFactory(HttpClient client)
        {
            _client = client;
        }

        public HttpClient CreateClient(string name)
        {
            _ = name;
            return _client;
        }
    }

    private sealed class PassthroughLegacyScriptScanExecutor : ILegacyScriptScanExecutor
    {
        public Task<LegacyScriptDispatchAttempt> TryExecuteAsync(
            ScanJob scanJob,
            ScanJobTargetExecution targetExecution,
            TargetServer targetServer,
            ScannerCapability capability,
            TargetServerConnectionSecret? connectionSecret,
            IReadOnlyList<RuleRevision> effectiveRules,
            CancellationToken cancellationToken)
        {
            _ = scanJob;
            _ = targetExecution;
            _ = targetServer;
            _ = capability;
            _ = connectionSecret;
            _ = effectiveRules;
            cancellationToken.ThrowIfCancellationRequested();
            return Task.FromResult(LegacyScriptDispatchAttempt.NotHandled);
        }
    }

    private sealed class StaticOptionsMonitor<T> : IOptionsMonitor<T>
    {
        public StaticOptionsMonitor(T currentValue)
        {
            CurrentValue = currentValue;
        }

        public T CurrentValue { get; }

        public T Get(string? name)
        {
            _ = name;
            return CurrentValue;
        }

        public IDisposable OnChange(Action<T, string?> listener)
        {
            _ = listener;
            return NullDisposable.Instance;
        }

        private sealed class NullDisposable : IDisposable
        {
            public static NullDisposable Instance { get; } = new();

            public void Dispose()
            {
            }
        }
    }
}
