using System.Data.Common;
using Backend.Infrastructure.Configuration;
using Backend.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

var options = BridgeOptions.Parse(args);
var configuration = BuildConfiguration(options.ConfigDirectory, options.EnvironmentName);
var connectionString = !string.IsNullOrWhiteSpace(options.ConnectionString)
    ? options.ConnectionString
    : DatabaseConnectionStringResolver.Resolve(configuration, options.ConnectionStringName);

var dbContextOptions = new DbContextOptionsBuilder<CtiDbContext>()
    .UseSqlServer(
        connectionString,
        sqlServer => sqlServer.MigrationsAssembly(typeof(CtiDbContext).Assembly.FullName))
    .Options;

await using var dbContext = new CtiDbContext(dbContextOptions);
var designTimeModel = dbContext.GetService<IDesignTimeModel>().Model;
var relationalModel = designTimeModel.GetRelationalModel();
var modelTables = relationalModel.Tables
    .Where(table => !table.IsExcludedFromMigrations)
    .Where(IsBridgeTargetTable)
    .Select(table => new TableKey(table.Schema, table.Name))
    .Distinct()
    .OrderBy(table => table.Schema)
    .ThenBy(table => table.Name)
    .ToArray();

await using var connection = new SqlConnection(connectionString);
await connection.OpenAsync();

var existingTables = await LoadExistingTablesAsync(connection);
var existingHistory = await LoadAppliedMigrationsAsync(connection);
var missingTables = modelTables
    .Where(table => !existingTables.Contains(table))
    .ToArray();

Console.WriteLine($"Target database: {connection.Database}");
Console.WriteLine($"Existing tables: {existingTables.Count}");
Console.WriteLine($"Model tables: {modelTables.Length}");
Console.WriteLine($"Missing tables to adopt: {missingTables.Length}");

if (missingTables.Length > 0)
{
    foreach (var table in missingTables.Take(20))
    {
        Console.WriteLine($"  + {table.Schema}.{table.Name}");
    }

    if (missingTables.Length > 20)
    {
        Console.WriteLine($"  ... and {missingTables.Length - 20} more");
    }
}

var differ = dbContext.GetService<IMigrationsModelDiffer>();
var sqlGenerator = dbContext.GetService<IMigrationsSqlGenerator>();
var historyRepository = dbContext.GetService<IHistoryRepository>();
var migrationsAssembly = dbContext.GetService<IMigrationsAssembly>();

var allOperations = differ.GetDifferences(source: null, target: relationalModel);
var filteredOperations = FilterOperations(allOperations, missingTables).ToArray();
var sqlCommands = sqlGenerator.Generate(filteredOperations, designTimeModel).ToArray();
var pendingMigrations = migrationsAssembly.Migrations.Keys
    .Where(migrationId => !existingHistory.Contains(migrationId))
    .OrderBy(migrationId => migrationId, StringComparer.Ordinal)
    .ToArray();

Console.WriteLine($"DDL operations to run: {filteredOperations.Length}");
Console.WriteLine($"Migration history rows to stamp: {pendingMigrations.Length}");

if (!options.ApplyChanges)
{
    Console.WriteLine("Dry run only. Re-run with --apply to execute the adoption bridge.");
    return 0;
}

await using var transaction = await connection.BeginTransactionAsync();

try
{
    if (!existingTables.Contains(TableKey.MigrationsHistory))
    {
        await ExecuteSqlAsync(connection, transaction, historyRepository.GetCreateIfNotExistsScript());
        existingTables.Add(TableKey.MigrationsHistory);
        Console.WriteLine("Created __EFMigrationsHistory.");
    }

    foreach (var command in sqlCommands)
    {
        var normalizedSql = NormalizeBridgeSql(command.CommandText);
        if (string.IsNullOrWhiteSpace(normalizedSql))
        {
            continue;
        }

        await ExecuteSqlAsync(connection, transaction, normalizedSql);
    }

    foreach (var migrationId in pendingMigrations)
    {
        var row = new HistoryRow(migrationId, ProductInfo.GetVersion());
        await ExecuteSqlAsync(connection, transaction, historyRepository.GetInsertScript(row));
    }

    await transaction.CommitAsync();
}
catch (Exception ex)
{
    await transaction.RollbackAsync();
    Console.Error.WriteLine($"Adoption bridge failed: {ex.Message}");
    throw;
}

