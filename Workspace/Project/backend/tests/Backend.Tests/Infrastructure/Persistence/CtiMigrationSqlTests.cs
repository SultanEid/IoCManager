using Backend.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Xunit.Sdk;

namespace Backend.Tests.Infrastructure.Persistence;

public sealed class CtiMigrationSqlTests
{
    [Fact]
    public void GenerateScript_IncludesIocManagerV2CutoverAndSchemaArtifacts()
    {
        var options = new DbContextOptionsBuilder<CtiDbContext>()
            .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=cti_migration_test;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;

        using var dbContext = new CtiDbContext(options);
        var migrator = dbContext.GetService<IMigrator>();

        var script = migrator.GenerateScript(
            fromMigration: null,
            toMigration: null,
            options: MigrationsSqlGenerationOptions.Idempotent);

        AssertContainsAny(script, "DROP TABLE [dbo].[cti_cases]", "DROP TABLE [cti_cases]");
        AssertContainsAny(script, "DROP TRIGGER [dbo].[trg_cti_feature_snapshots_prevent_mutation]", "DROP TRIGGER [trg_cti_feature_snapshots_prevent_mutation]");
        AssertContainsAny(script, "CREATE TABLE [dbo].[permissions]", "CREATE TABLE [permissions]");
        AssertContainsAny(script, "CREATE TABLE [dbo].[scan_jobs]", "CREATE TABLE [scan_jobs]");
        script.Should().Contain("CREATE TABLE [scan_result_ingestion_runs]");
        script.Should().Contain("CREATE TABLE [scan_result_provenances]");
        script.Should().Contain("CREATE TABLE [scan_result_ingestion_diagnostics]");
        AssertContainsAny(script, "CREATE TABLE [dbo].[discovery_runs]", "CREATE TABLE [discovery_runs]");
        AssertContainsAny(script, "CREATE TABLE [dbo].[discovered_hosts]", "CREATE TABLE [discovered_hosts]");
        AssertContainsAny(script, "CREATE TABLE [dbo].[alerts_v2]", "CREATE TABLE [alerts_v2]");
        AssertContainsAny(script, "CREATE TABLE [dbo].[retention_policies_v2]", "CREATE TABLE [retention_policies_v2]");
        script.Should().Contain("CREATE UNIQUE INDEX [IX_scan_results_Fingerprint] ON [scan_results]");
        script.Should().Contain("CONSTRAINT [CK_scan_results_confidence]");
        script.Should().Contain("CONSTRAINT [CK_retention_policies_v2_days]");
    }

    private static void AssertContainsAny(string haystack, params string[] candidates)
    {
        foreach (var candidate in candidates)
        {
            if (haystack.Contains(candidate, StringComparison.Ordinal))
            {
                return;
            }
        }

        throw new XunitException($"Expected script to contain one of: {string.Join(", ", candidates)}");
    }

}
