// Temporary utility to drop all tables in Supabase
// Run this once to clean the database before migrations

using Microsoft.EntityFrameworkCore;
using Milo.API.Data;

var builder = WebApplication.CreateBuilder(args);

// Configure connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    Console.WriteLine("Error: Connection string not found in appsettings.json");
    Environment.Exit(1);
}

builder.Services.AddDbContext<MiloDbContext>(options =>
    options.UseNpgsql(connectionString));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<MiloDbContext>();
    var logger = scope.ServiceProvider.GetService<ILogger<Program>>();
    
    try
    {
        Console.WriteLine("=========================================");
        Console.WriteLine("Dropping All Tables in Supabase");
        Console.WriteLine("=========================================");
        Console.WriteLine("");
        
        // Get all table names
        var tables = await dbContext.Database.SqlQueryRaw<string>(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        ).ToListAsync();
        
        Console.WriteLine($"Found {tables.Count} tables to drop:");
        foreach (var table in tables)
        {
            Console.WriteLine($"  - {table}");
        }
        Console.WriteLine("");
        
        // Drop all tables
        var sql = @"
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
    
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
        RAISE NOTICE 'Dropped sequence: %', r.sequence_name;
    END LOOP;
END $$;
";
        
        await dbContext.Database.ExecuteSqlRawAsync(sql);
        
        // Verify
        var remaining = await dbContext.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'"
        ).FirstOrDefaultAsync();
        
        Console.WriteLine($"Remaining tables: {remaining}");
        Console.WriteLine("");
        Console.WriteLine("✓ All tables dropped successfully!");
        Console.WriteLine("");
        Console.WriteLine("Next: Deploy backend and migrations will create all tables.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"✗ Error: {ex.Message}");
        Console.WriteLine(ex.StackTrace);
        Environment.Exit(1);
    }
}
