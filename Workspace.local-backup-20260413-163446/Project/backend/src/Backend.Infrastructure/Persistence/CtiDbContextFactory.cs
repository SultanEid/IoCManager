using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Backend.Infrastructure.Configuration;

namespace Backend.Infrastructure.Persistence;

public sealed class CtiDbContextFactory : IDesignTimeDbContextFactory<CtiDbContext>
{
    public CtiDbContext CreateDbContext(string[] args)
    {
        DotEnvLoader.LoadFromCurrentDirectory();

        var optionsBuilder = new DbContextOptionsBuilder<CtiDbContext>();
        var connectionString = DatabaseConnectionStringResolver.ResolveFromEnvironment("Main");

        optionsBuilder.UseSqlServer(connectionString, sqlServer =>
        {
            sqlServer.MigrationsAssembly(typeof(CtiDbContext).Assembly.FullName);
            sqlServer.EnableRetryOnFailure();
        });

        return new CtiDbContext(optionsBuilder.Options);
    }
}
