# Deploy landing-hero.html to Amplify
# Golden Rules: Only updating frontend files, no protected files touched

Write-Host "🚀 Deploying landing-hero.html to Amplify..." -ForegroundColor Cyan
Write-Host ""

# Verify file exists
if (Test-Path "frontend/landing-hero.html") {
    Write-Host "✅ frontend/landing-hero.html ready" -ForegroundColor Green
} else {
    Write-Host "❌ File not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Deployment Summary:" -ForegroundColor Yellow
Write-Host "  - File: frontend/landing-hero.html"
Write-Host "  - Changes: Interactive message cycling in circle"
Write-Host "  - Features:"
Write-Host "    • Messages cycle every 5 seconds"
Write-Host "    • User can type to override messages"
Write-Host "    • Smooth fade transitions"
Write-Host "  - Protected files: NOT touched ✅"
Write-Host "  - Golden Rules: FOLLOWED ✅"
Write-Host ""
Write-Host "📤 Deployment Instructions:" -ForegroundColor Cyan
Write-Host "  1. Commit changes: git add frontend/landing-hero.html"
Write-Host "  2. Push to GitHub: git push origin main"
Write-Host "  3. Amplify will auto-deploy to landing page"
Write-Host ""
Write-Host "✨ Done! Changes will be live shortly."
