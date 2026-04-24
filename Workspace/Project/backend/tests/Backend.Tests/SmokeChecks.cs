using Backend.Domain.Common;
using Backend.Domain.Rules;

namespace Backend.Tests;

internal static class SmokeChecks
{
    private sealed record SmokeCase(string Name, Func<Task> RunAsync);

    public static async Task<int> RunAsync()
    {
        var checks = new[]
        {
            new SmokeCase("rule-family catalog exposes suricata canonically", RuleFamilyCatalog_ExposesSuricataCanonicallyAsync),
            new SmokeCase("rule record persists suricata", RuleRecord_Create_PersistsSuricataAsync),
            new SmokeCase("rule validation source enforces suricata heuristics", RuleValidationSource_EnforcesSuricataHeuristicsAsync),
            new SmokeCase("rule validation source rejects unsupported family", RuleValidationSource_RejectsUnsupportedFamilyAsync),
            new SmokeCase("scan dispatcher source maps suricata execution contract", ScanDispatcherSource_MapsSuricataAsync),
            new SmokeCase("result ingestion registers suricata normalizer", ResultIngestionSource_RegistersSuricataNormalizerAsync),
            new SmokeCase("migration rewrites loki rows to suricata", Migration_RewritesLokiToSuricataAsync),
            new SmokeCase("legacy scanner parser is available for compatibility migration", LegacyScannerParser_IsAvailableAsync),
            new SmokeCase("legacy scanner extractor is wired into scan ingestion flow", LegacyScannerExtractor_IsWiredAsync),
            new SmokeCase("discovery uses dns enrichment and optional script sweep", Discovery_UsesDnsAndScriptSweepAsync),
            new SmokeCase("scan dispatch prefers legacy scripts before connector fallback", ScanDispatch_PrefersLegacyScriptsAsync),
            new SmokeCase("legacy Azure compatibility reader is available for incremental fallback", LegacyAzureCompatibilityReader_IsAvailableAsync),
            new SmokeCase("controllers fall back to legacy Azure reads for mapped surfaces", Controllers_UseLegacyAzureFallbackAsync),
            new SmokeCase("job runs repository degrades cleanly when legacy db lacks job_run_records", JobRunsRepository_UsesMissingTableGuardAsync),
            new SmokeCase("retraining repositories guard missing feedback and decision tables", RetrainingRepositories_UseMissingTableGuardsAsync),
            new SmokeCase("ai decision contracts carry safety diagnostics end to end", AiDecisionContracts_CarrySafetyDiagnosticsAsync),
            new SmokeCase("obsolete ai decision parser has been removed", ObsoleteAiDecisionParser_IsRemovedAsync),
            new SmokeCase("authorization policy catalog enforces admin it analyst dev scopes", AuthorizationPolicies_EnforceRoleScopesAsync),
            new SmokeCase("v2 controllers use updated role policies for alerts retention audit and infrastructure", V2Controllers_UseUpdatedRolePoliciesAsync),
            new SmokeCase("identity bootstrap seeds IT and DEV role model", IdentityBootstrapper_SeedsItAndDevAsync),
            new SmokeCase("frontend role access matrix enforces canonical role routing", FrontendRoleAccess_EnforcesCanonicalRoutingAsync),
        };

        var failures = new List<string>();
        foreach (var check in checks)
        {
            try
            {
                await check.RunAsync();
                Console.WriteLine($"PASS {check.Name}");
            }
            catch (Exception ex)
            {
                failures.Add($"{check.Name}: {ex.Message}");
                Console.WriteLine($"FAIL {check.Name}");
                Console.WriteLine(ex.Message);
            }
        }

        Console.WriteLine();
        Console.WriteLine($"Smoke checks passed: {checks.Length - failures.Count}/{checks.Length}");
        if (failures.Count == 0)
        {
            return 0;
        }

        Console.WriteLine("Failures:");
        foreach (var failure in failures)
        {
            Console.WriteLine($" - {failure}");
        }

        return 1;
    }

