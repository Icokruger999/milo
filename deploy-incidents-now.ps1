# Quick Incidents Deployment via SSM
$ErrorActionPreference = "Stop"

Write-Host "Deploying Incidents Feature" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

# Config
$instanceId = "i-06bc5b2218c041802"
$region = "eu-west-1"
$s3Bucket = "milo-temp-deploy"

# Step 1: Build Backend
Write-Host "[1/3] Building backend..." -ForegroundColor Yellow
Push-Location backend\Milo.API
dotnet publish -c Release -o .\publish | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "   Done" -ForegroundColor Green
Write-Host ""

# Step 2: Package
Write-Host "[2/3] Creating package..." -ForegroundColor Yellow
$zip = "incidents-deploy.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path "backend\Milo.API\publish\*" -DestinationPath $zip -Force
Write-Host "   Done" -ForegroundColor Green
Write-Host ""

# Step 3: Upload to S3
Write-Host "[3/3] Uploading to S3..." -ForegroundColor Yellow
aws s3 mb "s3://$s3Bucket" --region $region 2>&1 | Out-Null
aws s3 cp $zip "s3://$s3Bucket/$zip" --region $region | Out-Null
aws s3 cp create-incidents-table.sql "s3://$s3Bucket/create-incidents.sql" --region $region | Out-Null
Write-Host "   Done" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy via SSM
Write-Host "Deploying to EC2 via SSM..." -ForegroundColor Yellow

$cmd = @'
#!/bin/bash
set -e

echo "=== Creating Database Table ==="
cd /tmp
aws s3 cp s3://milo-temp-deploy/create-incidents.sql ./create-incidents.sql --region eu-west-1
PGPASSWORD='Stacey1122' psql -h codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com -U postgres -d MiloDB -f create-incidents.sql || echo "Table may already exist"

echo ""
echo "=== Stopping Service ==="
sudo systemctl stop milo-api

echo ""
echo "=== Downloading Package ==="
aws s3 cp s3://milo-temp-deploy/incidents-deploy.zip ./incidents-deploy.zip --region eu-west-1

echo ""
echo "=== Backing Up ==="
if [ -d /var/www/milo-api ]; then
    sudo cp -r /var/www/milo-api /var/www/milo-api.backup
fi

echo ""
echo "=== Extracting Files ==="
sudo mkdir -p /var/www/milo-api
sudo unzip -o ./incidents-deploy.zip -d /var/www/milo-api
sudo chown -R ec2-user:ec2-user /var/www/milo-api

echo ""
echo "=== Starting Service ==="
sudo systemctl start milo-api
sleep 5

echo ""
echo "=== Service Status ==="
sudo systemctl status milo-api --no-pager || true

echo ""
echo "=== Testing API ==="
curl -s http://localhost:5001/api/health || echo "Health endpoint not ready"
echo ""
curl -s http://localhost:5001/api/incidents || echo "Incidents endpoint not ready"
echo ""

echo ""
echo "=== Cleanup ==="
rm -f ./incidents-deploy.zip ./create-incidents.sql

echo ""
echo "DEPLOYMENT COMPLETE!"
'@

$result = aws ssm send-command --instance-ids $instanceId --document-name "AWS-RunShellScript" --parameters "commands=[$cmd]" --region $region --output json | ConvertFrom-Json

$cmdId = $result.Command.CommandId
Write-Host "   Command ID: $cmdId" -ForegroundColor Gray
Write-Host ""

# Monitor
Write-Host "Monitoring deployment..." -ForegroundColor Yellow
for ($i = 1; $i -le 10; $i++) {
    Start-Sleep -Seconds 8
    $output = aws ssm get-command-invocation --command-id $cmdId --instance-id $instanceId --region $region --output json | ConvertFrom-Json
    
    $status = $output.Status
    Write-Host "   Status: $status (check $i/10)" -ForegroundColor Gray
    
    if ($status -eq "Success") {
        Write-Host ""
        Write-Host "SUCCESS!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Output:" -ForegroundColor Cyan
        Write-Host $output.StandardOutputContent
        break
    } elseif ($status -eq "Failed") {
        Write-Host ""
        Write-Host "FAILED!" -ForegroundColor Red
        Write-Host $output.StandardErrorContent
        exit 1
    }
}
Write-Host ""

# Cleanup
Remove-Item $zip -ErrorAction SilentlyContinue

# Test
Write-Host "Testing API..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $test = Invoke-RestMethod -Uri "https://api.codingeverest.com/api/incidents" -TimeoutSec 10
    Write-Host "   API is live! Found $($test.Count) incidents" -ForegroundColor Green
} catch {
    Write-Host "   API still starting..." -ForegroundColor Yellow
}
Write-Host ""

# Frontend
Write-Host "Deploying frontend..." -ForegroundColor Yellow
git add .
git commit -m "Add Incidents feature" 2>&1 | Out-Null
if (git push origin main 2>&1) {
    Write-Host "   Pushed to GitHub (Amplify auto-deploys)" -ForegroundColor Green
}
Write-Host ""

Write-Host "===========================" -ForegroundColor Cyan
Write-Host "COMPLETE!" -ForegroundColor Green
Write-Host "===========================" -ForegroundColor Cyan
Write-Host "https://www.codingeverest.com/milo-incidents.html" -ForegroundColor White
Write-Host ""
