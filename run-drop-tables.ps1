# Run the drop tables utility using the existing backend project
Write-Host "========================================="
Write-Host "Dropping All Tables in Supabase"
Write-Host "========================================="
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend\Milo.API\Milo.API.csproj")) {
    Write-Host "Error: Must run from project root directory"
    exit 1
}

# Try to find dotnet in common locations
$dotnetPaths = @(
    "C:\Program Files\dotnet\dotnet.exe",
    "C:\Program Files (x86)\dotnet\dotnet.exe",
    "$env:ProgramFiles\dotnet\dotnet.exe",
    "$env:ProgramFiles(x86)\dotnet\dotnet.exe"
)

$dotnet = $null
foreach ($path in $dotnetPaths) {
    if (Test-Path $path) {
        $dotnet = $path
        break
    }
}

if (-not $dotnet) {
    Write-Host "Error: .NET SDK not found. Please install .NET SDK or run SQL manually in Supabase SQL Editor."
    Write-Host ""
    Write-Host "SQL Script location: drop-all-tables-astutetech.sql"
    Write-Host "Instructions: EXECUTE_SQL_NOW.md"
    exit 1
}

Write-Host "Found .NET SDK at: $dotnet"
Write-Host ""

# Create a simple console app to execute SQL
$tempDir = Join-Path $env:TEMP "drop-tables-$(Get-Random)"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

try {
    # Create project file
    $csproj = @"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />
  </ItemGroup>
</Project>
"@
    
    $program = @"
using Npgsql;

var connString = "Host=db.vaugklgudfvmtscoxacc.supabase.co;Port=5432;Database=astutetech;Username=postgres;Password=FlVT6=Lps0E!l5cg;SSL Mode=Require";

try {
    Console.WriteLine("Connecting to Supabase...");
    using var conn = new NpgsqlConnection(connString);
    conn.Open();
    Console.WriteLine("✓ Connected!");
    Console.WriteLine("");
    
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
SELECT COUNT(*) AS remaining_tables FROM pg_tables WHERE schemaname = 'public';
"";
    
    Console.WriteLine("Executing SQL to drop all tables...");
    using var cmd = new NpgsqlCommand(sql, conn);
    using var reader = cmd.ExecuteReader();
    
    while (reader.Read()) {
        Console.WriteLine($"Remaining tables: {reader[0]}");
    }
    
    Console.WriteLine("");
    Console.WriteLine("✓ All tables dropped successfully!");
} catch (Exception ex) {
    Console.WriteLine($"✗ Error: {ex.Message}");
    Environment.Exit(1);
}
"@
    
    Set-Content -Path "$tempDir\Program.cs" -Value $program
    Set-Content -Path "$tempDir\DropTables.csproj" -Value $csproj
    
    Push-Location $tempDir
    & $dotnet restore --quiet
    & $dotnet run
} finally {
    Pop-Location
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
}
