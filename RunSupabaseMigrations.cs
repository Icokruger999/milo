using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Milo.API.Data;

// Simple migration runner
var builder = new ConfigurationBuilder()
    .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "backend", "Milo.API"))
    .AddJsonFile("appsettings.json", optional: false);

var configuration = builder.Build();
var connectionString = configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrEmpty(connectionString))
{
    Console.WriteLine("Error: Connection string not found in appsettings.json");
    Environment.Exit(1);
}

Console.WriteLine("=========================================");
Console.WriteLine("Running Database Migrations for Supabase");
Console.WriteLine("=========================================");

// Parse connection string to show database
try
{
    var connBuilder = new NpgsqlConnectionStringBuilder(connectionString);
    Console.WriteLine($"Database: {connBuilder.Database}");
    Console.WriteLine($"Host: {connBuilder.Host}");
    Console.WriteLine();
}
catch
{
    Console.WriteLine("Connection string configured");
    Console.WriteLine();
}

try
{
    // Parse connection string
    var connBuilder = new NpgsqlConnectionStringBuilder(connectionString);
    connBuilder.SslMode = SslMode.Require;
    
    // Create options builder
    var optionsBuilder = new DbContextOptionsBuilder<MiloDbContext>();
    optionsBuilder.UseNpgsql(connBuilder.ConnectionString);
    
    using (var context = new MiloDbContext(optionsBuilder.Options))
    {
        Console.WriteLine("Checking pending migrations...");
        Console.WriteLine();
        
        // Get pending migrations
        var pendingMigrations = await context.Database.GetPendingMigrationsAsync();
        if (pendingMigrations.Any())
        {
            Console.WriteLine($"Found {pendingMigrations.Count()} pending migration(s):");
            foreach (var migration in pendingMigrations)
            {
                Console.WriteLine($"  - {migration}");
            }
            Console.WriteLine();
        }
        else
        {
            Console.WriteLine("No pending migrations found.");
            Console.WriteLine();
        }
        
        // Apply migrations
        Console.WriteLine("Applying migrations...");
        await context.Database.MigrateAsync();
        
        Console.WriteLine();
        Console.WriteLine("✓ Migrations applied successfully!");
        Console.WriteLine();
        
        // Show applied migrations
        var appliedMigrations = await context.Database.GetAppliedMigrationsAsync();
        Console.WriteLine($"Applied {appliedMigrations.Count()} migration(s):");
        foreach (var migration in appliedMigrations)
        {
            Console.WriteLine($"  ✓ {migration}");
        }
        
        Console.WriteLine();
        Console.WriteLine("=========================================");
        Console.WriteLine("All tables have been created in Supabase!");
        Console.WriteLine("=========================================");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"✗ Error: {ex.Message}");
    Console.WriteLine();
    if (ex.InnerException != null)
    {
        Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
        Console.WriteLine();
    }
    Console.WriteLine("Stack trace:");
    Console.WriteLine(ex.StackTrace);
    Environment.Exit(1);
}