    private static Task RuleFamilyCatalog_ExposesSuricataCanonicallyAsync()
    {
        var families = RuleFamilyCatalog.SupportedFamilies;
        Expect.Equal(4, families.Count, "Supported family count should stay limited to the scoped set.");
        Expect.Equal("yara", families[0], "Family ordering should stay stable.");
        Expect.Equal("sigma", families[1], "Family ordering should stay stable.");
        Expect.Equal("snort", families[2], "Family ordering should stay stable.");
        Expect.Equal("suricata", families[3], "Suricata should be the canonical fourth family.");
        Expect.True(RuleFamilyCatalog.TryNormalize("suricata", out var normalized), "Suricata should normalize successfully.");
        Expect.Equal("suricata", normalized, "Suricata should remain canonical after normalization.");
        Expect.False(RuleFamilyCatalog.TryNormalize("loki", out _), "Legacy Loki should not remain a supported public family.");
        return Task.CompletedTask;
    }

    private static Task RuleRecord_Create_PersistsSuricataAsync()
    {
        var nowUtc = new DateTimeOffset(2026, 03, 15, 00, 00, 00, TimeSpan.Zero);
        var record = RuleRecord.Create(
            Guid.NewGuid(),
            "Legacy Signature",
            "suricata",
            "alert tls any any -> any any (msg:\"legacy\"; sid:1;)",
            "v1",
            "migration-test",
            "analyst-1",
            [],
            null,
            null,
            0.71m,
            0.20m,
            "Unspecified",
            "fingerprint",
            "analyst-1",
            nowUtc);

        Expect.Equal("suricata", record.RuleFamily, "Rule records should persist the canonical Suricata family.");
        return Task.CompletedTask;
    }