var verifiedTables = await LoadExistingTablesAsync(connection);
var criticalTables = new[]
{
    new TableKey("dbo", "users"),
    new TableKey("dbo", "roles"),
    new TableKey("dbo", "permissions"),
    new TableKey("dbo", "role_permissions"),
    new TableKey("dbo", "scan_results"),
    new TableKey("dbo", "scan_result_ingestion_runs"),
    new TableKey("dbo", "scan_result_provenances"),
    new TableKey("dbo", "scan_result_ingestion_diagnostics"),
    new TableKey("dbo", "ai_decision_requests"),
    new TableKey("dbo", "ai_decision_results"),
    TableKey.MigrationsHistory,
};

Console.WriteLine("Adoption bridge completed.");
foreach (var table in criticalTables)
{
    Console.WriteLine($"{(verifiedTables.Contains(table) ? "[ok]" : "[missing]")} {table.Schema}.{table.Name}");
}

return 0;

static IConfigurationRoot BuildConfiguration(string configDirectory, string environmentName)
{
    return new ConfigurationBuilder()
        .SetBasePath(configDirectory)
        .AddJsonFile("appsettings.json", optional: false)
        .AddJsonFile($"appsettings.{environmentName}.json", optional: true)
        .AddEnvironmentVariables()
        .Build();
}

static IEnumerable<MigrationOperation> FilterOperations(
    IReadOnlyList<MigrationOperation> operations,
    IReadOnlyCollection<TableKey> missingTables)
{
    var missingTableSet = missingTables.ToHashSet();
    var missingSchemas = missingTableSet.Select(table => table.Schema).ToHashSet(StringComparer.OrdinalIgnoreCase);

    foreach (var operation in operations)
    {
        switch (operation)
        {
            case EnsureSchemaOperation ensureSchema when missingSchemas.Contains(NormalizeSchema(ensureSchema.Name)):
                yield return operation;
                break;
            case CreateTableOperation createTable when missingTableSet.Contains(new TableKey(createTable.Schema, createTable.Name)):
                yield return operation;
                break;
            case CreateIndexOperation createIndex when missingTableSet.Contains(new TableKey(createIndex.Schema, createIndex.Table)):
                yield return operation;
                break;
            case AddForeignKeyOperation addForeignKey when missingTableSet.Contains(new TableKey(addForeignKey.Schema, addForeignKey.Table)):
                yield return operation;
                break;
            case AddCheckConstraintOperation addCheckConstraint when missingTableSet.Contains(new TableKey(addCheckConstraint.Schema, addCheckConstraint.Table)):
                yield return operation;
                break;
            case AddPrimaryKeyOperation addPrimaryKey when missingTableSet.Contains(new TableKey(addPrimaryKey.Schema, addPrimaryKey.Table)):
                yield return operation;
                break;
            case AddUniqueConstraintOperation addUniqueConstraint when missingTableSet.Contains(new TableKey(addUniqueConstraint.Schema, addUniqueConstraint.Table)):
                yield return operation;
                break;
            case AddColumnOperation addColumn when missingTableSet.Contains(new TableKey(addColumn.Schema, addColumn.Table)):
                yield return operation;
                break;
            case AlterTableOperation alterTable when missingTableSet.Contains(new TableKey(alterTable.Schema, alterTable.Name)):
                yield return operation;
                break;
        }
    }
}

static bool IsBridgeTargetTable(ITable table)
{
    foreach (var mapping in table.EntityTypeMappings)
    {
        var clrType = mapping.TypeBase.ClrType;
        var fullName = clrType.FullName ?? string.Empty;

        if (fullName.StartsWith("Backend.Domain.IocManager.", StringComparison.Ordinal)
            || fullName.StartsWith("Backend.Domain.AiDecision.", StringComparison.Ordinal)
            || fullName == "Backend.Infrastructure.Security.ApplicationUser"
            || fullName == "Backend.Infrastructure.Security.ApplicationRole"
            || fullName.StartsWith("Microsoft.AspNetCore.Identity.", StringComparison.Ordinal))
        {
            return true;
        }
    }

    return false;
}

static async Task<HashSet<TableKey>> LoadExistingTablesAsync(SqlConnection connection)
{
    const string sql =
        """
        SELECT TABLE_SCHEMA, TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE';
        """;

    await using var command = connection.CreateCommand();
    command.CommandText = sql;

    var tables = new HashSet<TableKey>();
    await using var reader = await command.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        tables.Add(new TableKey(reader.GetString(0), reader.GetString(1)));
    }

    return tables;
}

