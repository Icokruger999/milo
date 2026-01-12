using System;
using System.IO;
using System.Threading.Tasks;
using Npgsql;

class Program
{
    static async Task Main(string[] args)
    {
        var dbHost = "db.vaugklgudfvmtscoxacc.supabase.co";
        var dbName = "postgres";  // Must connect to postgres to create/drop databases
        var dbUser = "postgres";
        var dbPassword = "FlVT6=Lps0E!l5cg";
        var dbPort = "5432";
        var sqlFile = "delete-astutetech-create-milo.sql";

        Console.WriteLine("=========================================");
        Console.WriteLine("Executing SQL Script on Supabase");
        Console.WriteLine("=========================================");
        Console.WriteLine($"Host: {dbHost}");
        Console.WriteLine($"Database: {dbName}");
        Console.WriteLine($"User: {dbUser}");
        Console.WriteLine($"SQL File: {sqlFile}");
        Console.WriteLine();

        // Check if SQL file exists
        if (!File.Exists(sqlFile))
        {
            Console.WriteLine($"Error: SQL file '{sqlFile}' not found!");
            Environment.Exit(1);
        }

        // Read SQL file
        var sql = await File.ReadAllTextAsync(sqlFile);

        // Build connection string
        var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};SSL Mode=Require;";

        try
        {
            await using var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync();
            Console.WriteLine("Connected to Supabase successfully!");
            Console.WriteLine();

            // Split SQL into individual statements (semicolon-separated)
            var statements = sql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            
            foreach (var statement in statements)
            {
                var trimmedStatement = statement.Trim();
                if (string.IsNullOrWhiteSpace(trimmedStatement) || trimmedStatement.StartsWith("--"))
                    continue;

                Console.WriteLine($"Executing: {trimmedStatement.Substring(0, Math.Min(50, trimmedStatement.Length))}...");
                
                try
                {
                    await using var cmd = new NpgsqlCommand(trimmedStatement, conn);
                    var result = await cmd.ExecuteScalarAsync();
                    if (result != null)
                    {
                        Console.WriteLine($"Result: {result}");
                    }
                }
                catch (Exception ex)
                {
                    // Some statements like CREATE DATABASE return errors when run via Npgsql
                    // but they might still succeed. Check if it's a known issue.
                    if (ex.Message.Contains("CREATE DATABASE") || ex.Message.Contains("DROP DATABASE"))
                    {
                        Console.WriteLine($"Note: {ex.Message}");
                        Console.WriteLine("Database operations may need to be run in Supabase SQL Editor");
                    }
                    else
                    {
                        Console.WriteLine($"Error: {ex.Message}");
                    }
                }
            }

            Console.WriteLine();
            Console.WriteLine("SQL execution completed!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            Environment.Exit(1);
        }
    }
}
