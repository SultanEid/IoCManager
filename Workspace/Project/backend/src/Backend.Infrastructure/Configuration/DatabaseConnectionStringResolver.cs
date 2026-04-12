using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;

namespace Backend.Infrastructure.Configuration;

public static class DatabaseConnectionStringResolver
{
    private const int DefaultPort = 1433;
    private const string DefaultDataSource = @"(localdb)\MSSQLLocalDB";
    private const string DefaultDatabase = "ioc_manager_dev";

    public static string Resolve(IConfiguration configuration, string connectionStringName)
    {
        var connectionString = configuration.GetConnectionString(connectionStringName);
        return ResolveCore(connectionString, connectionStringName, configuration);
    }

    public static string ResolveFromEnvironment(string connectionStringName)
    {
        var variableName = $"CONNECTIONSTRINGS__{connectionStringName.ToUpperInvariant()}";
        var connectionString = Environment.GetEnvironmentVariable(variableName);
        return ResolveCore(connectionString, connectionStringName, configuration: null);
    }

    private static string ResolveCore(
        string? configuredConnectionString,
        string connectionStringName,
        IConfiguration? configuration)
    {
        var connectionString = configuredConnectionString;
        if (string.IsNullOrWhiteSpace(connectionString)
            && connectionStringName.Equals("Main", StringComparison.OrdinalIgnoreCase))
        {
            connectionString = BuildMainConnectionString(configuration);
        }

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"Connection string '{connectionStringName}' is missing. " +
                $"Set ConnectionStrings:{connectionStringName} or CONNECTIONSTRINGS__{connectionStringName.ToUpperInvariant()}.");
        }

        return HydratePasswordIfMissing(connectionString, configuration);
    }

    private static string BuildMainConnectionString(IConfiguration? configuration)
    {
        var configuredDataSource = FirstNonEmpty(
            configuration?["SqlServer:Host"],
            configuration?["SqlServer:Server"],
            Environment.GetEnvironmentVariable("SQLSERVER_HOST"),
            Environment.GetEnvironmentVariable("SQLSERVER_SERVER"),
            DefaultDataSource);

        var builder = new SqlConnectionStringBuilder
        {
            DataSource = BuildDataSource(
                configuredDataSource,
                FirstNonEmpty(
                    configuration?["SqlServer:Port"],
                    Environment.GetEnvironmentVariable("SQLSERVER_PORT"))),
            InitialCatalog = FirstNonEmpty(
                configuration?["SqlServer:Database"],
                configuration?["SqlServer:Db"],
                Environment.GetEnvironmentVariable("SQLSERVER_DB"),
                Environment.GetEnvironmentVariable("SQLSERVER_DATABASE"),
                DefaultDatabase)!,
            Encrypt = false,
            TrustServerCertificate = ParseBoolean(
                FirstNonEmpty(
                    configuration?["SqlServer:TrustServerCertificate"],
                    Environment.GetEnvironmentVariable("SQLSERVER_TRUST_SERVER_CERTIFICATE")),
                defaultValue: true),
            MultipleActiveResultSets = true,
        };

        var userId = FirstNonEmpty(
            configuration?["SqlServer:User"],
            configuration?["SqlServer:Username"],
            Environment.GetEnvironmentVariable("SQLSERVER_USER"),
            Environment.GetEnvironmentVariable("SQLSERVER_USERNAME"));
        var useTrustedConnection = ParseBoolean(
            FirstNonEmpty(
                configuration?["SqlServer:TrustedConnection"],
                Environment.GetEnvironmentVariable("SQLSERVER_TRUSTED_CONNECTION")),
            defaultValue: string.IsNullOrWhiteSpace(userId));

        if (useTrustedConnection || string.IsNullOrWhiteSpace(userId))
        {
            builder.IntegratedSecurity = true;
        }
        else
        {
            builder.IntegratedSecurity = false;
            builder.UserID = userId;
        }

        var password = ResolvePassword(configuration);
        if (!builder.IntegratedSecurity && !string.IsNullOrWhiteSpace(password))
        {
            builder.Password = password;
        }

        return builder.ConnectionString;
    }

    private static string HydratePasswordIfMissing(string connectionString, IConfiguration? configuration)
    {
        SqlConnectionStringBuilder builder;
        try
        {
            builder = new SqlConnectionStringBuilder(connectionString);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Database connection string is invalid.", ex);
        }

        if (builder.IntegratedSecurity || !string.IsNullOrWhiteSpace(builder.Password) || string.IsNullOrWhiteSpace(builder.UserID))
        {
            return builder.ConnectionString;
        }

        var password = ResolvePassword(configuration);
        if (string.IsNullOrWhiteSpace(password))
        {
            return builder.ConnectionString;
        }

        builder.Password = password;
        return builder.ConnectionString;
    }

    private static string? ResolvePassword(IConfiguration? configuration)
    {
        return FirstNonEmpty(
            configuration?["SqlServer:Password"],
            Environment.GetEnvironmentVariable("SQLSERVER_PASSWORD"));
    }

    private static string BuildDataSource(string? configuredDataSource, string? rawPort)
    {
        var dataSource = string.IsNullOrWhiteSpace(configuredDataSource)
            ? DefaultDataSource
            : configuredDataSource.Trim();

        if (dataSource.Contains('\\') || dataSource.Contains(','))
        {
            return dataSource;
        }

        var port = ParsePort(rawPort, DefaultPort);
        return port == DefaultPort ? dataSource : $"{dataSource},{port}";
    }

    private static int ParsePort(string? rawPort, int fallback)
    {
        return int.TryParse(rawPort, out var parsedPort) && parsedPort > 0 ? parsedPort : fallback;
    }

    private static bool ParseBoolean(string? rawValue, bool defaultValue)
    {
        return bool.TryParse(rawValue, out var parsed) ? parsed : defaultValue;
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }
}
