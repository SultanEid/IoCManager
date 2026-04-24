using Backend.Domain.IocManager;
using Backend.Infrastructure.Configuration;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Security;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Data;
using System.Data.Common;
using System.Net.Sockets;

namespace Backend.Infrastructure.DependencyInjection;

public static class InitializationExtensions
{
    private const int DefaultSqlServerPort = 1433;

    private static readonly Type[] RequiredDevelopmentEntityTypes =
    [
        typeof(Network),
        typeof(Subnet),
        typeof(TargetServer),
        typeof(DiscoveryRun),
        typeof(DiscoveredHost),
        typeof(Scanner),
        typeof(Ioc),
        typeof(RuleRevision),
        typeof(ScanJob),
        typeof(Alert),
        typeof(AlertIoc),
        typeof(Report),
        typeof(AuditLog),
        typeof(ApplicationUser),
    ];

    public static async Task InitializeInfrastructureAsync(this IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CtiDbContext>();
        var dbOptions = scope.ServiceProvider.GetRequiredService<IOptions<DatabaseOptions>>().Value;
        var sqlUserTableAuthOptions = scope.ServiceProvider.GetRequiredService<IOptions<SqlUserTableAuthOptions>>().Value;
        var bootstrapOptions = scope.ServiceProvider.GetRequiredService<IOptions<BootstrapAdminOptions>>().Value;
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("InfrastructureInitialization");
        var hostEnvironment = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
        var isRelationalProvider = dbContext.Database.IsRelational();

        try
        {
            if (sqlUserTableAuthOptions.Enabled)
            {
                if (bootstrapOptions.Enabled)
                {
                    var directoryService = scope.ServiceProvider.GetRequiredService<SqlUserTableDirectoryService>();
                    var bootstrapUser = await directoryService.EnsureBootstrapUserAsync(bootstrapOptions, cancellationToken);
                    logger.LogInformation(
                        "SQL user table bootstrap completed for user {UserName} in role {Role}.",
                        bootstrapUser.UserName,
                        bootstrapUser.Role);
                }

                logger.LogInformation("Skipping EF schema initialization because Auth:SqlUserTable:Enabled=true.");
                return;
            }

            if (dbOptions.ApplyMigrationsOnStartup)
            {
                if (isRelationalProvider)
                {
                    logger.LogInformation("Applying relational database migrations on startup.");
                    await dbContext.Database.MigrateAsync(cancellationToken);
                }
                else
                {
                    logger.LogInformation("Ensuring non-relational database is created on startup.");
                    await dbContext.Database.EnsureCreatedAsync(cancellationToken);
                }

                var bootstrapper = scope.ServiceProvider.GetRequiredService<IdentityBootstrapper>();
                await bootstrapper.SeedAsync(cancellationToken);
            }
            else
            {
                logger.LogInformation("Database migrations are disabled on startup (Database:ApplyMigrationsOnStartup=false).");

                if (isRelationalProvider && hostEnvironment.IsDevelopment())
                {
                    await EnsureDevelopmentSchemaAsync(dbContext, logger, cancellationToken);

                    var bootstrapper = scope.ServiceProvider.GetRequiredService<IdentityBootstrapper>();
                    await bootstrapper.SeedAsync(cancellationToken);
                }
            }
        }
        catch (Exception ex) when (IsDatabaseStartupFailure(ex))
        {
            throw BuildDatabaseStartupException(ex, dbContext, dbOptions.ConnectionStringName);
        }
    }

    private static async Task EnsureDevelopmentSchemaAsync(
        CtiDbContext dbContext,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await HasExpectedDevelopmentSchemaAsync(dbContext, cancellationToken))
        {
            logger.LogInformation("Development schema check passed.");
            return;
        }

        if (await HasAnyTablesAsync(dbContext, cancellationToken))
        {
            if (!IsSafeForDevelopmentRebuild(dbContext.Database.GetDbConnection()))
            {
                logger.LogWarning(
                    "Detected relational schema drift in development, but the configured database is not local. Skipping destructive rebuild.");
                return;
            }

            logger.LogWarning(
                "Detected relational schema drift in development. Rebuilding database from the current EF model.");
            await dbContext.Database.EnsureDeletedAsync(cancellationToken);
        }

