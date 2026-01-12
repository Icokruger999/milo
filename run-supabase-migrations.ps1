# Script to run Entity Framework migrations in Supabase
# This uses the RunSupabaseMigrations.csproj project

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Migrations in Supabase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .NET SDK is installed
Write-Host "Checking .NET SDK..." -ForegroundColor Yellow
try {
    $dotnetVersion = dotnet --version 2>&1
    Write-Host ".NET SDK found: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host ".NET SDK not found. Please install .NET SDK 8.0 or later." -ForegroundColor Red
    exit 1
}

# Check if MigrationRunner directory exists
if (-not (Test-Path "MigrationRunner\MigrationRunner.csproj")) {
    Write-Host "Error: MigrationRunner project not found" -ForegroundColor Red
    Write-Host "Make sure you're in the project root directory (c:\milo)" -ForegroundColor Yellow
    exit 1
}

# Check if appsettings.json exists in backend/Milo.API
if (-not (Test-Path "backend\Milo.API\appsettings.json")) {
    Write-Host "Error: backend\Milo.API\appsettings.json not found" -ForegroundColor Red
    Write-Host "Make sure your connection string is configured" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Running migrations..." -ForegroundColor Yellow
Write-Host "This will create all tables in your Supabase database" -ForegroundColor Cyan
Write-Host ""

# Restore and run
dotnet restore MigrationRunner\MigrationRunner.csproj
if ($LASTEXITCODE -ne 0) {
    Write-Host "Restore failed!" -ForegroundColor Red
    exit 1
}

dotnet run --project MigrationRunner\MigrationRunner.csproj

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Migrations completed successfully!" -ForegroundColor Green
    Write-Host "All tables have been created in Supabase" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Migration failed. Check the error messages above." -ForegroundColor Red
    exit 1
}
