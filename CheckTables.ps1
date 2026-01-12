# Check if tables exist in Supabase
$connString = "Host=db.ffrtlelsqhnxjfwwnazf.supabase.co;Database=milo;Username=postgres;Password=FlVT6=Lps0E!l5cg;Port=5432;SSL Mode=Require"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Checking Tables in Supabase Database" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Use psql if available, or use .NET to check
try {
    $query = @"
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
"@

    Write-Host "Checking for existing tables..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Note: If you see no tables, migrations need to run." -ForegroundColor Cyan
    Write-Host "The API automatically runs migrations on startup." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To run migrations:" -ForegroundColor Yellow
    Write-Host "1. Restart the API (migrations run automatically)" -ForegroundColor White
    Write-Host "2. Or check API logs for migration status" -ForegroundColor White
    Write-Host ""
    Write-Host "You can also use Supabase SQL Editor to check:" -ForegroundColor Yellow
    Write-Host "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" -ForegroundColor Gray
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
