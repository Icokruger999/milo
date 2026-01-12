# Use .NET to connect to Supabase and execute SQL
$dbHost = "db.vaugklgudfvmtscoxacc.supabase.co"
$dbName = "astutetech"
$dbUser = "postgres"
$dbPassword = "FlVT6=Lps0E!l5cg"
$dbPort = "5432"

Write-Host "Connecting to Supabase using .NET..."
Write-Host ""

# Check if we can use dotnet CLI
$dotnetAvailable = Get-Command dotnet -ErrorAction SilentlyContinue

if ($dotnetAvailable) {
    Write-Host "Found .NET SDK"
    
    # Create a temporary C# program to execute SQL
    $tempDir = Join-Path $env:TEMP "supabase-sql-exec"
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
    
    $csproj = @"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Npgsql" Version="8.0.0" />
  </ItemGroup>
</Project>
"@
    
    $program = @"
using Npgsql;

var connString = "Host=$dbHost;Port=$dbPort;Database=$dbName;Username=$dbUser;Password=$dbPassword;SSL Mode=Require";

try {
    using var conn = new NpgsqlConnection(connString);
    conn.Open();
    Console.WriteLine("Connected to Supabase successfully!");
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
    
    using var cmd = new NpgsqlCommand(sql, conn);
    using var reader = cmd.ExecuteReader();
    
    while (reader.Read()) {
        Console.WriteLine($"Remaining tables: {reader[0]}");
    }
    
    Console.WriteLine("");
    Console.WriteLine("All tables dropped successfully!");
} catch (Exception ex) {
    Console.WriteLine($"Error: {ex.Message}");
    Environment.Exit(1);
}
"@
    
    Set-Content -Path "$tempDir\Program.cs" -Value $program
    Set-Content -Path "$tempDir\SupabaseSql.csproj" -Value $csproj
    
    Write-Host "Compiling and running SQL executor..."
    Push-Location $tempDir
    
    try {
        dotnet restore --quiet
        dotnet run
    } finally {
        Pop-Location
        Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    }
} else {
    Write-Host ".NET SDK not found. Please install .NET SDK or use Supabase SQL Editor."
}
