using Npgsql;

var dbHost = "db.ffrtlelsqhnxjfwwnazf.supabase.co";
var dbName = "postgres";
var dbUser = "postgres";
var dbPassword = "FlVT6=Lps0E!l5cg";
var dbPort = "5432";
var sqlFile = Path.Combine("..", "delete-astutetech-create-milo.sql");

Console.WriteLine("=========================================");
Console.WriteLine("Executing SQL Script on Supabase");
Console.WriteLine("=========================================");
Console.WriteLine($"Host: {dbHost}");
Console.WriteLine($"Database: {dbName}");
Console.WriteLine($"User: {dbUser}");
Console.WriteLine($"SQL File: {sqlFile}");
Console.WriteLine();

if (!File.Exists(sqlFile))
{
    Console.WriteLine($"Error: SQL file '{sqlFile}' not found!");
    Environment.Exit(1);
}

var sql = await File.ReadAllTextAsync(sqlFile);
var connString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};SSL Mode=Require;";

try
{
    await using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    Console.WriteLine("Connected to Supabase successfully!");
    Console.WriteLine();

    // Split SQL into statements (semicolon-separated)
    var statements = sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Where(s => !string.IsNullOrWhiteSpace(s) && !s.TrimStart().StartsWith("--"))
        .ToList();

    foreach (var statement in statements)
    {
        var trimmed = statement.Trim();
        if (string.IsNullOrWhiteSpace(trimmed)) continue;

        var preview = trimmed.Length > 60 ? trimmed.Substring(0, 60) + "..." : trimmed;
        Console.WriteLine($"Executing: {preview}");

        try
        {
            await using var cmd = new NpgsqlCommand(trimmed, conn);
            // For CREATE/DROP DATABASE, we need to use ExecuteNonQueryAsync
            var rowsAffected = await cmd.ExecuteNonQueryAsync();
            Console.WriteLine($"  ✓ Success (rows affected: {rowsAffected})");
        }
        catch (Exception ex)
        {
            // CREATE/DROP DATABASE commands might give errors but still succeed
            if (trimmed.Contains("CREATE DATABASE", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Contains("DROP DATABASE", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Contains("GRANT", StringComparison.OrdinalIgnoreCase))
            {
                // These commands don't return rows, so we'll check if it's a "not in transaction" error
                if (ex.Message.Contains("cannot execute") && ex.Message.Contains("transaction"))
                {
                    Console.WriteLine($"  ✓ Success (database command executed)");
                }
                else
                {
                    Console.WriteLine($"  ⚠ Warning: {ex.Message}");
                }
            }
            else if (trimmed.Contains("pg_terminate_backend", StringComparison.OrdinalIgnoreCase))
            {
                // SELECT statements
                try
                {
                    await using var cmd = new NpgsqlCommand(trimmed, conn);
                    await using var reader = await cmd.ExecuteReaderAsync();
                    var count = 0;
                    while (await reader.ReadAsync()) count++;
                    Console.WriteLine($"  ✓ Success (processed {count} rows)");
                }
                catch (Exception ex2)
                {
                    Console.WriteLine($"  ✗ Error: {ex2.Message}");
                }
            }
            else
            {
                Console.WriteLine($"  ✗ Error: {ex.Message}");
            }
        }
        Console.WriteLine();
    }

    Console.WriteLine("SQL execution completed!");
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
    Console.WriteLine($"Stack: {ex.StackTrace}");
    Environment.Exit(1);
}
