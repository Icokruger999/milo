# Connect to Supabase and execute SQL script
$dbHost = "db.vaugklgudfvmtscoxacc.supabase.co"
$dbName = "astutetech"
$dbUser = "postgres"
$dbPassword = "FlVT6=Lps0E!l5cg"
$dbPort = "5432"

$sqlScript = @"
-- Drop all tables with CASCADE to handle foreign key constraints
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
        RAISE NOTICE 'Dropped sequence: %', r.sequence_name;
    END LOOP;
END $$;

-- Verify tables are dropped
SELECT COUNT(*) AS remaining_tables FROM pg_tables WHERE schemaname = 'public';
"@

Write-Host "========================================="
Write-Host "Connecting to Supabase and Dropping Tables"
Write-Host "========================================="
Write-Host "Host: $dbHost"
Write-Host "Database: $dbName"
Write-Host ""

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    Write-Host "Found psql at: $($psqlPath.Source)"
    Write-Host "Executing SQL script..."
    Write-Host ""
    
    # Set PGPASSWORD environment variable
    $env:PGPASSWORD = $dbPassword
    
    # Execute SQL via psql
    $connectionString = "host=$dbHost port=$dbPort dbname=$dbName user=$dbUser sslmode=require"
    
    try {
        $result = $sqlScript | & psql -c $connectionString 2>&1
        Write-Host $result
        Write-Host ""
        Write-Host "SQL executed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Error executing SQL: $_" -ForegroundColor Red
    } finally {
        # Clear password from environment
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "psql not found. Attempting to install or use alternative method..." -ForegroundColor Yellow
    Write-Host ""
    
    # Try using Supabase REST API (limited support)
    Write-Host "Note: Supabase REST API doesn't support DROP TABLE commands."
    Write-Host "Please install PostgreSQL client (psql) or run the SQL in Supabase SQL Editor."
    Write-Host ""
    Write-Host "To install psql on Windows:"
    Write-Host "1. Download PostgreSQL from: https://www.postgresql.org/download/windows/"
    Write-Host "2. Or use Chocolatey: choco install postgresql"
    Write-Host ""
    Write-Host "SQL Script to run manually:"
    Write-Host "=========================="
    Write-Host $sqlScript
}
