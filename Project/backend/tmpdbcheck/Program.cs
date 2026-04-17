using System;
using System.Data;
using Microsoft.Data.SqlClient;

var cs = @"Server=tcp:detechtive-db.database.windows.net,1433;Initial Catalog=DeTechTiveDB;Persist Security Info=False;User ID=Don-Administrator;Password=CBzp*eQ#t5V^s4;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;";
using var conn = new SqlConnection(cs);
await conn.OpenAsync();
Console.WriteLine("OPEN_OK");
using var cmd = conn.CreateCommand();
cmd.CommandText = @"
SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN ('AspNetUsers','AspNetRoles','AspNetUserRoles')
ORDER BY TABLE_NAME;";
using var reader = await cmd.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    Console.WriteLine($"{reader.GetString(0)}.{reader.GetString(1)}");
}
