# Script to create milo database in Supabase using REST API
param(
    [string]$SupabaseUrl = "https://vaugklgudfvmtscoxacc.supabase.co",
    [string]$ServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWdrbGd1ZGZ2bXRzY294YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQyNDQxMCwiZXhwIjoyMDc5MDAwNDEwfQ.3zLO00Ufw0TB2dXUPq_tQjQrLQ8iHytkJrvj_zzEpZE"
)

$projectRef = "vaugklgudfvmtscoxacc"
$dbHost = "db.$projectRef.supabase.co"

Write-Host "========================================="
Write-Host "Creating 'milo' database in Supabase"
Write-Host "========================================="
Write-Host "Project: $SupabaseUrl"
Write-Host "Database Host: $dbHost"
Write-Host ""

# Note: Supabase REST API doesn't support CREATE DATABASE directly
# We need to use the SQL Editor or psql
# But we can prepare the connection string

Write-Host "To create the database, you have two options:"
Write-Host ""
Write-Host "Option 1: Use Supabase SQL Editor (Recommended)"
Write-Host "1. Go to: $SupabaseUrl"
Write-Host "2. Navigate to SQL Editor"
Write-Host "3. Run the SQL script from: setup-supabase-milo-database.sql"
Write-Host ""
Write-Host "Option 2: Use psql command line"
Write-Host "psql -h $dbHost -U postgres -d postgres -c `"CREATE DATABASE milo;`""
Write-Host ""
Write-Host "After creating the database, you'll need:"
Write-Host "- Database password (from Supabase Settings > Database)"
Write-Host "- Then update appsettings.json with the connection string"
Write-Host ""

# Generate the connection string template
$connectionStringTemplate = "Host=$dbHost;Database=milo;Username=postgres;Password=YOUR_PASSWORD;Port=5432;SSL Mode=Require"

Write-Host "Connection string template:"
Write-Host $connectionStringTemplate
Write-Host ""
