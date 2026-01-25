# Deploy Frontend to Amplify/S3
# This script syncs the frontend folder to your hosting

Write-Host "Deploying Frontend Changes..." -ForegroundColor Green

# Check if AWS CLI is available
if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    exit 1
}

# Set the frontend directory
$frontendDir = "frontend"

# Your Amplify app ID or S3 bucket name
# Replace with your actual bucket/app
$bucketName = "codingeverest-amplify" # Update this with your actual bucket

Write-Host "Syncing frontend files to S3..." -ForegroundColor Yellow

# Sync the frontend directory
# This will upload all changed files
aws s3 sync $frontendDir s3://$bucketName/ --delete --exclude "*.md" --exclude ".git*"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Changes deployed:" -ForegroundColor Cyan
    Write-Host "  - Board: Fixed collapsed assignee spacing" -ForegroundColor White
    Write-Host "  - Board: Added Create Sub-Project button" -ForegroundColor White
    Write-Host "  - Board: Added Resend Invitation button" -ForegroundColor White
    Write-Host "  - Project Timeline: Added Create Sub-Project button" -ForegroundColor White
    Write-Host "  - Project Timeline: Sub-project grouping" -ForegroundColor White
    Write-Host "  - Roadmap: Task editing and sub-project support" -ForegroundColor White
    Write-Host ""
    Write-Host "Clear your browser cache (Ctrl+Shift+R) to see the changes!" -ForegroundColor Yellow
} else {
    Write-Host "✗ Deployment failed!" -ForegroundColor Red
    Write-Host "Please check your AWS credentials and bucket name." -ForegroundColor Yellow
}
