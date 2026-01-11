# Execute SQL via Supabase REST API
$supabaseUrl = "https://vaugklgudfvmtscoxacc.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWdrbGd1ZGZ2bXRzY294YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQyNDQxMCwiZXhwIjoyMDc5MDAwNDEwfQ.3zLO00Ufw0TB2dXUPq_tQjQrLQ8iHytkJrvj_zzEpZE"

$sql = @"
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
"@

Write-Host "========================================="
Write-Host "Executing SQL via Supabase API"
Write-Host "========================================="
Write-Host ""

$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Try Supabase PostgREST RPC endpoint (if a function exists)
# Or try the Management API endpoint
$endpoints = @(
    "$supabaseUrl/rest/v1/rpc/exec_sql",
    "$supabaseUrl/rest/v1/rpc/execute_sql",
    "$supabaseUrl/api/v1/sql",
    "$supabaseUrl/v1/sql"
)

$body = @{
    query = $sql
} | ConvertTo-Json

foreach ($endpoint in $endpoints) {
    try {
        Write-Host "Trying endpoint: $endpoint"
        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "Success! Response:" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json -Depth 10)
        exit 0
    } catch {
        Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================="
Write-Host "API Execution Not Available"
Write-Host "========================================="
Write-Host ""
Write-Host "Supabase doesn't support executing DROP TABLE via REST API for security reasons."
Write-Host ""
Write-Host "Please execute the SQL manually in Supabase SQL Editor:"
Write-Host "1. Go to: $supabaseUrl"
Write-Host "2. Navigate to SQL Editor"
Write-Host "3. Copy the SQL below and paste it"
Write-Host "4. Click 'Run'"
Write-Host ""
Write-Host "SQL Script:"
Write-Host "==========="
Write-Host $sql
Write-Host ""