    private static Task RuleValidationSource_EnforcesSuricataHeuristicsAsync()
    {
        var source = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "RuleRevisionValidationPipeline.cs"));
        Expect.Contains("[\"suricata\"] = [\".rules\", \".suricata\", \".sur\"]", source, "Validation pipeline should keep the Suricata extension map.");
        Expect.Contains("syntax.suricata.action.required", source, "Validation pipeline should enforce a Suricata action heuristic.");
        Expect.Contains("syntax.suricata.sid.required", source, "Validation pipeline should enforce a Suricata sid heuristic.");
        return Task.CompletedTask;
    }

    private static Task RuleValidationSource_RejectsUnsupportedFamilyAsync()
    {
        var source = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "RuleRevisionValidationPipeline.cs"));
        Expect.Contains("RuleFamily must be one of: yara, sigma, snort, suricata.", source, "Validation pipeline should reject unsupported families with the canonical family set.");
        return Task.CompletedTask;
    }

    private static Task ScanDispatcherSource_MapsSuricataAsync()
    {
        var source = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "ScanExecutionDispatcher.cs"));
        Expect.Contains("ScannerCapability.Suricata", source, "Dispatcher should include the Suricata capability branch.");
        Expect.Contains("family = \"Suricata\"", source, "Dispatcher should emit the Suricata family name in the execution contract.");
        Expect.Contains("suricata = new", source, "Dispatcher should emit a dedicated suricata execution block.");
        Expect.False(source.Contains("ScannerCapability.Loki", StringComparison.Ordinal), "Dispatcher should not keep the legacy Loki capability branch.");
        return Task.CompletedTask;
    }

    private static Task ResultIngestionSource_RegistersSuricataNormalizerAsync()
    {
        var source = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "ResultIngestionService.cs"));
        Expect.Contains("[\"suricata\"] = new SuricataResultNormalizer()", source, "Result ingestion should register the Suricata normalizer explicitly.");
        Expect.False(source.Contains("[\"loki\"]", StringComparison.OrdinalIgnoreCase), "Result ingestion should not keep a Loki normalizer entry.");
        return Task.CompletedTask;
    }

    private static Task Migration_RewritesLokiToSuricataAsync()
    {
        var migration = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Infrastructure", "Persistence", "Migrations", "20260412113000_RenameLokiToSuricata.cs"));
        Expect.Contains("SET [RuleFamily] = 'suricata'", migration, "Migration should rewrite stored families to Suricata.");
        Expect.Contains("WHERE LOWER([RuleFamily]) = 'loki'", migration, "Migration should explicitly upgrade legacy Loki rows.");
        return Task.CompletedTask;
    }

    private static Task LegacyScannerParser_IsAvailableAsync()
    {
        var source = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "LegacyScannerEnvelopeParser.cs"));
        Expect.Contains("public static partial class LegacyScannerEnvelopeParser", source, "Legacy parser should be available as a reusable compatibility utility.");
        Expect.Contains("StripTerminalNoise", source, "Legacy parser should preserve terminal-noise cleanup.");
        Expect.Contains("ExtractJsonObjects", source, "Legacy parser should preserve envelope extraction logic.");
        Expect.Contains("raw_scanner_payload", source, "Legacy parser should preserve the old scanner envelope contract.");
        return Task.CompletedTask;
    }

    private static Task LegacyScannerExtractor_IsWiredAsync()
    {
        var extractorSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "LegacyScannerResultExtractor.cs"));
        Expect.Contains("public sealed class LegacyScannerResultExtractor", extractorSource, "Legacy extractor should exist.");
        Expect.Contains("ExtractRows(", extractorSource, "Legacy extractor should expose row extraction.");
        Expect.Contains("legacy_scanner_finding", extractorSource, "Legacy extractor should emit compatibility finding rows.");

        var workerSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "ScanPlanExecutionWorker.cs"));
        Expect.Contains("ILegacyScannerResultExtractor", workerSource, "Scan worker should depend on the legacy extractor.");
        Expect.Contains("legacyScannerResultExtractor.ExtractRows(", workerSource, "Scan worker should route raw script output through the legacy extractor.");
        return Task.CompletedTask;
    }

    private static Task Discovery_UsesDnsAndScriptSweepAsync()
    {
        var providerSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "DiscoveryObservationProvider.cs"));
        Expect.Contains("Dns.GetHostEntryAsync", providerSource, "Discovery provider should enrich reachable hosts through reverse DNS.");
        Expect.Contains("UseScriptSweepWhenAvailable", providerSource, "Discovery provider should support optional script-assisted sweeps.");

        var optionsSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "DiscoveryExecutionOptions.cs"));
        Expect.Contains("SweepScriptPath", optionsSource, "Discovery options should expose the legacy sweep script path.");
        return Task.CompletedTask;
    }

    private static Task ScanDispatch_PrefersLegacyScriptsAsync()
    {
        var executorSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "Execution", "LegacyScriptScanExecutor.cs"));
        Expect.Contains("Invoke-YaraScan.ps1", executorSource, "Legacy script executor should target the existing YARA script.");
        Expect.Contains("Invoke-SigmaScan.ps1", executorSource, "Legacy script executor should target the existing Sigma script.");
        Expect.Contains("Invoke-SnortScan.ps1", executorSource, "Legacy script executor should target the existing Snort script.");
        Expect.Contains("Invoke-SuricataScan.ps1", executorSource, "Legacy script executor should target the existing Suricata script.");

        var dispatcherSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "ScanExecutionDispatcher.cs"));
        Expect.Contains("_legacyScriptScanExecutor.TryExecuteAsync(", dispatcherSource, "Dispatcher should attempt the legacy script path first.");
        return Task.CompletedTask;
    }

    private static Task LegacyAzureCompatibilityReader_IsAvailableAsync()
    {
        var source = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Infrastructure", "Compatibility", "LegacyAzure", "LegacyAzureCompatibilityReader.cs"));
        Expect.Contains("public sealed class LegacyAzureCompatibilityReader", source, "Legacy Azure compatibility reader should exist.");
        Expect.Contains("ToTable(\"NETWORK\", \"dbo\")", source, "Compatibility reader should map legacy NETWORK.");
        Expect.Contains("ToTable(\"Target\", \"dbo\")", source, "Compatibility reader should map legacy Target.");
        Expect.Contains("ToTable(\"IOC\", \"dbo\")", source, "Compatibility reader should map legacy IOC.");
        return Task.CompletedTask;
    }

    private static Task Controllers_UseLegacyAzureFallbackAsync()
    {
        var infrastructureSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Controllers", "V2", "InfrastructureController.cs"));
        Expect.Contains("ILegacyAzureCompatibilityReader", infrastructureSource, "Infrastructure controller should depend on the legacy compatibility reader.");
        Expect.Contains("ListNetworksAsync", infrastructureSource, "Infrastructure controller should fall back to legacy networks.");
        Expect.Contains("ListTargetServersAsync", infrastructureSource, "Infrastructure controller should fall back to legacy target servers.");

        var iocSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Controllers", "V2", "IocsController.cs"));
        Expect.Contains("new LegacyIocQuery(", iocSource, "IOC controller should build a legacy IOC fallback query.");
        Expect.Contains("ListIocsAsync(", iocSource, "IOC controller should fall back to legacy IOC reads.");
        return Task.CompletedTask;
    }

    private static Task JobRunsRepository_UsesMissingTableGuardAsync()
    {
        var source = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Infrastructure", "Persistence", "Repositories", "JobRunsRepository.cs"));
        Expect.Contains("OBJECT_ID(N'[dbo].[job_run_records]'", source, "Job runs repository should guard for missing job_run_records table.");
        Expect.Contains("return Array.Empty<JobRunRecord>();", source, "Job runs repository should degrade to an empty list when the table is unavailable.");
        return Task.CompletedTask;
    }

    private static Task RetrainingRepositories_UseMissingTableGuardsAsync()
    {
        var feedbackSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Infrastructure", "Persistence", "Repositories", "FeedbackRepository.cs"));
        Expect.Contains("OBJECT_ID(N'[dbo].[feedback_records]'", feedbackSource, "Feedback repository should guard for missing feedback_records table.");

        var decisionsSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Infrastructure", "Persistence", "Repositories", "DecisionsRepository.cs"));
        Expect.Contains("OBJECT_ID(N'[dbo].[decision_records]'", decisionsSource, "Decisions repository should guard for missing decision_records table.");
        return Task.CompletedTask;
    }

    private static Task AiDecisionContracts_CarrySafetyDiagnosticsAsync()
    {
        var contractSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Contracts", "V2", "AiDecisionContracts.cs"));
        Expect.Contains("SafetyDiagnosticsDto", contractSource, "AI decision contracts should expose the safety diagnostics DTO.");
        Expect.Contains("SafetyDiagnostics", contractSource, "Decision decision DTO should include safety diagnostics.");

        var serviceSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Application", "Services", "AiDecisionService.cs"));
        Expect.Contains("ParseSafetyDiagnostics", serviceSource, "AI decision service should parse safety diagnostics from stored raw payloads.");
        Expect.Contains("groundedDecision", serviceSource, "AI decision service should inspect groundedDecision payloads.");
        return Task.CompletedTask;
    }

    private static Task ObsoleteAiDecisionParser_IsRemovedAsync()
    {
        var parserPath = Path.Combine(
            Path.GetDirectoryName(ResolveRepoPath("Project", "backend", "src", "Backend.Application", "Services", "AiDecisionService.cs"))!,
            "..",
            "..",
            "Backend.Infrastructure",
            "Integrations",
            "AiDecisionContractParser.cs");

        Expect.False(File.Exists(Path.GetFullPath(parserPath)), "Obsolete AI decision parser should be removed from the backend.");
        return Task.CompletedTask;
    }

    private static Task AuthorizationPolicies_EnforceRoleScopesAsync()
    {
        var source = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Infrastructure", "AuthorizationPolicies.cs"));
        Expect.Contains("policy.RequireRole(\"Analyst\", \"Lead\", \"DEV\")", source, "Analyst access should include Analyst, Lead, and DEV.");
        Expect.Contains("policy.RequireRole(\"Lead\", \"DEV\")", source, "Lead access should exclude Analyst and include only Lead plus DEV.");
        Expect.Contains("policy.RequireRole(\"Admin\", \"DEV\")", source, "Admin access should include Admin and DEV.");
        Expect.Contains("policy.RequireRole(\"IT\", \"Analyst\", \"Lead\", \"DEV\")", source, "Alert access should include IT + security roles + DEV.");
        Expect.Contains("InfrastructureReadAccess", source, "Infrastructure read policy should be present.");
        Expect.Contains("WorkflowSettingsAccess", source, "Workflow settings policy should be present.");
        Expect.Contains("AuditAccess", source, "Audit access policy should be present.");
        return Task.CompletedTask;
    }

    private static Task V2Controllers_UseUpdatedRolePoliciesAsync()
    {
        var alertsSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Controllers", "V2", "AlertsController.cs"));
        Expect.Contains("[Authorize(Policy = AuthorizationPolicies.AlertAccess)]", alertsSource, "Alerts controller should use AlertAccess policy.");

        var retentionSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Controllers", "V2", "RetentionController.cs"));
        Expect.Contains("[Authorize(Policy = AuthorizationPolicies.AdminAccess)]", retentionSource, "Retention controller should be admin-only.");

        var auditSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Controllers", "V2", "AuditController.cs"));
        Expect.Contains("[Authorize(Policy = AuthorizationPolicies.AuditAccess)]", auditSource, "Audit controller should use AuditAccess policy.");

        var infrastructureSource = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "Controllers", "V2", "InfrastructureController.cs"));
        Expect.Contains("[Authorize(Policy = AuthorizationPolicies.InfrastructureReadAccess)]", infrastructureSource, "Infrastructure controller should use InfrastructureReadAccess policy.");
        Expect.Contains("[HttpPost(\"scanners\")]", infrastructureSource, "Infrastructure controller should expose scanner create.");
        Expect.Contains("[Authorize(Policy = AuthorizationPolicies.WorkflowSettingsAccess)]", infrastructureSource, "Scanner settings mutations should use WorkflowSettingsAccess policy.");
        return Task.CompletedTask;
    }

    private static Task IdentityBootstrapper_SeedsItAndDevAsync()
    {
        var source = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Infrastructure", "Security", "IdentityBootstrapper.cs"));
        Expect.Contains("\"IT\"", source, "Identity bootstrap should include IT role.");
        Expect.Contains("\"DEV\"", source, "Identity bootstrap should include DEV role.");
        Expect.Contains("[\"DEV\"] = PermissionCatalog", source, "DEV role should receive full permission catalog.");
        Expect.Contains("[\"IT\"]", source, "Identity bootstrap should define IT grants.");

        var devConfig = File.ReadAllText(ResolveRepoPath("Project", "backend", "src", "Backend.Api", "appsettings.Development.json"));
        Expect.Contains("\"Role\": \"DEV\"", devConfig, "Development bootstrap role should default to DEV.");
        return Task.CompletedTask;
    }

    private static Task FrontendRoleAccess_EnforcesCanonicalRoutingAsync()
    {
        var roleAccessSource = File.ReadAllText(ResolveRepoPath("Project", "frontend", "workbench", "src", "shared", "auth", "role-access.ts"));
        Expect.Contains("return \"/settings\"", roleAccessSource, "Admin default route should be /settings.");
        Expect.Contains("return \"/alerts\"", roleAccessSource, "IT default route should be /alerts.");
        Expect.Contains("path === \"/settings\"", roleAccessSource, "Admin canonical access should be settings-only.");
        Expect.Contains("path === \"/alerts\" || path.startsWith(\"/alerts/\")", roleAccessSource, "IT canonical access should be alerts-only.");
        return Task.CompletedTask;
    }

    private static string ResolveRepoPath(params string[] segments)
    {
        foreach (var basePath in EnumerateSearchRoots())
        {
            var candidate = Path.Combine(basePath, Path.Combine(segments));
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        throw new FileNotFoundException($"Could not resolve repo path for '{Path.Combine(segments)}'.");
    }

    private static IEnumerable<string> EnumerateSearchRoots()
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var start in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            var current = new DirectoryInfo(start);
            while (current is not null)
            {
                if (seen.Add(current.FullName))
                {
                    yield return current.FullName;
                }

                current = current.Parent;
            }
        }
    }
}

