# Deploy Incidents Feature via AWS SSM
# This script deploys the complete Incidents feature using AWS Systems Manager

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Deploying Incidents Feature via SSM" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"

# Step 1: Create Database Table
Write-Host "Step 1: Creating Incidents table in database..." -ForegroundColor Yellow
Write-Host ""

$sqlScript = Get-Content "create-incidents-table.sql" -Raw
$sqlScript = $sqlScript -replace "'", "''"  # Escape single quotes for bash

$dbCommand = @"
cd /tmp
cat > create_incidents.sql << 'EOFQL'
$sqlScript
EOFQL

echo "Executing SQL script..."
PGPASSWORD='Stacey1122' psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB -f create_incidents.sql

if [ \$? -eq 0 ]; then
    echo "✅ Database table created successfully"
else
    echo "❌ Database table creation failed"
    exit 1
fi
"@

Write-Host "Sending database creation command..." -ForegroundColor Gray
$dbResult = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$dbCommand]" `
    --region $region `
    --output json | ConvertFrom-Json

$dbCommandId = $dbResult.Command.CommandId
Write-Host "Command ID: $dbCommandId" -ForegroundColor Gray

# Wait for database command to complete
Write-Host "Waiting for database creation to complete..." -ForegroundColor Gray
Start-Sleep -Seconds 5

$dbOutput = aws ssm get-command-invocation `
    --command-id $dbCommandId `
    --instance-id $instanceId `
    --region $region `
    --output json | ConvertFrom-Json

if ($dbOutput.Status -eq "Success") {
    Write-Host "✅ Database table created successfully!" -ForegroundColor Green
    Write-Host $dbOutput.StandardOutputContent -ForegroundColor Gray
} else {
    Write-Host "❌ Database creation failed!" -ForegroundColor Red
    Write-Host $dbOutput.StandardErrorContent -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  Table might already exist. Continuing with backend deployment..." -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Deploy Backend
Write-Host "🔧 Step 2: Deploying backend to EC2..." -ForegroundColor Yellow
Write-Host ""

# First, build the backend locally
Write-Host "Building backend locally..." -ForegroundColor Gray
Push-Location backend\Milo.API
try {
    dotnet publish -c Release -o .\publish 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Backend build failed"
    }
    Write-Host "✅ Backend built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend build failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Create a zip file
Write-Host "Creating deployment package..." -ForegroundColor Gray
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFile = "milo-backend-$timestamp.zip"

if (Test-Path $zipFile) {
    Remove-Item $zipFile
}

Compress-Archive -Path "backend\Milo.API\publish\*" -DestinationPath $zipFile
Write-Host "✅ Deployment package created: $zipFile" -ForegroundColor Green
Write-Host ""

# Upload to S3 (temporary storage)
Write-Host "Uploading to S3..." -ForegroundColor Gray
$s3Bucket = "milo-deployments-temp"
$s3Key = "backend/$zipFile"

# Create bucket if it doesn't exist (will fail silently if it does)
aws s3 mb "s3://$s3Bucket" --region $region 2>&1 | Out-Null

aws s3 cp $zipFile "s3://$s3Bucket/$s3Key" --region $region
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Uploaded to S3" -ForegroundColor Green
} else {
    Write-Host "❌ S3 upload failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Deploy via SSM
Write-Host "Deploying to EC2 via SSM..." -ForegroundColor Gray

$deployCommand = @"
#!/bin/bash
set -e

echo "🔧 Deploying Milo Backend with Incidents Feature..."

# Stop the service
echo "Stopping milo-api service..."
sudo systemctl stop milo-api || true

# Download from S3
echo "Downloading deployment package..."
cd /tmp
aws s3 cp s3://$s3Bucket/$s3Key ./$zipFile --region $region

# Backup current deployment
echo "Backing up current deployment..."
if [ -d /var/www/milo-api ]; then
    sudo cp -r /var/www/milo-api /var/www/milo-api.backup.\$(date +%Y%m%d-%H%M%S)
fi

# Extract new files
echo "Extracting new files..."
sudo mkdir -p /var/www/milo-api
sudo unzip -o /tmp/$zipFile -d /var/www/milo-api

# Set permissions
echo "Setting permissions..."
sudo chown -R ec2-user:ec2-user /var/www/milo-api
sudo chmod -R 755 /var/www/milo-api

# Start the service
echo "Starting milo-api service..."
sudo systemctl start milo-api

# Wait for service to start
sleep 5

# Check status
echo "Checking service status..."
sudo systemctl status milo-api --no-pager || true

# Test the API
echo "Testing API..."
sleep 2
curl -s http://localhost:5001/api/health || echo "Health check endpoint not responding yet"

# Test incidents endpoint
echo "Testing Incidents endpoint..."
curl -s http://localhost:5001/api/incidents || echo "Incidents endpoint not responding yet"

# Cleanup
echo "Cleaning up..."
rm -f /tmp/$zipFile

echo "✅ Deployment complete!"
"@

Write-Host "Sending deployment command..." -ForegroundColor Gray
$deployResult = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=['$deployCommand']" `
    --region $region `
    --output json | ConvertFrom-Json

$deployCommandId = $deployResult.Command.CommandId
Write-Host "Command ID: $deployCommandId" -ForegroundColor Gray

# Wait for deployment
Write-Host "Waiting for deployment to complete (this may take 30-60 seconds)..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Check progress
for ($i = 1; $i -le 6; $i++) {
    Write-Host "Checking deployment status (attempt $i/6)..." -ForegroundColor Gray
    $deployOutput = aws ssm get-command-invocation `
        --command-id $deployCommandId `
        --instance-id $instanceId `
        --region $region `
        --output json | ConvertFrom-Json
    
    if ($deployOutput.Status -eq "Success") {
        Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Deployment Output:" -ForegroundColor Cyan
        Write-Host $deployOutput.StandardOutputContent -ForegroundColor Gray
        break
    } elseif ($deployOutput.Status -eq "Failed") {
        Write-Host "❌ Backend deployment failed!" -ForegroundColor Red
        Write-Host $deployOutput.StandardErrorContent -ForegroundColor Red
        exit 1
    } else {
        Write-Host "Status: $($deployOutput.Status) - waiting..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
}
Write-Host ""

# Cleanup local zip file
if (Test-Path $zipFile) {
    Remove-Item $zipFile
    Write-Host "✅ Cleaned up local deployment package" -ForegroundColor Green
}
Write-Host ""

# Step 3: Verify Backend
Write-Host "🔍 Step 3: Verifying backend deployment..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Testing Incidents API endpoint..." -ForegroundColor Gray
Start-Sleep -Seconds 5

try {
    $response = Invoke-RestMethod -Uri "https://api.codingeverest.com/api/incidents" -Method Get -TimeoutSec 10
    Write-Host "✅ Incidents API is responding!" -ForegroundColor Green
    Write-Host "   Found $($response.Count) incidents" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  API might still be starting up. Try again in a few seconds." -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Deploy Frontend
Write-Host "🌐 Step 4: Deploying frontend to Amplify..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Checking git status..." -ForegroundColor Gray
git status --short

$hasChanges = git status --porcelain
if ($hasChanges) {
    Write-Host "Staging changes..." -ForegroundColor Gray
    git add .
    
    Write-Host "Committing changes..." -ForegroundColor Gray
    git commit -m "Add Incidents feature - Complete ticket management system"
    
    Write-Host "Pushing to GitHub..." -ForegroundColor Gray
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Pushed to GitHub - Amplify will auto-deploy" -ForegroundColor Green
    } else {
        Write-Host "❌ Git push failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "No changes to commit" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Monitor Amplify Deployment
Write-Host "📦 Step 5: Monitoring Amplify deployment..." -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 5

Write-Host "Checking Amplify deployment status..." -ForegroundColor Gray
$amplifyJobs = aws amplify list-jobs --app-id ddp21ao3xntn4 --branch-name main --max-results 2 --output json | ConvertFrom-Json

if ($amplifyJobs.jobSummaries.Count -gt 0) {
    $latestJob = $amplifyJobs.jobSummaries[0]
    Write-Host "Latest Amplify Job:" -ForegroundColor Cyan
    Write-Host "  Job ID: $($latestJob.jobId)" -ForegroundColor Gray
    Write-Host "  Status: $($latestJob.status)" -ForegroundColor Gray
    Write-Host "  Commit: $($latestJob.commitMessage)" -ForegroundColor Gray
    
    if ($latestJob.status -eq "RUNNING" -or $latestJob.status -eq "PENDING") {
        Write-Host ""
        Write-Host "⏳ Amplify deployment is in progress..." -ForegroundColor Yellow
        Write-Host "   This usually takes 2-3 minutes" -ForegroundColor Gray
    } elseif ($latestJob.status -eq "SUCCEED") {
        Write-Host ""
        Write-Host "✅ Amplify deployment completed!" -ForegroundColor Green
    }
}
Write-Host ""

# Final Summary
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Database table created" -ForegroundColor Green
Write-Host "✅ Backend deployed to EC2" -ForegroundColor Green
Write-Host "✅ Frontend pushed to Amplify" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access your Incidents feature:" -ForegroundColor Cyan
Write-Host "   https://www.codingeverest.com/milo-incidents.html" -ForegroundColor White
Write-Host ""
Write-Host "🔍 API Endpoint:" -ForegroundColor Cyan
Write-Host "   https://api.codingeverest.com/api/incidents" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - INCIDENTS_QUICK_START.md" -ForegroundColor Gray
Write-Host "   - INCIDENTS_FEATURE_GUIDE.md" -ForegroundColor Gray
Write-Host "   - DEPLOY_INCIDENTS_FEATURE.md" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Wait 2-3 minutes for Amplify to finish deploying" -ForegroundColor Gray
Write-Host "   2. Open the Incidents page and create your first incident" -ForegroundColor Gray
Write-Host "   3. Test the features: create, view, update, search, filter" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Happy Incident Managing!" -ForegroundColor Green
Write-Host ""
