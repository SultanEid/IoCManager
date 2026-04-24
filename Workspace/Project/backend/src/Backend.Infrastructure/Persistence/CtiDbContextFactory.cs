using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Backend.Infrastructure.Configuration;
using Microsoft.Extensions.Configuration;

namespace Backend.Infrastructure.Persistence;

public sealed class CtiDbContextFactory : IDesignTimeDbContextFactory<CtiDbContext>
{
    public CtiDbContext CreateDbContext(string[] args)
    {
        DotEnvLoader.LoadFromCurrentDirectory();

        var optionsBuilder = new DbContextOptionsBuilder<CtiDbContext>();
        var environmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
            ?? "Development";
        var apiContentRoot = ResolveApiContentRoot();
        var configuration = new ConfigurationBuilder()
            .SetBasePath(apiContentRoot)
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
            .AddJsonFile($"appsettings.{environmentName}.json", optional: true, reloadOnChange: false)
            .AddEnvironmentVariables()
            .Build();
        var connectionString = DatabaseConnectionStringResolver.Resolve(configuration, "Main");

        optionsBuilder.UseSqlServer(connectionString, sqlServer =>
        {
            sqlServer.MigrationsAssembly(typeof(CtiDbContext).Assembly.FullName);
            sqlServer.EnableRetryOnFailure();
        });

        return new CtiDbContext(optionsBuilder.Options);
    }

    private static string ResolveApiContentRoot()
    {
        var currentDirectory = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (var directory = currentDirectory; directory is not null; directory = directory.Parent)
        {
            var directApiPath = Path.Combine(directory.FullName, "appsettings.json");
            if (directory.Name.Equals("Backend.Api", StringComparison.OrdinalIgnoreCase)
                && File.Exists(directApiPath))
            {
                return directory.FullName;
            }

            var sourceApiPath = Path.Combine(directory.FullName, "src", "Backend.Api");
            if (File.Exists(Path.Combine(sourceApiPath, "appsettings.json")))
            {
                return sourceApiPath;
            }

            var workspaceApiPath = Path.Combine(directory.FullName, "Workspace", "Project", "backend", "src", "Backend.Api");
            if (File.Exists(Path.Combine(workspaceApiPath, "appsettings.json")))
            {
                return workspaceApiPath;
            }
        }

        throw new InvalidOperationException("Could not locate Backend.Api appsettings.json for EF design-time configuration.");
    }
}
