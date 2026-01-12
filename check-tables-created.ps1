# Check if tables were created in Supabase
$supabaseUrl = "https://ffrtlelsqhnxjfwwnazf.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcnRsZWxzcWhueGpmd3duYXpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODEzNDc2OSwiZXhwIjoyMDgzNzEwNzY5fQ.D0rzamjQ90JUTIUg_ipB0xBkinB6Fm9yrVJCBsBb0g4"

Write-Host "========================================="
Write-Host "Checking Tables in Supabase Database"
Write-Host "========================================="
Write-Host ""

$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
}

# Try to query the tables using Supabase REST API
$tablesEndpoint = "$supabaseUrl/rest/v1/rpc/get_tables"

# Or use PostgREST to list tables
$sqlQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

Write-Host "To check if tables were created:"
Write-Host "1. Go to: $supabaseUrl"
Write-Host "2. Navigate to Table Editor"
Write-Host "3. You should see all tables listed"
Write-Host ""
Write-Host "Or check backend logs on EC2 to see if migrations ran:"
Write-Host "ssh to EC2 and run: sudo journalctl -u milo-api -n 100 | grep -i migration"
Write-Host ""
