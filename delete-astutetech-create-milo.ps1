# Delete astutetech database and create milo database in Supabase
$supabaseUrl = "https://vaugklgudfvmtscoxacc.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWdrbGd1ZGZ2bXRzY294YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQyNDQxMCwiZXhwIjoyMDc5MDAwNDEwfQ.3zLO00Ufw0TB2dXUPq_tQjQrLQ8iHytkJrvj_zzEpZE"

Write-Host "========================================="
Write-Host "Deleting 'astutetech' database"
Write-Host "Creating 'milo' database in Supabase"
Write-Host "========================================="
Write-Host ""

# SQL script to delete astutetech and create milo
$sql = @"
-- Terminate connections to astutetech database
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'astutetech'
  AND pid <> pg_backend_pid();

-- Drop astutetech database
DROP DATABASE IF EXISTS astutetech;

-- Terminate connections to milo database (if exists)
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'milo'
  AND pid <> pg_backend_pid();

-- Drop milo database if exists
DROP DATABASE IF EXISTS milo;

-- Create new milo database
CREATE DATABASE milo
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE milo TO postgres;
"@

Write-Host "SQL Script:"
Write-Host "==========="
Write-Host $sql
Write-Host ""

# Try to execute via Supabase REST API
$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Supabase REST API endpoint for executing SQL
# Note: CREATE DATABASE might not work via REST API, but let's try
$body = @{
    query = $sql
} | ConvertTo-Json

Write-Host "Attempting to execute SQL via Supabase REST API..."
Write-Host ""

try {
    # Try using PostgREST rpc endpoint or SQL execution endpoint
    # Supabase doesn't have a direct SQL execution endpoint via REST
    # We need to use the SQL Editor API or Management API
    
    Write-Host "Note: Supabase REST API doesn't support CREATE DATABASE directly."
    Write-Host "You need to run this SQL in the Supabase SQL Editor."
    Write-Host ""
    Write-Host "To execute:"
    Write-Host "1. Go to: $supabaseUrl"
    Write-Host "2. Navigate to SQL Editor"
    Write-Host "3. Copy and paste the SQL above"
    Write-Host "4. Click 'Run'"
    Write-Host ""
    
    # Save SQL to file
    $sql | Out-File -FilePath "delete-astutetech-create-milo.sql" -Encoding UTF8
    Write-Host "SQL script saved to: delete-astutetech-create-milo.sql"
    Write-Host ""
    
    # Try using Supabase Management API (if available)
    # Actually, let's try using the Supabase client library approach
    # Or use psql if available on the system
    
    Write-Host "Alternative: Using psql (if PostgreSQL client is installed)"
    Write-Host "============================================================"
    Write-Host ""
    Write-Host "If you have psql installed, you can run:"
    Write-Host "psql -h db.vaugklgudfvmtscoxacc.supabase.co -U postgres -d postgres -f delete-astutetech-create-milo.sql"
    Write-Host ""
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run the SQL script manually in Supabase SQL Editor."
}
