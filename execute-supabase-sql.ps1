# Execute SQL in Supabase using Management API or REST API
$supabaseUrl = "https://vaugklgudfvmtscoxacc.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWdrbGd1ZGZ2bXRzY294YWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQyNDQxMCwiZXhwIjoyMDc5MDAwNDEwfQ.3zLO00Ufw0TB2dXUPq_tQjQrLQ8iHytkJrvj_zzEpZE"

$sqlFile = "delete-astutetech-create-milo.sql"
$sql = Get-Content $sqlFile -Raw

Write-Host "Executing SQL via Supabase API..."
Write-Host ""

# Supabase doesn't provide a direct SQL execution endpoint via REST API
# However, we can try using the Supabase Management API
# Or use the Supabase CLI if installed

# Try using Supabase REST API with rpc (stored procedure) approach
# But CREATE DATABASE requires superuser privileges and can't be executed via REST

# Best approach: Use Supabase SQL Editor API or Management API
# Let's try the Management API endpoint

$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
}

# Try Supabase Management API endpoint (if available)
$managementUrl = "$supabaseUrl/rest/v1/rpc/exec_sql"

$body = @{
    query = $sql
} | ConvertTo-Json

try {
    Write-Host "Attempting to execute via Supabase Management API..."
    $response = Invoke-RestMethod -Uri $managementUrl -Method Post -Headers $headers -Body $body
    Write-Host "Success! Database created." -ForegroundColor Green
    Write-Host $response
} catch {
    Write-Host "Management API not available or CREATE DATABASE not supported via REST"
    Write-Host ""
    Write-Host "Please execute the SQL manually:"
    Write-Host "1. Go to: $supabaseUrl/project/vaugklgudfvmtscoxacc/sql/new"
    Write-Host "2. Copy SQL from: $sqlFile"
    Write-Host "3. Click 'Run'"
}
