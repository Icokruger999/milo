# Create milo database in Supabase using REST API
$supabaseUrl = "https://vaugklgudfvmtscoxacc.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWdrbGd1ZGZ2bXRzY294YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQyNDQxMCwiZXhwIjoyMDc5MDAwNDEwfQ.3zLO00Ufw0TB2dXUPq_tQjQrLQ8iHytkJrvj_zzEpZE"

Write-Host "========================================="
Write-Host "Creating 'milo' database in Supabase"
Write-Host "========================================="
Write-Host ""

# Note: Supabase REST API doesn't support CREATE DATABASE via REST
# We need to use the SQL Editor or PostgREST
# However, we can use the Supabase Management API or SQL Editor

# Try using Supabase REST API to execute SQL
$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
}

# SQL to create database (must be run in SQL Editor, not via REST)
$sql = @"
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'milo'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS milo;

CREATE DATABASE milo
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

GRANT ALL PRIVILEGES ON DATABASE milo TO postgres;
"@

Write-Host "SQL Script to execute:"
Write-Host "===================="
Write-Host $sql
Write-Host ""
Write-Host "To execute this SQL:"
Write-Host "1. Go to: $supabaseUrl"
Write-Host "2. Navigate to SQL Editor"
Write-Host "3. Copy and paste the SQL above"
Write-Host "4. Click 'Run'"
Write-Host ""
Write-Host "OR use this direct link to SQL Editor:"
Write-Host "$supabaseUrl/project/vaugklgudfvmtscoxacc/sql/new"
Write-Host ""

# Save SQL to file
$sql | Out-File -FilePath "create-milo-db.sql" -Encoding UTF8
Write-Host "SQL script saved to: create-milo-db.sql"
Write-Host ""
