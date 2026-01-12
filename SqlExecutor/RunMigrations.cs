using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;

// Simple migration runner
var builder = new ConfigurationBuilder()
    .SetBasePath(Path.Combine("..", "backend", "Milo.API"))
    .AddJsonFile("appsettings.json", optional: false);

var configuration = builder.Build();
var connectionString = configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrEmpty(connectionString))
{
    Console.WriteLine("Error: Connection string not found in appsettings.json");
    Environment.Exit(1);
}

Console.WriteLine("=========================================");
Console.WriteLine("Running Database Migrations");
Console.WriteLine("=========================================");
Console.WriteLine("Connection: " + connectionString.Split(';').First());
Console.WriteLine("");

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
        Console.WriteLine("Applying migrations...");
        Console.WriteLine("");
        
        // Get pending migrations
        var pendingMigrations = await context.Database.GetPendingMigrationsAsync();
        if (pendingMigrations.Any())
        {
            Console.WriteLine($"Found {pendingMigrations.Count()} pending migration(s):");
            foreach (var migration in pendingMigrations)
            {
                Console.WriteLine($"  - {migration}");
            }
            Console.WriteLine("");
        }
        else
        {
            Console.WriteLine("No pending migrations found.");
        }
        
        // Apply migrations
        await context.Database.MigrateAsync();
        
        Console.WriteLine("");
        Console.WriteLine("✓ Migrations applied successfully!");
        Console.WriteLine("");
        
        // Show applied migrations
        var appliedMigrations = await context.Database.GetAppliedMigrationsAsync();
        Console.WriteLine($"Applied {appliedMigrations.Count()} migration(s):");
        foreach (var migration in appliedMigrations)
        {
            Console.WriteLine($"  ✓ {migration}");
        }
    }
}
catch (Exception ex)
{
    Console.WriteLine($"✗ Error: {ex.Message}");
    Console.WriteLine("");
    Console.WriteLine("Stack trace:");
    Console.WriteLine(ex.StackTrace);
    Environment.Exit(1);
}

// We need to reference the DbContext - let's add it as a project reference instead
// For now, let's use a different approach - load the assembly
partial class MiloDbContext : DbContext
{
    // This is a placeholder - we'll need to reference the actual project
}
