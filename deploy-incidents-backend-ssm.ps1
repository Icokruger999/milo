# Deploy Incidents Backend Only via SSM
# Quick backend deployment for the Incidents feature

$ErrorActionPreference = "Stop"

Write-Host "🔧 Deploying Incidents Backend via SSM" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"

# Step 1: Build Backend
Write-Host "📦 Building backend..." -ForegroundColor Yellow
Push-Location backend\Milo.API
try {
    dotnet publish -c Release -o .\publish
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Host "✅ Backend built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host ""

# Step 2: Package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFile = "milo-incidents-$timestamp.zip"

if (Test-Path $zipFile) {
    Remove-Item $zipFile
}

Compress-Archive -Path "backend\Milo.API\publish\*" -DestinationPath $zipFile
Write-Host "✅ Package created: $zipFile" -ForegroundColor Green
Write-Host ""

# Step 3: Upload to S3
Write-Host "☁️  Uploading to S3..." -ForegroundColor Yellow
$s3Bucket = "milo-deployments-temp"
$s3Key = "backend/$zipFile"

# Create bucket if needed
aws s3 mb "s3://$s3Bucket" --region $region 2>&1 | Out-Null

aws s3 cp $zipFile "s3://$s3Bucket/$s3Key" --region $region
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Uploaded to S3: s3://$s3Bucket/$s3Key" -ForegroundColor Green
} else {
    Write-Host "❌ Upload failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Deploy via SSM
Write-Host "🚀 Deploying to EC2..." -ForegroundColor Yellow

$command = @"
#!/bin/bash
set -e

echo "Stopping service..."
sudo systemctl stop milo-api || true

echo "Downloading package..."
cd /tmp
aws s3 cp s3://$s3Bucket/$s3Key ./$zipFile --region $region

echo "Backing up..."
if [ -d /var/www/milo-api ]; then
    sudo mv /var/www/milo-api /var/www/milo-api.backup.\$(date +%Y%m%d-%H%M%S)
fi

echo "Extracting..."
sudo mkdir -p /var/www/milo-api
sudo unzip -o /tmp/$zipFile -d /var/www/milo-api

echo "Setting permissions..."
sudo chown -R ec2-user:ec2-user /var/www/milo-api
sudo chmod -R 755 /var/www/milo-api

echo "Starting service..."
sudo systemctl start milo-api
sleep 5

echo "Checking status..."
sudo systemctl status milo-api --no-pager

echo "Testing API..."
curl -s http://localhost:5001/api/health
echo ""
curl -s http://localhost:5001/api/incidents
echo ""

echo "Cleanup..."
rm -f /tmp/$zipFile

echo "✅ Deployment complete!"
"@

$result = aws ssm send-command `
    --instance-ids $instanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=['$command']" `
    --region $region `
    --output json | ConvertFrom-Json

$commandId = $result.Command.CommandId
Write-Host "Command ID: $commandId" -ForegroundColor Gray
Write-Host ""

# Monitor deployment
Write-Host "⏳ Waiting for deployment (30-60 seconds)..." -ForegroundColor Yellow

for ($i = 1; $i -le 8; $i++) {
    Start-Sleep -Seconds 8
    Write-Host "Checking status ($i/8)..." -ForegroundColor Gray
    
    $output = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $instanceId `
        --region $region `
        --output json | ConvertFrom-Json
    
    if ($output.Status -eq "Success") {
        Write-Host ""
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Output:" -ForegroundColor Cyan
        Write-Host $output.StandardOutputContent -ForegroundColor Gray
        break
    } elseif ($output.Status -eq "Failed") {
        Write-Host ""
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        Write-Host $output.StandardErrorContent -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Cleanup
if (Test-Path $zipFile) {
    Remove-Item $zipFile
}

# Verify
Write-Host "🔍 Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $response = Invoke-RestMethod -Uri "https://api.codingeverest.com/api/incidents" -Method Get
    Write-Host "✅ Incidents API is live!" -ForegroundColor Green
    Write-Host "   Response: $($response.Count) incidents found" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  API still starting up - try again in a moment" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Backend deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test it:" -ForegroundColor Cyan
Write-Host "  curl https://api.codingeverest.com/api/incidents" -ForegroundColor Gray
Write-Host ""
