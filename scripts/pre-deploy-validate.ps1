# PRE-DEPLOYMENT VALIDATION SCRIPT
# Run this BEFORE every backend deployment to catch common issues

param(
    [Parameter(Mandatory=$false)]
    [string]$ChangedFiles = ""
)

Write-Host "🔍 PRE-DEPLOYMENT VALIDATION STARTING..." -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# ============================================
# CHECK 1: Protected Files
# ============================================
Write-Host "📋 CHECK 1: Verifying protected files not modified..." -ForegroundColor Yellow

$protectedFiles = @(
    "milo/backend/Milo.API/appsettings.json",
    "milo/docker-compose.yml",
    "milo/backend/Milo.API/Services/milo-backend.service"
)

foreach ($file in $protectedFiles) {
    if ($ChangedFiles -like "*$file*") {
        $errors += "❌ PROTECTED FILE MODIFIED: $file"
    }
}

if ($errors.Count -eq 0) {
    Write-Host "   ✅ No protected files modified" -ForegroundColor Green
}

# ============================================
# CHECK 2: Database Column References
# ============================================
Write-Host "📋 CHECK 2: Checking for new database column references..." -ForegroundColor Yellow

# Check C# files for new properties that might reference database columns
$csharpFiles = Get-ChildItem -Path "milo/backend/Milo.API" -Filter "*.cs" -Recurse | 
    Where-Object { $_.FullName -notlike "*\obj\*" -and $_.FullName -notlike "*\bin\*" }

$suspiciousPatterns = @(
    "SubProjectId",
    "DepartmentId", 
    "TeamId"
)

foreach ($file in $csharpFiles) {
    $content = Get-Content $file.FullName -Raw
    foreach ($pattern in $suspiciousPatterns) {
        if ($content -match $pattern) {
            $warnings += "⚠️  Found '$pattern' in $($file.Name) - Verify database column exists!"
        }
    }
}

if ($warnings.Count -eq 0) {
    Write-Host "   ✅ No suspicious column references found" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Found potential database column references" -ForegroundColor Yellow
}

# ============================================
# CHECK 3: Build Test
# ============================================
Write-Host "📋 CHECK 3: Testing build..." -ForegroundColor Yellow

Push-Location "milo/backend/Milo.API"
$buildOutput = dotnet build --no-restore 2>&1
$buildSuccess = $LASTEXITCODE -eq 0
Pop-Location

if ($buildSuccess) {
    Write-Host "   ✅ Build successful" -ForegroundColor Green
} else {
    $errors += "❌ BUILD FAILED - Fix errors before deploying"
    Write-Host "   ❌ Build failed" -ForegroundColor Red
}

# ============================================
# CHECK 4: Syntax Errors in Controllers
# ============================================
Write-Host "📋 CHECK 4: Checking for common syntax errors..." -ForegroundColor Yellow

$controllerFiles = Get-ChildItem -Path "milo/backend/Milo.API/Controllers" -Filter "*.cs"

foreach ($file in $controllerFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Check for unmatched braces
    $openBraces = ($content.ToCharArray() | Where-Object { $_ -eq '{' }).Count
    $closeBraces = ($content.ToCharArray() | Where-Object { $_ -eq '}' }).Count
    
    if ($openBraces -ne $closeBraces) {
        $errors += "❌ SYNTAX ERROR in $($file.Name): Unmatched braces (Open: $openBraces, Close: $closeBraces)"
    }
}

if ($errors.Count -eq 0) {
    Write-Host "   ✅ No syntax errors detected" -ForegroundColor Green
}

# ============================================
# CHECK 5: Frontend JavaScript Errors
# ============================================
Write-Host "📋 CHECK 5: Checking frontend JavaScript..." -ForegroundColor Yellow

$jsFiles = Get-ChildItem -Path "milo/frontend/js" -Filter "*.js"

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Check for duplicate function definitions
    $functionNames = [regex]::Matches($content, 'function\s+(\w+)\s*\(') | ForEach-Object { $_.Groups[1].Value }
    $duplicates = $functionNames | Group-Object | Where-Object { $_.Count -gt 1 }
    
    if ($duplicates) {
        foreach ($dup in $duplicates) {
            $errors += "❌ DUPLICATE FUNCTION in $($file.Name): $($dup.Name) defined $($dup.Count) times"
        }
    }
}

if ($errors.Count -eq 0) {
    Write-Host "   ✅ No JavaScript errors detected" -ForegroundColor Green
}

# ============================================
# SUMMARY
# ============================================
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "VALIDATION SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED - Safe to deploy" -ForegroundColor Green
    exit 0
} else {
    if ($errors.Count -gt 0) {
        Write-Host "❌ ERRORS FOUND ($($errors.Count)):" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "   $error" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "🚨 FIX ERRORS BEFORE DEPLOYING!" -ForegroundColor Red
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  WARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   $warning" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "⚠️  VERIFY WARNINGS BEFORE DEPLOYING!" -ForegroundColor Yellow
    }
    
    exit 1
}
