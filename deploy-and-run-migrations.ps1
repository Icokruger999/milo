# Deploy backend to EC2 and ensure migrations run
param(
    [string]$InstanceId = "i-06bc5b2218c041802"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deploy Backend and Run Migrations" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build the backend
Write-Host "1. Building backend..." -ForegroundColor Yellow
Set-Location backend/Milo.API

if (Test-Path "./publish") {
    Remove-Item -Recurse -Force "./publish"
}

dotnet publish -c Release -o ./publish

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    Set-Location ../..
    exit
}

Write-Host "Build successful!" -ForegroundColor Green
Set-Location ../..

# Step 2: Verify appsettings.json has Supabase connection
Write-Host "`n2. Verifying appsettings.json..." -ForegroundColor Yellow
$appSettings = Get-Content ".\backend\Milo.API\appsettings.json" -Raw | ConvertFrom-Json
$connString = $appSettings.ConnectionStrings.DefaultConnection

if ($connString -match "supabase" -and $connString -match "Database=milo") {
    Write-Host "appsettings.json is correct (Supabase with milo database)" -ForegroundColor Green
} else {
    Write-Host "ERROR: appsettings.json does not have correct Supabase connection!" -ForegroundColor Red
    Write-Host "Connection string: $($connString.Substring(0, [Math]::Min(100, $connString.Length)))..." -ForegroundColor Yellow
    exit
}

# Step 3: Copy appsettings.json to publish folder
Write-Host "`n3. Copying appsettings.json to publish folder..." -ForegroundColor Yellow
Copy-Item ".\backend\Milo.API\appsettings.json" -Destination ".\backend\Milo.API\publish\appsettings.json" -Force
Write-Host "appsettings.json copied to publish folder" -ForegroundColor Green

# Step 4: Deploy to EC2 via SSM
Write-Host "`n4. Deploying to EC2 via SSM..." -ForegroundColor Yellow

# Create deployment commands
$commands = @(
    "cd /tmp",
    "sudo rm -rf milo-api-deploy",
    "mkdir -p milo-api-deploy",
    "cd milo-api-deploy"
)

# We'll need to upload files - let's use a simpler approach: just update appsettings.json and restart
# Actually, let's copy files via base64 encoding

# Step 4a: Upload appsettings.json
Write-Host "4a. Uploading appsettings.json..." -ForegroundColor Cyan
$appSettingsContent = Get-Content ".\backend\Milo.API\appsettings.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($appSettingsContent)
$base64 = [Convert]::ToBase64String($bytes)

$uploadCmd = "cd /var/www/milo-api && echo '$base64' | base64 -d > appsettings.json.tmp && sudo mv appsettings.json.tmp appsettings.json && sudo chown ec2-user:ec2-user appsettings.json && cat appsettings.json | grep -A 2 ConnectionStrings"

$result = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$uploadCmd`"]" --output json | ConvertFrom-Json
$cmdId = $result.Command.CommandId

if ($cmdId) {
    Write-Host "Command sent! Waiting..." -ForegroundColor Green
    Start-Sleep -Seconds 8
    
    $output = aws ssm get-command-invocation --command-id $cmdId --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
    
    if ($output -match "supabase" -and $output -match "milo") {
        Write-Host "appsettings.json uploaded successfully!" -ForegroundColor Green
    } else {
        Write-Host "Warning: appsettings.json upload may have failed" -ForegroundColor Yellow
        Write-Host "Output: $output" -ForegroundColor Gray
    }
} else {
    Write-Host "Failed to upload appsettings.json!" -ForegroundColor Red
    exit
}

# Step 5: Restart API service to trigger migrations
Write-Host "`n5. Restarting API service to trigger migrations..." -ForegroundColor Yellow
$restartCmd = "sudo systemctl restart milo-api && sleep 10 && sudo systemctl status milo-api --no-pager -l | head -30"

$result2 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$restartCmd`"]" --output json | ConvertFrom-Json
$cmdId2 = $result2.Command.CommandId

if ($cmdId2) {
    Write-Host "Restart command sent! Waiting..." -ForegroundColor Green
    Start-Sleep -Seconds 12
    
    $output2 = aws ssm get-command-invocation --command-id $cmdId2 --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
    Write-Host "`nService status:" -ForegroundColor Cyan
    Write-Host $output2 -ForegroundColor White
}

# Step 6: Check logs for migration status
Write-Host "`n6. Checking API logs for migration status..." -ForegroundColor Yellow
$logCmd = "sudo journalctl -u milo-api -n 50 --no-pager | tail -30"

$result3 = aws ssm send-command --instance-ids $InstanceId --document-name "AWS-RunShellScript" --parameters "commands=[`"$logCmd`"]" --output json | ConvertFrom-Json
$cmdId3 = $result3.Command.CommandId

if ($cmdId3) {
    Start-Sleep -Seconds 8
    
    $output3 = aws ssm get-command-invocation --command-id $cmdId3 --instance-id $InstanceId --query "StandardOutputContent" --output text 2>&1
    
    Write-Host "`nRecent API logs:" -ForegroundColor Cyan
    Write-Host $output3 -ForegroundColor White
    
    if ($output3 -match "migrations applied successfully") {
        Write-Host "`n✓ MIGRATIONS APPLIED SUCCESSFULLY!" -ForegroundColor Green
    } elseif ($output3 -match "Failed to connect" -or $output3 -match "127.0.0.1") {
        Write-Host "`n✗ Still seeing connection errors - check appsettings.json" -ForegroundColor Red
    } else {
        Write-Host "`n⚠ Check logs above for migration status" -ForegroundColor Yellow
    }
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check Supabase dashboard to verify tables were created" -ForegroundColor White
Write-Host "2. URL: https://supabase.com/dashboard/project/ffrtlelsqhnxjfwwnazf/editor" -ForegroundColor White
Write-Host "3. Look for tables in the milo database" -ForegroundColor White
Write-Host ""
