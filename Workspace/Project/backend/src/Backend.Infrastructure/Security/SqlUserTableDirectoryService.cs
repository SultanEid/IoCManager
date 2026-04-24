using Backend.Infrastructure.Configuration;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Infrastructure.Security;

public sealed record SqlUserTableDirectoryRecord(int UserId, string UserName, string Role, string? Email);
public sealed record SqlUserTableAuthRecord(int UserId, string UserName, string Role, string? Email, string PasswordHash);

public sealed class SqlUserTableDirectoryService
{
    private readonly string _connectionString;
    private readonly SqlUserTableAuthOptions _options;

    public SqlUserTableDirectoryService(
        IConfiguration configuration,
        IOptions<DatabaseOptions> databaseOptions,
        IOptions<SqlUserTableAuthOptions> options)
    {
        _connectionString = DatabaseConnectionStringResolver.Resolve(
            configuration,
            databaseOptions.Value.ConnectionStringName);
        _options = options.Value;
    }

    public async Task<SqlUserTableAuthRecord?> FindByLookupAsync(string lookup, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = $@"
SELECT TOP (1) UserID, UserName, Role, Email, PasswordHash
FROM {_options.TableName}
WHERE UserName = @lookup OR Email = @lookup;";
        command.Parameters.AddWithValue("@lookup", lookup.Trim());

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new SqlUserTableAuthRecord(
            reader.GetInt32(0),
            reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
            reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.IsDBNull(4) ? string.Empty : reader.GetString(4));
    }

    public async Task<IReadOnlyList<SqlUserTableDirectoryRecord>> ListUsersAsync(CancellationToken cancellationToken)
    {
        var users = new List<SqlUserTableDirectoryRecord>();

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = $@"
SELECT UserID, UserName, Role, Email
FROM {_options.TableName}
ORDER BY UserName;";

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            users.Add(new SqlUserTableDirectoryRecord(
                reader.GetInt32(0),
                reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3)));
        }

        return users;
    }

    public async Task<IReadOnlyList<string>> ListRolesAsync(CancellationToken cancellationToken)
    {
        var roles = new List<string>();

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = $@"
SELECT DISTINCT LTRIM(RTRIM(Role))
FROM {_options.TableName}
WHERE Role IS NOT NULL
  AND LTRIM(RTRIM(Role)) <> ''
ORDER BY LTRIM(RTRIM(Role));";

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            roles.Add(reader.GetString(0));
        }

        return roles;
    }

    public async Task<SqlUserTableDirectoryRecord> CreateUserAsync(
        string userName,
        string email,
        string password,
        string role,
        CancellationToken cancellationToken)
    {
        var normalizedUserName = userName.Trim();
        var normalizedEmail = email.Trim();
        var normalizedRole = role.Trim();

        if (string.IsNullOrWhiteSpace(normalizedUserName))
        {
            throw new ArgumentException("Username is required.");
        }

        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            throw new ArgumentException("Email is required.");
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            throw new ArgumentException("Password is required.");
        }

        if (string.IsNullOrWhiteSpace(normalizedRole))
        {
            throw new ArgumentException("A role is required.");
        }

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var existsCommand = connection.CreateCommand();
        existsCommand.CommandText = $@"
SELECT COUNT(1)
FROM {_options.TableName}
WHERE UserName = @userName OR Email = @email;";
        existsCommand.Parameters.AddWithValue("@userName", normalizedUserName);
        existsCommand.Parameters.AddWithValue("@email", normalizedEmail);

        var exists = Convert.ToInt32(await existsCommand.ExecuteScalarAsync(cancellationToken)) > 0;
        if (exists)
        {
            throw new InvalidOperationException("User name or email already exists.");
        }

        await using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = $@"
