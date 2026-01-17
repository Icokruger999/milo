# Deploy SubProjects Feature to EC2
# This script deploys the updated backend DLL and runs the database migration

param(
    [string]$EC2_IP = "your-ec2-ip",
    [string]$KEY_PATH = "your-key.pem",
    [string]$EC2_USER = "ec2-user"
)

Write-Host "🚀 Deploying SubProjects Feature to EC2" -ForegroundColor Green
Write-Host "EC2 IP: $EC2_IP" -ForegroundColor Cyan
Write-Host ""

# Step 1: Copy DLL to EC2
Write-Host "📦 Step 1: Copying DLL to EC2..." -ForegroundColor Yellow
$DLL_PATH = "backend/Milo.API/bin/Release/net8.0/Milo.API.dll"
$REMOTE_PATH = "/home/$EC2_USER/milo-backend-publish/"

if (-not (Test-Path $DLL_PATH)) {
    Write-Host "❌ DLL not found at $DLL_PATH" -ForegroundColor Red
    exit 1
}

# Use SCP to copy the DLL
Write-Host "Copying $DLL_PATH to $EC2_IP:$REMOTE_PATH" -ForegroundColor Cyan
scp -i $KEY_PATH $DLL_PATH "${EC2_USER}@${EC2_IP}:${REMOTE_PATH}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to copy DLL" -ForegroundColor Red
    exit 1
}

Write-Host "✅ DLL copied successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Run migration on EC2
Write-Host "🗄️  Step 2: Running database migration..." -ForegroundColor Yellow

$MIGRATION_COMMAND = @"
cd /home/$EC2_USER/milo-backend-publish
dotnet Milo.API.dll --migrate
"@

Write-Host "Running migration command on EC2..." -ForegroundColor Cyan
ssh -i $KEY_PATH "${EC2_USER}@${EC2_IP}" $MIGRATION_COMMAND

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Migration may have failed or completed with warnings" -ForegroundColor Yellow
}

Write-Host "✅ Migration completed" -ForegroundColor Green
Write-Host ""

# Step 3: Restart backend service
Write-Host "🔄 Step 3: Restarting backend service..." -ForegroundColor Yellow

$RESTART_COMMAND = @"
sudo systemctl restart milo-backend
sleep 2
sudo systemctl status milo-backend
"@

Write-Host "Restarting service on EC2..." -ForegroundColor Cyan
ssh -i $KEY_PATH "${EC2_USER}@${EC2_IP}" $RESTART_COMMAND

Write-Host "✅ Service restarted" -ForegroundColor Green
Write-Host ""

# Step 4: Verify API is responding
Write-Host "🔍 Step 4: Verifying API endpoints..." -ForegroundColor Yellow

$VERIFY_COMMAND = @"
curl -s http://localhost:8080/api/departments?projectId=1 | head -20
"@

Write-Host "Testing API endpoint..." -ForegroundColor Cyan
ssh -i $KEY_PATH "${EC2_USER}@${EC2_IP}" $VERIFY_COMMAND

Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify frontend is deployed to Amplify"
Write-Host "2. Navigate to Timeline view in the app"
Write-Host "3. Verify departments and sub-projects load from database"
Write-Host "4. Test creating a new sub-project"
Write-Host "5. Check backend logs if any issues: sudo journalctl -u milo-backend -f"
