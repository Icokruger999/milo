# Deployment Validation Script
# Validates that deployment rules are not violated before deploying
# Run this script before any deployment to ensure ports and infrastructure configs haven't changed

param(
    [switch]$Strict = $false  # If true, fails on any warning. If false, only fails on critical errors.
)

$ErrorActionPreference = "Stop"
$validationErrors = @()
$validationWarnings = @()
$passedChecks = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT VALIDATION CHECK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a file contains a specific port
function Test-PortInFile {
    param(
        [string]$FilePath,
        [string]$ExpectedPort,
        [string[]]$ForbiddenPorts = @(),
        [string]$Description
    )
    
    if (-not (Test-Path $FilePath)) {
        $script:validationErrors += "❌ File not found: $FilePath"
        return $false
    }
    
    $content = Get-Content $FilePath -Raw
    
    # Check if expected port is present
    if ($ExpectedPort -and $content -notmatch ":$ExpectedPort[^0-9]") {
        $script:validationErrors += "❌ CRITICAL: $Description - Expected port $ExpectedPort not found in $FilePath"
        return $false
    }
    
    # Check for forbidden ports
    foreach ($port in $ForbiddenPorts) {
        if ($content -match ":$port[^0-9]") {
            $script:validationErrors += "❌ CRITICAL: $Description - Forbidden port $port found in $FilePath"
            return $false
        }
    }
    
    $script:passedChecks++
    Write-Host "✅ $Description" -ForegroundColor Green
    return $true
}

# Function to check if file has been modified (using git)
function Test-FileModified {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    if (-not (Test-Path $FilePath)) {
        return $false
    }
    
    try {
        $gitStatus = git status --porcelain $FilePath 2>&1
        if ($gitStatus -match "^[AM]") {
            $script:validationWarnings += "⚠️  WARNING: $Description - File has been modified: $FilePath"
            if ($Strict) {
                $script:validationErrors += "❌ STRICT MODE: $Description - File modification not allowed: $FilePath"
            }
            return $true
        }
    } catch {
        # Git might not be available or file not tracked
        return $false
    }
    
    return $false
}

Write-Host "Checking Port Configurations..." -ForegroundColor Yellow
Write-Host ""

# Check 1: API Service File - Port 8080
Test-PortInFile `
    -FilePath "backend/Milo.API/Services/milo-backend.service" `
    -ExpectedPort "8080" `
    -ForbiddenPorts @("4000", "5000", "5001", "8000") `
    -Description "API Service Port (must be 8080)"

# Check 2: Docker Compose - PostgreSQL Port 5432
Test-PortInFile `
    -FilePath "docker-compose.yml" `
    -ExpectedPort "5432" `
    -Description "PostgreSQL Port (must be 5432)"

# Check 3: Docker Compose - PgBouncer Port 6432
Test-PortInFile `
    -FilePath "docker-compose.yml" `
    -ExpectedPort "6432" `
    -Description "PgBouncer Port (must be 6432)"

# Check 4: Connection String - PgBouncer Port 6432
if (Test-Path "backend/Milo.API/appsettings.json") {
    $appsettings = Get-Content "backend/Milo.API/appsettings.json" -Raw
    if ($appsettings -match 'Port=6432') {
        $script:passedChecks++
        Write-Host "✅ Connection String uses PgBouncer port 6432" -ForegroundColor Green
    } else {
        $script:validationErrors += "❌ CRITICAL: Connection string must use port 6432 (PgBouncer)"
    }
    
    # Check for forbidden ports in connection string
    if ($appsettings -match 'Port=(4000|5000|5001|8000|5432)[^0-9]') {
        $script:validationErrors += "❌ CRITICAL: Connection string should use PgBouncer port 6432, not direct PostgreSQL port"
    }
} else {
    $script:validationErrors += "❌ appsettings.json not found"
}

Write-Host ""
Write-Host "Checking for Infrastructure Changes..." -ForegroundColor Yellow
Write-Host ""

# Check 5: Service file modifications
Test-FileModified `
    -FilePath "backend/Milo.API/Services/milo-backend.service" `
    -Description "Service File"

# Check 6: Docker compose modifications
Test-FileModified `
    -FilePath "docker-compose.yml" `
    -Description "Docker Compose"

