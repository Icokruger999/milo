# PowerShell script to create GitHub repository and push code
# This script will guide you through creating the repo and pushing

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Milo GitHub Repository Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if remote is already set
$remoteExists = git remote get-url origin 2>$null
if ($remoteExists) {
    Write-Host "Remote 'origin' is already set to: $remoteExists" -ForegroundColor Green
} else {
    Write-Host "Setting up remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/Icokruger999/Milo.git
    Write-Host "Remote added successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "STEP 1: Create the repository on GitHub" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow
Write-Host "1. Go to: https://github.com/new" -ForegroundColor White
Write-Host "2. Repository name: Milo" -ForegroundColor White
Write-Host "3. Description: Jira-type project management application" -ForegroundColor White
Write-Host "4. Choose Public or Private" -ForegroundColor White
Write-Host "5. DO NOT initialize with README, .gitignore, or license" -ForegroundColor Red
Write-Host "6. Click 'Create repository'" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Have you created the repository on GitHub? (y/n)"
if ($continue -ne "y") {
    Write-Host "Please create the repository first, then run this script again." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "STEP 2: Pushing code to GitHub..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

# Check current branch
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
try {
    git push -u origin main
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Repository pushed to GitHub" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your repository is now available at:" -ForegroundColor White
    Write-Host "https://github.com/Icokruger999/Milo" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "Error pushing to GitHub. Common issues:" -ForegroundColor Red
    Write-Host "1. Repository doesn't exist yet - create it first" -ForegroundColor Yellow
    Write-Host "2. Authentication required - you may need to:" -ForegroundColor Yellow
    Write-Host "   - Use a Personal Access Token instead of password" -ForegroundColor Yellow
    Write-Host "   - Or set up SSH keys" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Try running: git push -u origin main" -ForegroundColor Cyan
}