        logger.LogInformation("Creating relational development schema from current EF model.");
        await dbContext.Database.EnsureCreatedAsync(cancellationToken);
    }

    private static async Task<bool> HasExpectedDevelopmentSchemaAsync(CtiDbContext dbContext, CancellationToken cancellationToken)
    {
        foreach (var requiredType in RequiredDevelopmentEntityTypes)
        {
            var entityType = dbContext.Model.FindEntityType(requiredType);
            if (entityType is null)
            {
                return false;
            }

            var tableName = entityType.GetTableName();
            if (string.IsNullOrWhiteSpace(tableName))
            {
                return false;
            }

            if (!await TableExistsAsync(dbContext, entityType.GetSchema(), tableName, cancellationToken))
            {
                return false;
            }
        }

        return true;
    }

    private static async Task<bool> HasAnyTablesAsync(CtiDbContext dbContext, CancellationToken cancellationToken)
    {
        var databaseCreator = dbContext.GetService<IRelationalDatabaseCreator>();
        return await databaseCreator.HasTablesAsync(cancellationToken);
    }

    private static async Task<bool> TableExistsAsync(
        CtiDbContext dbContext,
        string? schema,
        string tableName,
        CancellationToken cancellationToken)
    {
        var sqlGenerationHelper = dbContext.GetService<ISqlGenerationHelper>();
        var qualifiedTable = sqlGenerationHelper.DelimitIdentifier(tableName, schema);

        var connection = dbContext.Database.GetDbConnection();
        var shouldCloseConnection = connection.State != ConnectionState.Open;
        if (shouldCloseConnection)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = $"SELECT 1 FROM {qualifiedTable} WHERE 1 = 0;";
            await command.ExecuteScalarAsync(cancellationToken);
            return true;
        }
        catch (DbException)
        {
            return false;
        }
        finally
        {
            if (shouldCloseConnection)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static bool IsDatabaseStartupFailure(Exception exception)
    {
        return FindException<SqlException>(exception) is not null
            || FindException<DbException>(exception) is not null
            || FindException<SocketException>(exception) is not null
            || FindException<TimeoutException>(exception) is not null;
    }

    private static bool IsSafeForDevelopmentRebuild(DbConnection connection)
    {
        var (host, _, _) = ReadSafeConnectionTarget(connection);
        if (string.IsNullOrWhiteSpace(host))
        {
            return false;
        }

        return host.Contains("(localdb)", StringComparison.OrdinalIgnoreCase)
            || host.Equals(".", StringComparison.OrdinalIgnoreCase)
            || host.Equals("(local)", StringComparison.OrdinalIgnoreCase)
            || host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            || host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)
            || host.Equals("::1", StringComparison.OrdinalIgnoreCase);
    }

    private static InvalidOperationException BuildDatabaseStartupException(
        Exception exception,
        CtiDbContext dbContext,
        string connectionStringName)
    {
        var connection = dbContext.Database.GetDbConnection();
        var (host, port, database) = ReadSafeConnectionTarget(connection);
        var failureReason = ClassifyDatabaseFailure(exception);

        var message =
            $"Database startup failed ({failureReason}) for target '{host}:{port}/{database}'. " +
            $"Verify ConnectionStrings:{connectionStringName} (or CONNECTIONSTRINGS__{connectionStringName.ToUpperInvariant()}) " +
            "and SQLSERVER_HOST/SQLSERVER_PORT/SQLSERVER_DB/SQLSERVER_USER. " +
            "Do not include secrets in logs.";

        return new InvalidOperationException(message, exception);
    }

    private static (string Host, int Port, string Database) ReadSafeConnectionTarget(DbConnection connection)
    {
        try
        {
            var builder = new SqlConnectionStringBuilder(connection.ConnectionString);
            var dataSource = string.IsNullOrWhiteSpace(builder.DataSource) ? "unknown-host" : builder.DataSource;
            var (host, port) = SplitDataSource(dataSource, DefaultSqlServerPort);
            var database = string.IsNullOrWhiteSpace(builder.InitialCatalog) ? "unknown-database" : builder.InitialCatalog;
            return (host, port, database);
        }
        catch
        {
            var dataSource = string.IsNullOrWhiteSpace(connection.DataSource) ? "unknown-host" : connection.DataSource;
            var (host, port) = SplitDataSource(dataSource, DefaultSqlServerPort);
            var database = string.IsNullOrWhiteSpace(connection.Database) ? "unknown-database" : connection.Database;
            return (host, port, database);
        }
    }

    private static string ClassifyDatabaseFailure(Exception exception)
    {
        var sqlException = FindException<SqlException>(exception);
        if (sqlException is not null)
        {
            return sqlException.Number switch
            {
                18456 => "authentication failed",
                4060 => "database unavailable",
                53 => "host resolution failed",
                -2 => "connection timed out",
                _ => "database unavailable",
            };
        }

        var socketException = FindException<SocketException>(exception);
        if (socketException is not null)
        {
            return socketException.SocketErrorCode switch
            {
                SocketError.ConnectionRefused => "connection refused",
                SocketError.HostNotFound => "host resolution failed",
                SocketError.TimedOut => "connection timed out",
                _ => "network failure",
            };
        }

        if (FindException<TimeoutException>(exception) is not null)
        {
            return "connection timed out";
        }

        return "database unavailable";
    }

    private static (string Host, int Port) SplitDataSource(string dataSource, int fallbackPort)
    {
        if (dataSource.Contains('\\'))
        {
            return (dataSource, fallbackPort);
        }

        var separatorIndex = dataSource.LastIndexOf(',');
        if (separatorIndex > 0
            && separatorIndex < dataSource.Length - 1
            && int.TryParse(dataSource[(separatorIndex + 1)..], out var parsedPort)
            && parsedPort > 0)
        {
            return (dataSource[..separatorIndex], parsedPort);
        }

        return (dataSource, fallbackPort);
    }

    private static TException? FindException<TException>(Exception exception)
        where TException : Exception
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is TException typed)
            {
                return typed;
            }
        }

        return null;
    }
}