# Check 7: appsettings.json modifications (warn only, as this might be needed)
if (Test-FileModified -FilePath "backend/Milo.API/appsettings.json" -Description "appsettings.json") {
    Write-Host "⚠️  appsettings.json has been modified (this may be intentional)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checking for Nginx Config References..." -ForegroundColor Yellow
Write-Host ""

# Check 8: Look for any scripts that modify nginx configs (exclude diagnostic/read-only scripts)
$nginxModifyingScripts = Get-ChildItem -Path . -Filter "*.json" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { 
        # Skip diagnostic/check scripts (read-only)
        if ($_.Name -match "check-|find-|test-|verify-") { return $false }
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        if ($null -eq $content) { return $false }
        ($content -match "nginx|milo-api\.conf|00-summit-api\.conf") -and 
        (($content -match "(sed|tee).*nginx|sudo.*nginx.*conf") -or ($content -match "systemctl.*reload.*nginx"))
    }

if ($nginxModifyingScripts) {
    foreach ($script in $nginxModifyingScripts) {
        $script:validationWarnings += "⚠️  WARNING: Script may modify nginx config: $($script.FullName)"
        if ($Strict) {
            $script:validationErrors += "❌ STRICT MODE: Nginx config modification detected in: $($script.FullName)"
        }
    }
} else {
    $script:passedChecks++
    Write-Host "✅ No nginx modification scripts detected" -ForegroundColor Green
}

Write-Host ""
Write-Host "Summary of Changes..." -ForegroundColor Yellow
Write-Host ""

# Check what files are staged/modified
try {
    $modifiedFiles = git diff --name-only HEAD 2>&1
    $stagedFiles = git diff --cached --name-only 2>&1
    
    $allChangedFiles = ($modifiedFiles + $stagedFiles) | Where-Object { $_ } | Sort-Object -Unique
    
    $infrastructureFiles = @(
        "backend/Milo.API/Services/milo-backend.service",
        "docker-compose.yml",
        "backend/Milo.API/appsettings.json",
        "backend/Milo.API/publish/appsettings.json"
    )
    
    $changedInfraFiles = $allChangedFiles | Where-Object { 
        $file = $_
        $infrastructureFiles | Where-Object { $file -like "*$_*" }
    }
    
    if ($changedInfraFiles) {
        Write-Host "⚠️  Infrastructure files have been modified:" -ForegroundColor Yellow
        foreach ($file in $changedInfraFiles) {
            Write-Host "   - $file" -ForegroundColor Yellow
            $script:validationWarnings += "⚠️  Infrastructure file modified: $file"
            if ($Strict) {
                $script:validationErrors += "❌ STRICT MODE: Infrastructure file modification: $file"
            }
        }
    } else {
        $script:passedChecks++
        Write-Host "✅ No infrastructure files modified" -ForegroundColor Green
    }
    
    # Show code-only changes
    $codeFiles = $allChangedFiles | Where-Object { 
        $_ -like "backend/Milo.API/Controllers/*" -or
        $_ -like "backend/Milo.API/Services/*.cs" -or
        $_ -like "backend/Milo.API/Models/*" -or
        $_ -like "backend/Milo.API/Data/*" -or
        $_ -like "frontend/**/*"
    } | Where-Object { 
        $_ -notlike "*appsettings.json" -and
        $_ -notlike "*milo-backend.service"
    }
    
    if ($codeFiles) {
        Write-Host ""
        Write-Host "✅ Code files changed (this is expected):" -ForegroundColor Green
        foreach ($file in $codeFiles) {
            Write-Host "   + $file" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "⚠️  Could not check git status (git may not be available)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VALIDATION RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Passed Checks: $passedChecks" -ForegroundColor Green

if ($validationWarnings.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Warnings: $($validationWarnings.Count)" -ForegroundColor Yellow
    foreach ($warning in $validationWarnings) {
        Write-Host "   $warning" -ForegroundColor Yellow
    }
}

if ($validationErrors.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ ERRORS: $($validationErrors.Count)" -ForegroundColor Red
    foreach ($error in $validationErrors) {
        Write-Host "   $error" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "🚫 DEPLOYMENT BLOCKED - Please fix the errors above" -ForegroundColor Red
    Write-Host "   See DEPLOYMENT_RULES.md for guidelines" -ForegroundColor Red
    exit 1
}

if ($validationWarnings.Count -gt 0 -and $Strict) {
    Write-Host ""
    Write-Host "🚫 DEPLOYMENT BLOCKED - Warnings found in strict mode" -ForegroundColor Red
    exit 1
}

if ($validationWarnings.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Warnings found but deployment allowed (use -Strict to block)" -ForegroundColor Yellow
    Write-Host "   Review warnings above before proceeding" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ VALIDATION PASSED - Deployment can proceed" -ForegroundColor Green
Write-Host ""
exit 0