INSERT INTO {_options.TableName} (UserName, Role, Email, PasswordHash)
OUTPUT INSERTED.UserID
VALUES (@userName, @role, @email, @passwordHash);";
        insertCommand.Parameters.AddWithValue("@userName", normalizedUserName);
        insertCommand.Parameters.AddWithValue("@role", normalizedRole);
        insertCommand.Parameters.AddWithValue("@email", normalizedEmail);
        insertCommand.Parameters.AddWithValue("@passwordHash", ComputeSha256Hex(password.Trim()));

        var insertedUserId = Convert.ToInt32(await insertCommand.ExecuteScalarAsync(cancellationToken));
        return new SqlUserTableDirectoryRecord(insertedUserId, normalizedUserName, normalizedRole, normalizedEmail);
    }

    public async Task<SqlUserTableDirectoryRecord> EnsureBootstrapUserAsync(
        BootstrapAdminOptions bootstrapOptions,
        CancellationToken cancellationToken)
    {
        if (!bootstrapOptions.Enabled)
        {
            throw new InvalidOperationException("Bootstrap admin is disabled.");
        }

        var normalizedUserName = bootstrapOptions.UserName.Trim();
        var normalizedEmail = bootstrapOptions.Email.Trim();
        var normalizedRole = string.IsNullOrWhiteSpace(bootstrapOptions.Role) ? "Admin" : bootstrapOptions.Role.Trim();

        if (string.IsNullOrWhiteSpace(normalizedUserName)
            || string.IsNullOrWhiteSpace(normalizedEmail)
            || string.IsNullOrWhiteSpace(bootstrapOptions.Password)
            || string.IsNullOrWhiteSpace(normalizedRole))
        {
            throw new InvalidOperationException("Bootstrap admin requires UserName, Email, Password, and Role when SQL-table auth is enabled.");
        }

        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var findCommand = connection.CreateCommand();
        findCommand.CommandText = $@"
SELECT TOP (1) UserID, UserName, Role, Email
FROM {_options.TableName}
WHERE UserName = @userName OR Email = @email;";
        findCommand.Parameters.AddWithValue("@userName", normalizedUserName);
        findCommand.Parameters.AddWithValue("@email", normalizedEmail);

        await using var reader = await findCommand.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            var userId = reader.GetInt32(0);
            var userName = reader.IsDBNull(1) ? normalizedUserName : reader.GetString(1);
            var email = reader.IsDBNull(3) ? null : reader.GetString(3);
            await reader.DisposeAsync();

            await using var updateCommand = connection.CreateCommand();
            updateCommand.CommandText = $@"
UPDATE {_options.TableName}
SET Role = @role,
    Email = COALESCE(NULLIF(@email, ''), Email)
WHERE UserID = @userId;";
            updateCommand.Parameters.AddWithValue("@role", normalizedRole);
            updateCommand.Parameters.AddWithValue("@email", normalizedEmail);
            updateCommand.Parameters.AddWithValue("@userId", userId);
            await updateCommand.ExecuteNonQueryAsync(cancellationToken);

            return new SqlUserTableDirectoryRecord(userId, userName, normalizedRole, email ?? normalizedEmail);
        }

        await reader.DisposeAsync();

        await using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = $@"
INSERT INTO {_options.TableName} (UserName, Role, Email, PasswordHash)
OUTPUT INSERTED.UserID
VALUES (@userName, @role, @email, @passwordHash);";
        insertCommand.Parameters.AddWithValue("@userName", normalizedUserName);
        insertCommand.Parameters.AddWithValue("@role", normalizedRole);
        insertCommand.Parameters.AddWithValue("@email", normalizedEmail);
        insertCommand.Parameters.AddWithValue("@passwordHash", ComputeSha256Hex(bootstrapOptions.Password.Trim()));

        var insertedUserId = Convert.ToInt32(await insertCommand.ExecuteScalarAsync(cancellationToken));
        return new SqlUserTableDirectoryRecord(insertedUserId, normalizedUserName, normalizedRole, normalizedEmail);
    }

    public bool MatchesPassword(string suppliedPassword, string storedPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(storedPasswordHash))
        {
            return false;
        }

        var trimmedInput = suppliedPassword.Trim();
        if (_options.AcceptPreHashedPassword
            && string.Equals(trimmedInput, storedPasswordHash, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var hashedInput = ComputeSha256Hex(trimmedInput);
        return string.Equals(hashedInput, storedPasswordHash, StringComparison.OrdinalIgnoreCase);
    }

    public static string ComputeSha256Hex(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