static async Task<HashSet<string>> LoadAppliedMigrationsAsync(SqlConnection connection)
{
    const string sql =
        """
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = '__EFMigrationsHistory';
        """;

    await using var existsCommand = connection.CreateCommand();
    existsCommand.CommandText = sql;
    var exists = (string?)await existsCommand.ExecuteScalarAsync();
    if (exists is null)
    {
        return new HashSet<string>(StringComparer.Ordinal);
    }

    await using var command = connection.CreateCommand();
    command.CommandText = "SELECT [MigrationId] FROM [dbo].[__EFMigrationsHistory];";
    var migrations = new HashSet<string>(StringComparer.Ordinal);

    await using var reader = await command.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        migrations.Add(reader.GetString(0));
    }

    return migrations;
}

static async Task ExecuteSqlAsync(SqlConnection connection, DbTransaction transaction, string sql)
{
    if (string.IsNullOrWhiteSpace(sql))
    {
        return;
    }

    await using var command = connection.CreateCommand();
    command.Transaction = (SqlTransaction)transaction;
    command.CommandText = sql;
    await command.ExecuteNonQueryAsync();
}

static string NormalizeBridgeSql(string sql)
{
    if (string.IsNullOrWhiteSpace(sql))
    {
        return sql;
    }

    sql = sql.Replace("ON DELETE CASCADE", "ON DELETE NO ACTION", StringComparison.OrdinalIgnoreCase);
    sql = sql.Replace("ON DELETE SET NULL", "ON DELETE NO ACTION", StringComparison.OrdinalIgnoreCase);

    return sql;
}

static string NormalizeSchema(string? schema)
{
    return string.IsNullOrWhiteSpace(schema) ? "dbo" : schema.Trim();
}

internal sealed class TableKey : IEquatable<TableKey>
{
    public static readonly TableKey MigrationsHistory = new("dbo", "__EFMigrationsHistory");

    public TableKey(string? schema, string name)
    {
        Schema = NormalizeSchema(schema);
        Name = name.Trim();
    }

    public string Schema { get; }
    public string Name { get; }

    private static string NormalizeSchema(string? schema)
    {
        return string.IsNullOrWhiteSpace(schema) ? "dbo" : schema.Trim();
    }

    public bool Equals(TableKey? other)
    {
        return other is not null
            && string.Equals(Schema, other.Schema, StringComparison.OrdinalIgnoreCase)
            && string.Equals(Name, other.Name, StringComparison.OrdinalIgnoreCase);
    }

    public override bool Equals(object? obj)
    {
        return obj is TableKey other && Equals(other);
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(
            StringComparer.OrdinalIgnoreCase.GetHashCode(Schema),
            StringComparer.OrdinalIgnoreCase.GetHashCode(Name));
    }
}

internal sealed record BridgeOptions
{
    public string ConfigDirectory { get; init; } = string.Empty;
    public string EnvironmentName { get; init; } = "Development";
    public string ConnectionStringName { get; init; } = "Main";
    public string? ConnectionString { get; init; }
    public bool ApplyChanges { get; init; }

    public static BridgeOptions Parse(string[] args)
    {
        var backendRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));
        var defaults = new BridgeOptions
        {
            ConfigDirectory = Path.Combine(backendRoot, "src", "Backend.Api"),
        };

        for (var index = 0; index < args.Length; index++)
        {
            switch (args[index])
            {
                case "--config-dir":
                    defaults = defaults with { ConfigDirectory = RequireValue(args, ref index) };
                    break;
                case "--environment":
                    defaults = defaults with { EnvironmentName = RequireValue(args, ref index) };
                    break;
                case "--connection-string-name":
                    defaults = defaults with { ConnectionStringName = RequireValue(args, ref index) };
                    break;
                case "--connection-string":
                    defaults = defaults with { ConnectionString = RequireValue(args, ref index) };
                    break;
                case "--apply":
                    defaults = defaults with { ApplyChanges = true };
                    break;
                default:
                    throw new ArgumentException($"Unknown argument '{args[index]}'.");
            }
        }

        return defaults with { ConfigDirectory = Path.GetFullPath(defaults.ConfigDirectory) };
    }

    private static string RequireValue(string[] args, ref int index)
    {
        if (index + 1 >= args.Length)
        {
            throw new ArgumentException($"Missing value for '{args[index]}'.");
        }

        index++;
        return args[index];
    }
}

