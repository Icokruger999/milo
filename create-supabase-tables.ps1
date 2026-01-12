# Script to create tables in Supabase using Entity Framework migrations
# This script compiles and runs the migration runner

Write-Host "Creating tables in Supabase database..." -ForegroundColor Cyan
Write-Host ""

$projectPath = "backend\Milo.API"
$migrationRunner = "RunSupabaseMigrations.cs"

if (-not (Test-Path $migrationRunner)) {
    Write-Host "Error: $migrationRunner not found" -ForegroundColor Red
    Write-Host "Creating migration runner..." -ForegroundColor Yellow
    
    # Create a simple migration runner script
    $runnerCode = @'
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Milo.API.Data;

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

try
{
    var connBuilder = new NpgsqlConnectionStringBuilder(connectionString);
    connBuilder.SslMode = SslMode.Require;
    
    var optionsBuilder = new DbContextOptionsBuilder<MiloDbContext>();
    optionsBuilder.UseNpgsql(connBuilder.ConnectionString);
    
    using (var context = new MiloDbContext(optionsBuilder.Options))
    {
        Console.WriteLine("Applying migrations...");
        await context.Database.MigrateAsync();
        Console.WriteLine("✓ Migrations applied successfully!");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"✗ Error: {ex.Message}");
    if (ex.InnerException != null)
    {
        Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
    }
    Environment.Exit(1);
}
'@
    
    Write-Host "Migration runner would be created here, but it's better to use the existing RunSupabaseMigrations.cs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To create tables in Supabase, you have two options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Run migrations via .NET (Recommended)" -ForegroundColor Yellow
Write-Host "  cd backend\Milo.API"
Write-Host "  dotnet run --project ..\..\RunSupabaseMigrations.csproj"
Write-Host ""
Write-Host "Option 2: Use Supabase SQL Editor" -ForegroundColor Yellow
Write-Host "  1. Go to your Supabase dashboard"
Write-Host "  2. Open SQL Editor"
Write-Host "  3. Make sure you're connected to the 'postgres' database (not 'milo')"
Write-Host "  4. First run: delete-astutetech-create-milo.sql to create the database"
Write-Host "  5. Then run the migrations SQL script (if available)"
Write-Host ""
Write-Host "Note: The application will also automatically run migrations when it starts." -ForegroundColor Gray
Write-Host ""
